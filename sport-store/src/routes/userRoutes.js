import express from "express";
import mongoose from "mongoose";
import { 
  getAllUsers, 
  getUserProfile, 
  getUserById, 
  createUser, 
  updateUserByAdmin, 
  deleteUser, 
  createNewAdmin,
  getUserByPhone,
  updateUserTotalSpent 
} from "../controllers/userController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Middleware kiểm tra ObjectId hợp lệ
const validateObjectId = (req, res, next) => {
  const id = req.params.id || req.body.userId;
  if (!id) {
    return res.status(400).json({ message: "ID không tồn tại." });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID không hợp lệ!" });
  }
  next();
};

// Routes dành cho admin
router.get("/", verifyAdmin, getAllUsers); // Admin lấy danh sách user
router.get("/:id", verifyAdmin, validateObjectId, getUserById); // Admin lấy thông tin user theo ID
router.put("/admin/:id", verifyAdmin, validateObjectId, updateUserByAdmin); // Admin update user
router.delete("/admin/:id", verifyAdmin, validateObjectId, deleteUser); // Admin xóa user
router.post("/admin", verifyAdmin, createUser); // Admin tạo user mới
router.post("/admin/create-admin", verifyAdmin, createNewAdmin);
// Route tìm user theo số điện thoại
router.get("/phone/:phone", getUserByPhone);

// Route lấy thông tin user đang đăng nhập
router.get("/profile", verifyUser, getUserProfile);

// Route cập nhật totalSpent
router.put("/admin/update-total-spent", verifyAdmin, validateObjectId, updateUserTotalSpent);

export default router;