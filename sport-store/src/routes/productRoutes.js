import express from "express";
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  toggleProductStatus 
} from "../controllers/productController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public Routes (Bất kỳ ai cũng có thể truy cập)
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protected routes (Admin only)
router.post("/", verifyAdmin, createProduct);
router.put("/:id", verifyAdmin, updateProduct);
router.patch("/:id/toggle-status", verifyAdmin, toggleProductStatus);
router.delete("/:id", verifyAdmin, deleteProduct);

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