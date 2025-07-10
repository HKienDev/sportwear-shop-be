import express from "express";
import * as categoryController from "../controllers/categoryController.js";
import { verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createCategorySchema,
  updateCategorySchema,
  searchCategorySchema
} from '../schemas/categorySchema.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: "Route working" });
});

// Category routes
router.get("/", categoryController.getAllCategories);
router.get("/search", validateRequest(searchCategorySchema), categoryController.searchCategories);
router.get("/admin", verifyAdmin, categoryController.getAllCategories);
router.get("/slug/:slug", categoryController.getCategoryBySlug);
router.get("/:categoryId", categoryController.getCategoryById);

// Protected routes (Admin only)
router.post("/", verifyAdmin, validateRequest(createCategorySchema), categoryController.createCategory);
router.put("/:categoryId", verifyAdmin, validateRequest(updateCategorySchema), categoryController.updateCategory);
router.delete("/:categoryId", verifyAdmin, categoryController.deleteCategory);

export default router;