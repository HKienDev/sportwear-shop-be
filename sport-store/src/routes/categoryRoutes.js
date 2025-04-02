import express from "express";
import * as categoryController from "../controllers/categoryController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    createCategorySchema, 
    updateCategorySchema, 
    searchCategorySchema 
} from '../validations/categorySchema.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Category routes
router.get("/", categoryController.getAllCategories);
router.get("/search", validateRequest(searchCategorySchema), categoryController.searchCategories);

// Protected routes (Admin only)
router.get("/admin", verifyAdmin, categoryController.getAllCategories);
router.post("/", verifyAdmin, validateRequest(createCategorySchema), categoryController.createCategory);
router.put("/:id", verifyAdmin, validateRequest(updateCategorySchema), categoryController.updateCategory);
router.delete("/:id", verifyAdmin, categoryController.deleteCategory);

export default router;