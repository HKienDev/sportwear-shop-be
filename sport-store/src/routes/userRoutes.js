import express from "express";
import mongoose from "mongoose";
import { 
  getAllUsers, 
  getUserProfile, 
  getUserById, 
  register, 
  updateUserByAdmin, 
  deleteUser, 
  createNewAdmin,
  getUserByPhone,
  updateUserTotalSpent,
  resetUserPassword,
  updateProfile,
  changePassword,
  updateAllUsersOrderCount,
  login,
  logout
} from "../controllers/userController.js";
import { getStats, getRevenue } from '../controllers/statsController.js';
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Middleware kiểm tra ObjectId hợp lệ
const validateObjectId = (req, res, next) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "ID không tồn tại." });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID không hợp lệ!" });
  }
  next();
};

// Middleware kiểm tra ObjectId trong body
const validateBodyObjectId = (req, res, next) => {
  const { userId, orderId } = req.body;
  if (!userId || !orderId) {
    return res.status(400).json({ message: "ID người dùng hoặc ID đơn hàng không tồn tại." });
  }
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ message: "ID người dùng hoặc ID đơn hàng không hợp lệ!" });
  }
  next();
};

// Auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// User routes
router.get("/profile", verifyUser, getUserProfile);
router.put("/profile", verifyUser, updateProfile);
router.put("/change-password", verifyUser, changePassword);

// Admin routes
router.get("/admin/stats", verifyUser, verifyAdmin, getStats);
router.get("/admin/revenue", verifyUser, verifyAdmin, getRevenue);

// Protected routes
router.get("/", verifyAdmin, getAllUsers);
router.get("/:id", verifyAdmin, validateObjectId, getUserById);
router.put("/:id", verifyAdmin, validateObjectId, updateUserByAdmin);
router.delete("/:id", verifyAdmin, validateObjectId, deleteUser);
router.post("/admin", verifyAdmin, createNewAdmin);
router.get("/phone/:phone", verifyAdmin, getUserByPhone);
router.put("/admin/reset-password/:id", verifyAdmin, validateObjectId, resetUserPassword);

// Utility routes (admin only)
router.put("/admin/update-order-count", verifyAdmin, updateAllUsersOrderCount);
router.put("/admin/update-total-spent", verifyAdmin, validateBodyObjectId, updateUserTotalSpent);

export default router;