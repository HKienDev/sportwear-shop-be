import express from "express";
import {
  createOrder,
  updateOrderStatus,
  updateOrderDetails,
  getOrderById,
  getUserOrders,
  getAllOrders,
  deleteOrder,
  stripeWebhook,
  getOrdersByPhone,
  getRecentOrders
} from "../controllers/orderController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// USER ROUTES
// User đặt hàng (chỉ cho chính họ)
router.post("/user", verifyUser, createOrder);

// User xem danh sách tất cả đơn hàng của mình
router.get("/user", verifyUser, getUserOrders);

// User xem chi tiết đơn hàng của mình
router.get("/user/:id", verifyUser, getOrderById);

// User hoặc Admin có thể hủy đơn hàng
router.delete("/user/:id", verifyUser, deleteOrder);

// ADMIN ROUTES
// Admin - Lấy danh sách đơn hàng theo số điện thoại
router.get("/admin/by-phone", verifyUser, verifyAdmin, getOrdersByPhone);

// Admin - Lấy lịch sử đơn hàng của một user cụ thể
router.get("/admin/user/:id", verifyUser, verifyAdmin, getUserOrders);

// Admin - Lấy danh sách đơn hàng
router.get("/admin", verifyUser, verifyAdmin, getAllOrders);

// Admin - Lấy danh sách đơn hàng gần đây
router.get("/admin/recent", verifyUser, verifyAdmin, getRecentOrders);

// Admin - Xem chi tiết đơn hàng
router.get("/admin/:id", verifyUser, verifyAdmin, getOrderById);

// Admin - Đặt hàng hộ user khác hoặc khách vãng lai
router.post("/admin", verifyUser, verifyAdmin, createOrder);

// Admin - Cập nhật trạng thái đơn hàng
router.put("/admin/:id/status", verifyUser, verifyAdmin, updateOrderStatus);

// Admin - Cập nhật chi tiết đơn hàng
router.put("/admin/:id/details", verifyUser, verifyAdmin, updateOrderDetails);

// Admin - Xóa đơn hàng
router.delete("/admin/:id", verifyUser, verifyAdmin, deleteOrder);

// STRIPE WEBHOOK
router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Parse dữ liệu thô thành buffer cho webhook Stripe
    if (req.originalUrl === '/api/orders/stripe-webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  },
  stripeWebhook
);

export default router;