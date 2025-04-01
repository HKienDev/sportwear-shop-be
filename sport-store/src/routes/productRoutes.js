import express from "express";
import * as productController from "../controllers/productController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    createProductSchema, 
    updateProductSchema, 
    updateStockSchema, 
    searchProductSchema 
} from '../validations/productSchema.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Product routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.get("/category/:categoryId", productController.getProductsByCategory);
router.get("/search", validateRequest(searchProductSchema), productController.searchProducts);

// Protected routes (Admin only)
router.post("/", verifyAdmin, validateRequest(createProductSchema), productController.createProduct);
router.put("/:id", verifyAdmin, validateRequest(updateProductSchema), productController.updateProduct);
router.delete("/:id", verifyAdmin, productController.deleteProduct);
router.put("/:id/stock", verifyAdmin, validateRequest(updateStockSchema), productController.updateProductStock);
router.put("/:id/status", verifyAdmin, validateRequest(updateProductSchema), productController.updateProductStatus);

export default router;