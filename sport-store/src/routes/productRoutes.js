import express from "express";
import * as productController from "../controllers/productController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    createProductSchema, 
    updateProductSchema, 
    searchProductSchema 
} from '../schemas/productSchema.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Product routes
router.get("/", productController.getAllProducts);
router.get("/search", validateRequest(searchProductSchema), productController.searchProducts);
router.get("/category/:categoryId", productController.getProductsByCategory);

// Protected routes (Admin only)
router.get("/admin", verifyAdmin, productController.getAllProducts);
router.post("/", verifyAdmin, validateRequest(createProductSchema), productController.createProduct);
router.put("/:id", verifyAdmin, validateRequest(updateProductSchema), productController.updateProduct);
router.delete("/:id", verifyAdmin, productController.deleteProduct);
router.put("/:id/status", verifyAdmin, validateRequest(updateProductSchema), productController.updateProductStatus);

export default router;