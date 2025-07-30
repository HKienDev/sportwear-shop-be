import express from "express";
import { checkRole } from "../middlewares/auth.js";
import { verifyAccessTokenMiddleware } from "../middlewares/authMiddleware.js";
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
router.get("/admin", verifyAccessTokenMiddleware, checkRole(['admin']), validateRequest({ query: searchReviewSchema }), getAllReviews);
router.post("/admin", verifyAccessTokenMiddleware, checkRole(['admin']), validateRequest({ body: createReviewSchema }), createReview);
router.delete("/admin/bulk-delete", verifyAccessTokenMiddleware, checkRole(['admin']), bulkDeleteReviews);
router.put("/admin/:id/verify", verifyAccessTokenMiddleware, checkRole(['admin']), verifyReview);
router.put("/admin/:id/unverify", verifyAccessTokenMiddleware, checkRole(['admin']), unverifyReview);
router.put("/admin/:id/public", verifyAccessTokenMiddleware, checkRole(['admin']), makePublic);
router.put("/admin/:id/private", verifyAccessTokenMiddleware, checkRole(['admin']), makePrivate);
router.put("/admin/:id", verifyAccessTokenMiddleware, checkRole(['admin']), validateRequest({ body: updateReviewSchema }), updateReview);
router.delete("/admin/:id", verifyAccessTokenMiddleware, checkRole(['admin']), deleteReview);

// Public routes - đặt sau route /admin
router.get("/", getAllReviews);
router.get("/:id", getReviewById);

// User routes
router.post("/", verifyAccessTokenMiddleware, validateRequest({ body: createReviewSchema }), createReview);
router.put("/:id", verifyAccessTokenMiddleware, validateRequest({ body: updateReviewSchema }), updateReview);
router.delete("/:id", verifyAccessTokenMiddleware, deleteReview);

export default router; 