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

    // Tính tổng giá trị đơn hàng và tạo danh sách items
    let totalPrice = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(item.product);
      const itemPrice = product.discountPrice || product.price;
      const itemTotal = itemPrice * item.quantity;
      totalPrice += itemTotal;

      return {
        product: product._id,
        quantity: item.quantity,
        price: itemPrice,
      };
    });

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
      shippingMethod,
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
    console.log("Request body:", req.body);
    console.log("Request user:", req.user);
    
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    // Tìm đơn hàng
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    console.log("Current order status:", order.status);
    console.log("New status:", status);

    // Kiểm tra thứ tự trạng thái hợp lệ
    const statusFlow = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: [],
      cancelled: []
    };

    if (!statusFlow[order.status].includes(status)) {
      return res.status(400).json({ 
        message: `Không thể chuyển trạng thái từ "${order.status}" sang "${status}". Thứ tự hợp lệ: ${statusFlow[order.status].join(", ")}`
      });
    }

    // Nếu chuyển từ "pending" sang "processing" (xác nhận đơn)
    if (order.status === "pending" && status === "processing") {
      console.log("Updating from pending to processing...");
      
      try {
        // Kiểm tra và cập nhật số lượng cho từng sản phẩm
        for (const item of order.items) {
          // Kiểm tra sản phẩm tồn tại
          const product = await Product.findById(item.product);
          console.log(`Checking product ${item.product}:`, product);
          
          if (!product) {
            return res.status(404).json({ 
              message: `Sản phẩm với ID ${item.product} không tồn tại` 
            });
          }
          
          // Kiểm tra số lượng tồn kho
          if (product.stock < item.quantity) {
            return res.status(400).json({ 
              message: `Sản phẩm ${product.name} chỉ còn ${product.stock} trong kho` 
            });
          }

          // Cập nhật số lượng
          console.log(`Updating stock for product ${item.product}`);
          const result = await Product.updateOne(
            { 
              _id: item.product,
              stock: { $gte: item.quantity }
            },
            { $inc: { stock: -item.quantity } }
          );

          console.log(`Update result for product ${item.product}:`, result);

          if (result.modifiedCount === 0) {
            throw new Error(`Không thể cập nhật số lượng cho sản phẩm ${item.product}`);
          }
        }

        // Cập nhật trạng thái đơn hàng
        const historyEntry = {
          status,
          updatedAt: new Date()
        };

        if (req.user && req.user._id) {
          historyEntry.updatedBy = req.user._id;
        }

        order.statusHistory.push(historyEntry);
        order.status = status;
        await order.save();

        console.log("Order status updated successfully");
      } catch (error) {
        console.error("Error updating stock:", error);
        return res.status(500).json({ 
          message: "Lỗi khi cập nhật số lượng tồn kho", 
          error: error.message 
        });
      }
    } else if (status === "cancelled" && order.status === "processing") {
      console.log("Cancelling order from processing status...");
      
      try {
        // Hoàn lại số lượng cho từng sản phẩm
        for (const item of order.items) {
          console.log(`Restoring stock for product ${item.product}`);
          
          const result = await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } }
          );

          console.log(`Restore result for product ${item.product}:`, result);

          if (result.modifiedCount === 0) {
            throw new Error(`Không thể hoàn lại số lượng cho sản phẩm ${item.product}`);
          }
        }

        // Cập nhật trạng thái đơn hàng
        const historyEntry = {
          status,
          updatedAt: new Date()
        };

        if (req.user && req.user._id) {
          historyEntry.updatedBy = req.user._id;
        }

        order.statusHistory.push(historyEntry);
        order.status = status;
        await order.save();

        console.log("Order cancelled successfully");
      } catch (error) {
        console.error("Error cancelling order:", error);
        return res.status(500).json({ 
          message: "Lỗi khi hoàn lại số lượng tồn kho", 
          error: error.message 
        });
      }
    } else {
      console.log("Updating to other status:", status);
      
      // Các trạng thái khác chỉ cần cập nhật trạng thái
      const historyEntry = {
        status,
        updatedAt: new Date()
      };

      if (req.user && req.user._id) {
        historyEntry.updatedBy = req.user._id;
      }

      order.statusHistory.push(historyEntry);
      order.status = status;
      await order.save();
    }

    res.json({ message: "Cập nhật trạng thái đơn hàng thành công", order });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    res.status(500).json({ 
      message: "Lỗi khi cập nhật đơn hàng", 
      error: error.message,
      stack: error.stack 
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
    const order = await Order.findById(req.params.id).populate("items.product", "name price");
    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    // Kiểm tra quyền - chỉ admin hoặc user sở hữu đơn hàng mới được xem
    if (req.user.role !== "admin" && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xem đơn hàng này" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy đơn hàng", error: error.message });
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

    // 7. Cập nhật trạng thái đơn hàng thành "cancelled"
    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelledBy = req.user._id;
    order.cancellationReason = "Hủy đơn hàng bởi " + (req.user.role === "admin" ? "admin" : "khách hàng");
    await order.save();

    // 8. Trả về thông báo thành công
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