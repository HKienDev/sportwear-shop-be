import express from "express";
import { checkRole, auth } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createReviewSchema, updateReviewSchema, searchReviewSchema } from "../schemas/reviewSchema.js";
import {
    getAllReviews,
    getReviewById,
    createReview,
    updateReview,
    deleteReview,
    bulkDeleteReviews,
    verifyReview,
    unverifyReview,
    makePublic,
    makePrivate
} from "../controllers/reviewController.js";

const router = express.Router();

// Admin routes - đặt route cụ thể trước route có tham số
router.get("/admin", auth, checkRole(['admin']), validateRequest({ query: searchReviewSchema }), getAllReviews);
router.post("/admin", auth, checkRole(['admin']), validateRequest({ body: createReviewSchema }), createReview);
router.delete("/admin/bulk-delete", auth, checkRole(['admin']), bulkDeleteReviews);
router.put("/admin/:id/verify", auth, checkRole(['admin']), verifyReview);
router.put("/admin/:id/unverify", auth, checkRole(['admin']), unverifyReview);
router.put("/admin/:id/public", auth, checkRole(['admin']), makePublic);
router.put("/admin/:id/private", auth, checkRole(['admin']), makePrivate);
router.put("/admin/:id", auth, checkRole(['admin']), validateRequest({ body: updateReviewSchema }), updateReview);
router.delete("/admin/:id", auth, checkRole(['admin']), deleteReview);

// Public routes - đặt sau route /admin
router.get("/", validateRequest({ query: searchReviewSchema }), getAllReviews);
router.get("/:id", getReviewById);

// User routes
router.post("/", auth, validateRequest({ body: createReviewSchema }), createReview);
router.put("/:id", auth, validateRequest({ body: updateReviewSchema }), updateReview);
router.delete("/:id", auth, deleteReview);

export default router; 