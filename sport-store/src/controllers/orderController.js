import mongoose from "mongoose";
import User from "../models/user.js";
import Order from "../models/order.js";
import Product from "../models/product.js";
import stripe from "stripe";
import getExchangeRate from "../utils/exchangeRate.js";
import { nanoid } from "nanoid";

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// User đặt hàng
const generateOrderId = () => {
  return `VJUSPORT${nanoid(7).toUpperCase()}`;
};

// Admin đặt hàng
export const createOrder = async (req, res) => {
  try {
    const { 
      items, 
      shippingAddress, 
      paymentMethod, 
      phone,
      shippingMethod,
      totalPrice: clientTotalPrice
    } = req.body;

    // Validation đầu vào
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Danh sách sản phẩm không hợp lệ" });
    }

    if (!shippingAddress || typeof shippingAddress !== "object") {
      return res.status(400).json({ message: "Thông tin địa chỉ giao hàng không hợp lệ" });
    }

    // Validate các trường bắt buộc của shippingAddress
    const requiredFields = [
      'fullName', 
      'address', 
      'city', 
      'district',
      'ward',
      'postalCode'
    ];
    
    for (const field of requiredFields) {
      if (!shippingAddress[field]) {
        return res.status(400).json({ 
          message: `Thông tin ${field} không được để trống trong địa chỉ giao hàng` 
        });
      }
    }

    if (!paymentMethod || !["COD", "Stripe"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    if (!phone) {
      return res.status(400).json({ message: "Số điện thoại không được cung cấp" });
    }

    if (!shippingMethod || typeof shippingMethod !== "object") {
      return res.status(400).json({ message: "Thông tin phương thức vận chuyển không hợp lệ" });
    }

    // Validate các trường bắt buộc của shippingMethod
    const requiredShippingFields = ['method', 'expectedDate', 'courier', 'trackingId'];
    for (const field of requiredShippingFields) {
      if (!shippingMethod[field]) {
        return res.status(400).json({ 
          message: `Thông tin ${field} không được để trống trong phương thức vận chuyển` 
        });
      }
    }

    // Chuẩn hóa số điện thoại
    const normalizedPhone = phone.replace(/\s+/g, "").trim();
    
    // Validate format số điện thoại
    if (!normalizedPhone.match(/^0[0-9]{9}$/)) {
      return res.status(400).json({ message: "Số điện thoại không đúng định dạng" });
    }

    let userId = null; // Mặc định khách vãng lai

    // Kiểm tra số điện thoại có tồn tại trong DB không
    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      userId = existingUser._id;
    }

    // Lấy danh sách ID sản phẩm từ items
    const productIds = items.map(item => {
      try {
        return new mongoose.Types.ObjectId(item.product);
      } catch (error) {
        throw new Error(`ID sản phẩm không hợp lệ: ${item.product}`);
      }
    });

    // Tìm tất cả sản phẩm trong DB
    const products = await Product.find({ _id: { $in: productIds } });

    // Kiểm tra sự tồn tại của sản phẩm
    const productMap = new Map(products.map(product => [product._id.toString(), product]));
    for (const item of items) {
      if (!productMap.has(item.product)) {
        return res.status(404).json({ message: `Sản phẩm với ID ${item.product} không tồn tại` });
      }
      
      // Kiểm tra số lượng
      const product = productMap.get(item.product);
      if (item.quantity > product.quantity) {
        return res.status(400).json({ 
          message: `Sản phẩm ${product.name} chỉ còn ${product.quantity} trong kho` 
        });
      }
    }

    // Lấy thông tin sản phẩm và tính toán giá
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Sản phẩm ${item.product} không tồn tại`);
        }

        // Tính giá sale nếu có
        const salePrice = product.discountPrice || product.price;

        return {
          product: {
            _id: product._id,
            name: product.name,
            price: product.price, // Lưu giá gốc
            images: product.images,
            shortId: product.shortId
          },
          quantity: item.quantity,
          price: salePrice, // Lưu giá sale
          size: item.size,
          color: item.color
        };
      })
    );

    // Tính tổng tiền dựa trên giá sale
    const subtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    // Thêm phí vận chuyển vào tổng tiền
    const shippingFee = shippingMethod.method === "Express" 
      ? 50000 
      : shippingMethod.method === "SameDay" 
      ? 100000 
      : 30000;
    const totalPrice = subtotal + shippingFee;

    // Kiểm tra tổng tiền từ client có khớp không
    if (Math.abs(totalPrice - clientTotalPrice) > 1) {
      console.log("Tổng tiền từ client:", clientTotalPrice);
      console.log("Tổng tiền tính được:", totalPrice);
      return res.status(400).json({ 
        message: "Tổng tiền không khớp với dữ liệu từ server" 
      });
    }

    // Tạo đơn hàng mới
    const newOrder = new Order({
      shortId: generateOrderId(),
      user: userId,
      items: orderItems,
      totalPrice,
      paymentMethod,
      paymentStatus: "pending",
      status: "pending",
      shippingMethod: {
        ...shippingMethod,
        fee: shippingFee
      },
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: normalizedPhone,
        address: shippingAddress.address,
        city: shippingAddress.city,
        district: shippingAddress.district,
        ward: shippingAddress.ward,
        postalCode: shippingAddress.postalCode
      }
    });

    // Lưu đơn hàng vào DB
    await newOrder.save();

    // Cập nhật orderCount của user
    if (userId) {
      await User.findByIdAndUpdate(
        userId,
        { $inc: { orderCount: 1 } }
      );
    }

    res.status(201).json({ 
      message: "Đặt hàng thành công", 
      order: newOrder 
    });

  } catch (error) {
    console.error("Lỗi khi đặt hàng:", error);
    res.status(500).json({ 
      message: "Lỗi khi đặt hàng", 
      error: error.message 
    });
  }
};

// Admin cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updatedBy, note } = req.body;

    // Kiểm tra id hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "ID đơn hàng không hợp lệ!" 
      });
    }

    // Tìm đơn hàng
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy đơn hàng!" 
      });
    }

    // Kiểm tra trạng thái mới có hợp lệ không
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: "Trạng thái đơn hàng không hợp lệ!" 
      });
    }

    // Kiểm tra luồng trạng thái
    const currentStatus = order.status;
    const validTransitions = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: "Không thể chuyển từ trạng thái này sang trạng thái khác!" 
      });
    }

    // Nếu đơn hàng được giao thành công (delivered), cập nhật stock sản phẩm và totalSpent của user
    if (status === "delivered") {
      // Kiểm tra và cập nhật stock cho từng sản phẩm trong đơn hàng
      for (const item of order.items) {
        const product = await Product.findById(item.product._id);
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm với ID: ${item.product._id}`);
        }

        // Kiểm tra stock còn đủ không
        if (product.stock < item.quantity) {
          throw new Error(`Sản phẩm ${product.name} không đủ số lượng trong kho (Còn: ${product.stock}, Cần: ${item.quantity})`);
        }

        // Cập nhật stock
        product.stock -= item.quantity;
        await product.save();

        console.log(`✅ [Controller] Đã cập nhật stock cho sản phẩm ${product.name}: -${item.quantity}`);
      }

      // Cập nhật totalSpent của user
      if (order.user && !order.isTotalSpentUpdated) {
        const user = await User.findById(order.user);
        if (user) {
          // Cập nhật totalSpent của user
          user.totalSpent = (user.totalSpent || 0) + order.totalPrice;

          // Cập nhật hạng thành viên dựa trên totalSpent
          if (user.totalSpent >= 50000000) {
            user.membershipLevel = "Hạng Kim Cương";
          } else if (user.totalSpent >= 30000000) {
            user.membershipLevel = "Hạng Bạch Kim";
          } else if (user.totalSpent >= 20000000) {
            user.membershipLevel = "Hạng Vàng";
          } else if (user.totalSpent >= 5000000) {
            user.membershipLevel = "Hạng Bạc";
          } else {
            user.membershipLevel = "Hạng Sắt";
          }

          // Lưu thay đổi
          await user.save();

          // Đánh dấu đơn hàng đã được tính vào totalSpent
          order.isTotalSpentUpdated = true;
          await order.save();

          console.log("✅ [Controller] Cập nhật totalSpent thành công cho user:", user._id);
        }
      }
    }

    // Cập nhật trạng thái đơn hàng
    order.status = status;
    order.statusHistory.push({
      status,
      updatedBy,
      note
    });

    await order.save();

    res.json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      order
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ 
      success: false,
      message: "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng" 
    });
  }
};

