import express from "express";
import mongoose from "mongoose";
import * as userController from "../controllers/userController.js";
import { getStats, getRevenue } from '../controllers/statsController.js';
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    createUserSchema, 
    updateUserSchema, 
    updateProfileSchema, 
    changePasswordSchema, 
    resetUserPasswordSchema 
} from '../validations/userSchema.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

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

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Protected routes (require authentication)
router.get("/profile", verifyUser, userController.getUserProfile);
router.put("/profile", verifyUser, validateRequest(updateProfileSchema), userController.updateProfile);
router.put("/change-password", verifyUser, validateRequest(changePasswordSchema), userController.changePassword);

// Admin routes
router.get("/", verifyAdmin, userController.getUsers);
router.get("/:id", verifyAdmin, validateObjectId, userController.getUserById);
router.post("/", verifyAdmin, validateRequest(createUserSchema), userController.register);
router.put("/:id", verifyAdmin, validateObjectId, validateRequest(updateUserSchema), userController.updateUserByAdmin);
router.delete("/:id", verifyAdmin, validateObjectId, userController.deleteUser);
router.post("/admin/create", verifyAdmin, validateRequest(createUserSchema), userController.createNewAdmin);
router.get("/phone/:phone", verifyAdmin, userController.getUserByPhone);
router.put("/admin/batch-update", verifyAdmin, userController.updateAllUsersOrderCount);
router.put("/admin/:userId/update-spent", verifyAdmin, validateObjectId, userController.updateUserTotalSpent);
router.put("/admin/:userId/reset-password", verifyAdmin, validateObjectId, validateRequest(resetUserPasswordSchema), userController.resetUserPassword);

// Auth routes
router.post("/login", userController.login);
router.post("/logout", userController.logout);

// Admin routes
router.get("/admin/stats", verifyUser, verifyAdmin, getStats);
router.get("/admin/revenue", verifyUser, verifyAdmin, getRevenue);

export default router;