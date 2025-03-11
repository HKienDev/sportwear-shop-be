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
    const { items, shippingAddress, paymentMethod, userId: bodyUserId } = req.body;
    let userId = req.user._id; // Mặc định là User thường

    // Nếu là Admin và có userId trong req.body thì sử dụng userId đó
    if (req.user.role === "admin" && bodyUserId) {
      const userExists = await User.findById(bodyUserId);
      if (!userExists) {
        return res.status(400).json({ message: "Người dùng không tồn tại" });
      }
      userId = bodyUserId; // Gán userId từ Admin chọn
    }

    let totalPrice = 0;
    let orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

      const itemPrice = product.price * item.quantity;
      totalPrice += itemPrice;

      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        price: product.price,
      });
    }

    let newOrder = new Order({
      shortId: generateOrderId(), // Gán mã đơn hàng có tiền tố VJUSPORT
      user: userId,
      items: orderItems,
      totalPrice,
      paymentMethod,
      shippingAddress,
    });

    await newOrder.save();
    res.status(201).json({ message: "Đặt hàng thành công", order: newOrder });

  } catch (error) {
    console.error("Lỗi khi đặt hàng:", error);
    res.status(500).json({ message: "Lỗi khi đặt hàng", error: error.message });
  }
};

// Admin cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    order.status = status;
    await order.save();

    res.json({ message: "Cập nhật trạng thái đơn hàng thành công", order });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật đơn hàng", error: error.message });
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

// Lấy đơn hàng theo ID (User)
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
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });

    // Chỉ user của đơn hàng hoặc admin mới có quyền hủy
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này" });
    }

    await order.deleteOne();
    res.json({ message: "Hủy đơn hàng thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi hủy đơn hàng", error: error.message });
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