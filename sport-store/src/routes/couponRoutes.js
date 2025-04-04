import express from "express";
import { checkRole, auth } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createCouponSchema, updateCouponSchema, searchCouponSchema } from "../schemas/couponSchema.js";
import {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    bulkDeleteCoupons,
    pauseCoupon,
    activateCoupon
} from "../controllers/couponController.js";

const router = express.Router();

// Admin routes - đặt route cụ thể trước route có tham số
router.get("/admin", auth, checkRole(['admin']), validateRequest({ query: searchCouponSchema }), getAllCoupons);
router.get("/admin/:id", auth, checkRole(['admin']), getCouponById);
router.post("/admin", auth, checkRole(['admin']), validateRequest({ body: createCouponSchema }), createCoupon);
router.delete("/admin/bulk-delete", auth, checkRole(['admin']), bulkDeleteCoupons);
router.put("/admin/:id/pause", auth, checkRole(['admin']), pauseCoupon);
router.put("/admin/:id/activate", auth, checkRole(['admin']), activateCoupon);
router.put("/admin/:id", auth, checkRole(['admin']), validateRequest({ body: updateCouponSchema }), updateCoupon);
router.delete("/admin/:id", auth, checkRole(['admin']), deleteCoupon);

// Public routes - đặt sau route /admin
router.get("/", validateRequest({ query: searchCouponSchema }), getAllCoupons);
router.get("/:id", getCouponById);

export default router; 