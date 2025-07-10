import express from "express";
import { 
    getProducts, 
    getProductBySku,
    createProduct,
    updateProduct,
    deleteProduct,
    updateProductStatus,
    getProductsByCategory,
    getFeaturedProducts,
    updateProductFeaturedStatus,
    updateProductFeaturedConfig,
    getProductsByCategorySlug
} from '../controllers/productController.js';
import { verifyUser, verifyAdmin } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    createProductSchema, 
    updateProductSchema, 
    searchProductSchema,
    productStatusSchema
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
router.get("/featured", getFeaturedProducts);
router.get("/sku/:sku", getProductBySku);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/category/slug/:slug", getProductsByCategorySlug);

// Protected routes (require authentication)
router.use(verifyUser);

// Admin routes (require admin role)
router.use(verifyAdmin);

// Route để lấy danh sách sản phẩm cho admin (bao gồm cả sản phẩm không active)
router.get("/admin", getProducts);

// Product management routes - Admin
router.post("/", upload.array('images', 5), validateRequest(createProductSchema), createProduct);
router.put("/:sku", upload.array('images', 5), validateRequest(updateProductSchema), updateProduct);
router.delete("/:sku", deleteProduct);
router.patch("/:sku/status", validateRequest(productStatusSchema), updateProductStatus);
router.patch("/:sku/featured", updateProductFeaturedStatus);
router.patch("/sku/:sku/featured-config", updateProductFeaturedConfig);

// Route mới: /new-arrivals
router.get('/new-arrivals', (req, res) => {
  res.json({ products: [], message: 'Chưa có logic new-arrivals, trả về mảng rỗng.' });
});

// Route mới: /sale
router.get('/sale', (req, res) => {
  res.json({ products: [], message: 'Chưa có logic sale, trả về mảng rỗng.' });
});

// Lấy chi tiết sản phẩm theo SKU (phải đặt sau các route khác để tránh xung đột)
router.get("/:sku", getProductBySku);

// Route mới: /new-arrivals
router.get('/new-arrivals', (req, res) => {
  res.json({ products: [], message: 'Chưa có logic new-arrivals, trả về mảng rỗng.' });
});

// Route mới: /sale
router.get('/sale', (req, res) => {
  res.json({ products: [], message: 'Chưa có logic sale, trả về mảng rỗng.' });
});

export default router;