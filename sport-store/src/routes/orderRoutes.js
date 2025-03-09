import express from "express";
import { 
    createOrder,
    updateOrderStatus,
    updateOrderDetails,
    getOrderById,
    getUserOrders,
    getAllOrders,
    deleteOrder,
    stripeWebhook
} from "../controllers/orderController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ADMIN - Xem tất cả đơn hàng (có hỗ trợ tìm theo shortId hoặc _id)
router.get("/admin", verifyUser, verifyAdmin, getAllOrders);

// ADMIN - Xem chi tiết đơn hàng
router.get("/admin/:id", verifyUser, verifyAdmin, getOrderById);

// ADMIN - Cập nhật trạng thái đơn hàng
router.put("/admin/:id/status", verifyUser, verifyAdmin, updateOrderStatus);

// ADMIN - Cập nhật chi tiết đơn hàng
router.put("/admin/:id/details", verifyUser, verifyAdmin, updateOrderDetails);

// ADMIN - Xóa đơn hàng
router.delete("/admin/:id", verifyUser, verifyAdmin, deleteOrder);

// User đặt hàng
router.post("/", verifyUser, createOrder);

// User xem danh sách tất cả đơn hàng của mình
router.get("/", verifyUser, getUserOrders);

// User xem chi tiết đơn hàng của mình
router.get("/:id", verifyUser, getOrderById);

// User hoặc Admin có thể hủy đơn hàng
router.delete("/:id", verifyUser, deleteOrder);

// Xử lý Webhook Stripe
router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

export default router;