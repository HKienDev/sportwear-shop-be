import express from "express";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
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
  getRecentOrders,
  getStats
} from "../controllers/orderController.js";

const router = express.Router();

// Public routes
router.post("/webhook", stripeWebhook);

// User routes
router.get("/user", verifyUser, getUserOrders);
router.get("/user/:id", verifyUser, getUserOrders);
router.get("/phone", getOrdersByPhone);

// Admin routes
router.post("/admin", verifyUser, verifyAdmin, createOrder);
router.get("/admin/recent", verifyUser, verifyAdmin, getRecentOrders);
router.get("/admin/stats", verifyUser, verifyAdmin, getStats);
router.get("/admin", verifyUser, verifyAdmin, getAllOrders);
router.get("/admin/:id", verifyUser, verifyAdmin, getOrderById);
router.put("/admin/:id", verifyUser, verifyAdmin, updateOrderDetails);
router.put("/admin/:id/status", verifyUser, verifyAdmin, updateOrderStatus);
router.delete("/admin/:id", verifyUser, verifyAdmin, deleteOrder);

export default router;