// Admin - Lấy tất cả đơn hàng hoặc tìm theo shortId / _id
export const getAllOrders = async (req, res) => {
  try {
    const { search } = req.query;

    let filter = {};
    if (search) {
      if (/^VJUSPORT[A-Z0-9]{7}$/.test(search)) { 
        // Kiểm tra đúng định dạng VJUSPORT + 7 ký tự chữ + số
        filter = { shortId: search };
      } else if (/^[0-9a-fA-F]{24}$/.test(search)) {
        // Kiểm tra đúng định dạng ObjectId (MongoDB ID)
        filter = { _id: search };
      } else {
        return res.status(400).json({ message: "Mã đơn hàng không hợp lệ" });
      }
    }

    const orders = await Order.find(filter).populate("items.product", "name price").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy đơn hàng", error: error.message });
  }
};

// Admin chỉnh sửa thông tin đơn hàng
export const updateOrderDetails = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    // Cập nhật shippingAddress nhưng không làm mất trường cũ
    if (shippingAddress) {
      order.shippingAddress = { ...order.shippingAddress.toObject(), ...shippingAddress };
    }

    if (paymentMethod) order.paymentMethod = paymentMethod;

    await order.save();
    res.json({ message: "Cập nhật đơn hàng thành công", order });

  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật đơn hàng", error: error.message });
  }
};

