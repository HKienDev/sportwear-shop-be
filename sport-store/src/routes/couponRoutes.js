import express from "express";
import { checkRole, auth } from "../middlewares/auth.js";
import {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    bulkDeleteCoupons,
} from "../controllers/couponController.js";

const router = express.Router();

// Admin routes - đặt trước route /:id
router.get("/admin", auth, checkRole(['admin']), getAllCoupons);
router.post("/admin", auth, checkRole(['admin']), createCoupon);
router.put("/admin/:id", auth, checkRole(['admin']), updateCoupon);
router.delete("/admin/:id", auth, checkRole(['admin']), deleteCoupon);
router.delete("/admin/bulk-delete", auth, checkRole(['admin']), bulkDeleteCoupons);

// Public routes - đặt sau route /admin
router.get("/", getAllCoupons);
router.get("/:id", getCouponById);

export default router; 