import express from "express";
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from "../controllers/productController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js"; // ✅ Đúng tên hàm

const router = express.Router();

// 📌 Public Routes (Bất kỳ ai cũng có thể truy cập)
router.get("/", getProducts);
router.get("/:id", getProductById);

// 📌 Private/Admin Routes (Chỉ admin mới có quyền thực hiện)
router.post("/", verifyUser, verifyAdmin, createProduct);  // ✅ Đổi 'admin' thành 'verifyAdmin'
router.put("/:id", verifyUser, verifyAdmin, updateProduct);
router.delete("/:id", verifyUser, verifyAdmin, deleteProduct);

export default router;