// Lấy đơn hàng theo ID (Admin)
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 Đang tìm đơn hàng với ID:", id);

    // Kiểm tra ID có hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error("❌ ID đơn hàng không hợp lệ:", id);
      return res.status(400).json({ 
        success: false,
        message: "ID đơn hàng không hợp lệ!" 
      });
    }

    // Tìm đơn hàng và populate thông tin sản phẩm
    const order = await Order.findById(id)
      .populate({
        path: "items.product",
        select: "name price images shortId"
      })
      .lean();

    if (!order) {
      console.error("❌ Không tìm thấy đơn hàng với ID:", id);
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy đơn hàng!" 
      });
    }

    console.log("✅ Tìm thấy đơn hàng:", order);
    return res.json({ 
      success: true,
      order 
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy thông tin đơn hàng:", error);
    return res.status(500).json({ 
      success: false,
      message: "Lỗi server khi lấy thông tin đơn hàng" 
    });
  }
};

// Lấy danh sách đơn hàng của User
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ user: userId }).populate("items.product", "name price");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng", error: error.message });
  }
};

// Hủy đơn hàng (User hoặc Admin)
export const deleteOrder = async (req, res) => {
  try {
    // 1. Tìm đơn hàng và populate thông tin sản phẩm
    const order = await Order.findById(req.params.id).populate("items.product", "name price quantity");
    if (!order) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại" });
    }

    // 2. Kiểm tra quyền - chỉ admin hoặc user sở hữu đơn hàng mới được hủy
    if (req.user.role !== "admin" && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này" });
    }

    // 3. Kiểm tra trạng thái đơn hàng
    if (order.status === "pending") {
      return res.status(400).json({ 
        message: "Chỉ có thể hủy đơn từ trạng thái 'Đã xác nhận' trở đi" 
      });
    }

    // 4. Kiểm tra trạng thái đơn hàng đã bị hủy chưa
    if (order.status === "cancelled") {
      return res.status(400).json({ 
        message: "Đơn hàng này đã bị hủy" 
      });
    }

    // 5. Kiểm tra trạng thái đơn hàng đã giao chưa
    if (order.status === "delivered") {
      return res.status(400).json({ 
        message: "Không thể hủy đơn hàng đã giao" 
      });
    }

    // 6. Hoàn lại stock sản phẩm
    for (const item of order.items) {
      const product = item.product;
      if (!product) {
        return res.status(400).json({ 
          message: `Không tìm thấy sản phẩm với ID ${item.product}` 
        });
      }

      // Cập nhật số lượng sản phẩm
      await Product.updateOne(
        { _id: item.product },
        { $inc: { quantity: item.quantity } }
      );
    }

    // Nếu đơn hàng đã được xác nhận (status là processing hoặc shipped), cập nhật lại số lượng sản phẩm và totalSpent
    if (order.status === "processing" || order.status === "shipped") {
      // Cập nhật lại số lượng sản phẩm
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }

      // Cập nhật lại totalSpent của user
      if (order.user) {
        const user = await User.findById(order.user);
        if (user) {
          user.totalSpent -= order.totalPrice; // Sử dụng totalPrice đã bao gồm phí vận chuyển
          await user.save();
        }
      }
    }

    // 8. Cập nhật trạng thái đơn hàng thành "cancelled"
    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelledBy = req.user._id;
    order.cancellationReason = "Hủy đơn hàng bởi " + (req.user.role === "admin" ? "admin" : "khách hàng");
    await order.save();

    // 9. Trả về thông báo thành công
    res.json({ 
      message: "Hủy đơn hàng thành công", 
      order 
    });

  } catch (error) {
    console.error("Lỗi khi hủy đơn hàng:", error);
    res.status(500).json({ 
      message: "Lỗi khi hủy đơn hàng", 
      error: error.message 
    });
  }
};

// Xử lý Webhook từ Stripe
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    try {
      const order = await Order.findOne({ paymentIntentId: paymentIntent.id });

      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      order.paymentStatus = "paid";
      await order.save();
      console.log("Đơn hàng đã cập nhật trạng thái thanh toán!");
    } catch (error) {
      console.error("Lỗi khi cập nhật đơn hàng:", error);
    }
  }

  res.json({ received: true });
};

// Lấy danh sách đơn hàng theo số điện thoại
export const getOrdersByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ 
        success: false,
        message: "Số điện thoại không được cung cấp" 
      });
    }

    // Chuẩn hóa số điện thoại
    const normalizedPhone = phone.replace(/\s+/g, "").trim();
    
    // Validate format số điện thoại
    if (!normalizedPhone.match(/^0[0-9]{9}$/)) {
      return res.status(400).json({ 
        success: false,
        message: "Số điện thoại không đúng định dạng" 
      });
    }

    // Tìm tất cả đơn hàng có số điện thoại khớp
    const orders = await Order.find({
      "shippingAddress.phone": normalizedPhone
    })
    .sort({ createdAt: -1 }) // Sắp xếp theo thời gian mới nhất
    .populate("user", "name email phone") // Populate thông tin user nếu có
    .populate("items.product", "name images price discountPrice"); // Populate thông tin sản phẩm

    res.status(200).json({
      success: true,
      orders
    });

  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi khi lấy danh sách đơn hàng", 
      error: error.message 
    });
  }
};