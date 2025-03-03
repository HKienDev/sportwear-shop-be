const express = require("express");
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { verifyUser, verifyAdmin } = require("../middlewares/authMiddleware");

// Routes cho categories
router.get("/", getAllCategories); // Ai cũng có thể xem danh mục
router.get("/:id", getCategoryById); // Ai cũng có thể xem danh mục cụ thể

// Chỉ admin mới có quyền thêm, sửa, xóa danh mục
router.post("/", verifyUser, verifyAdmin, createCategory);
router.put("/:id", verifyUser, verifyAdmin, updateCategory);
router.delete("/:id", verifyUser, verifyAdmin, deleteCategory);

module.exports = router;