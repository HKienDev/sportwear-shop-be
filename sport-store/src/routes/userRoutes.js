const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware"); // Middleware kiểm tra quyền

// Middleware kiểm tra ObjectId hợp lệ
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID người dùng không hợp lệ." });
  }
  next();
};

// 🛠 Routes dành cho admin
router.get("/", authMiddleware.verifyAdmin, userController.getAllUsers); // Admin lấy danh sách user
router.get("/:id", authMiddleware.verifyAdmin, validateObjectId, userController.getUserById); // Admin lấy thông tin user theo ID
router.put("/admin/:id", authMiddleware.verifyAdmin, userController.updateUserByAdmin); // Admin update user
router.delete("/admin/:id", authMiddleware.verifyAdmin, validateObjectId, userController.deleteUser); // Admin xóa user
router.post("/admin", authMiddleware.verifyAdmin, userController.createUser); // Admin tạo user mới
router.post("/admin/create-admin", authMiddleware.verifyAdmin, userController.createNewAdmin);
module.exports = router;