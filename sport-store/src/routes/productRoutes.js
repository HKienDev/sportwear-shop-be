import express from "express";
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from "../controllers/productController.js";
import verifyUser from "../middleware/verifyUser.js";

const router = express.Router();

// Public Routes (Bất kỳ ai cũng có thể truy cập)
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protected routes (Admin only)
router.post("/", verifyUser, createProduct);
router.put("/:id", verifyUser, updateProduct);
router.delete("/:id", verifyUser, deleteProduct);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('❌ Route error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Có lỗi xảy ra khi xử lý yêu cầu',
    details: err.message
  });
});

export default router;