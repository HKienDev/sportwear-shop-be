import express from "express";
import { 
    getProducts, 
    getProductBySku,
    createProduct,
    updateProduct,
    deleteProduct,
    updateProductStatus,
    getAdminProducts,
    updateSizeStatus,
    getProductsByCategory
} from '../controllers/productController.js';
import { verifyUser, verifyAdmin } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    createProductSchema, 
    updateProductSchema, 
    searchProductSchema,
    productStatusSchema,
    updateSizeStatusSchema
} from '../schemas/productSchema.js';
import { SUCCESS_MESSAGES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Product routes - Public
router.get("/", getProducts);
router.get("/search", validateRequest(searchProductSchema), getProducts);
router.get("/sku/:sku", getProductBySku);
router.get("/category/:categoryId", getProductsByCategory);

// Admin routes (require admin role)
router.get("/admin", verifyUser, verifyAdmin, getAdminProducts);

// Protected routes (require authentication)
router.use(verifyUser);

// Admin routes (require admin role)
router.use(verifyAdmin);

// Product management routes - Admin
router.post("/", upload.array('images', 5), validateRequest(createProductSchema), createProduct);
router.put("/:sku", upload.array('images', 5), validateRequest(updateProductSchema), updateProduct);
router.delete("/:sku", deleteProduct);
router.patch("/:sku/status", validateRequest(productStatusSchema), updateProductStatus);
router.patch("/:sku/size-status", validateRequest(updateSizeStatusSchema), updateSizeStatus);

// Lấy chi tiết sản phẩm theo SKU (phải đặt sau các route khác để tránh xung đột)
router.get("/:sku", getProductBySku);

export default router;