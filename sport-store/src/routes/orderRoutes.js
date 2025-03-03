const express = require("express");
const router = express.Router();
const { 
    createOrder,
    updateOrderStatus,
    updateOrderDetails,
    getOrderById,
    getUserOrders,
    getAllOrders,  // ✅ Fix: Thêm function xem tất cả đơn hàng cho Admin
    deleteOrder,
    stripeWebhook
} = require("../controllers/orderController");
const { verifyUser, verifyAdmin } = require("../middlewares/authMiddleware");

// 🚀 ADMIN - Xem tất cả đơn hàng
router.get("/admin", verifyUser, verifyAdmin, getAllOrders); // ✅ Fix: Đổi getUserOrders → getAllOrders

// 🚀 ADMIN - Xem chi tiết đơn hàng
router.get("/admin/:id", verifyUser, verifyAdmin, getOrderById);

// 🚀 ADMIN - Cập nhật trạng thái đơn hàng
router.put("/admin/:id/status", verifyUser, verifyAdmin, updateOrderStatus);

// 🚀 ADMIN - Cập nhật chi tiết đơn hàng
router.put("/admin/:id/details", verifyUser, verifyAdmin, updateOrderDetails);

// 🚀 ADMIN - Xóa đơn hàng
router.delete("/admin/:id", verifyUser, verifyAdmin, deleteOrder);

// 🚀 User đặt hàng
router.post("/", verifyUser, createOrder);

// 🚀 User xem danh sách tất cả đơn hàng của mình
router.get("/", verifyUser, getUserOrders);

// 🚀 User xem chi tiết đơn hàng của mình
router.get("/:id", verifyUser, getOrderById);

// 🚀 User hoặc Admin có thể hủy đơn hàng
router.delete("/:id", verifyUser, deleteOrder);

// 🚀 Xử lý Webhook Stripe
router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),  // ✅ Kiểm tra đã tách raw() chưa
  stripeWebhook
);

module.exports = router;