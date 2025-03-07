import express from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 📌 Routes cho categories
router.get("/", getAllCategories); // Ai cũng có thể xem danh mục
router.get("/:id", getCategoryById); // Ai cũng có thể xem danh mục cụ thể

// 📌 Chỉ admin mới có quyền thêm, sửa, xóa danh mục
router.post("/", verifyUser, verifyAdmin, createCategory);
router.put("/:id", verifyUser, verifyAdmin, updateCategory);
router.delete("/:id", verifyUser, verifyAdmin, deleteCategory);

export default router;