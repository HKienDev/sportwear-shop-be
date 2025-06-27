import express from "express";
import * as chatController from "../controllers/chatController.js";
import { verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes (cho user)
router.get("/history", chatController.getMessageHistory);
router.get("/unread/:recipientId", chatController.getUnreadCount);

// Admin routes (require admin authentication)
router.get("/conversations", verifyAdmin, chatController.getConversations);
router.put("/mark-read", verifyAdmin, chatController.markAsRead);
router.delete("/conversation/:userId", verifyAdmin, chatController.deleteConversation);

export default router;