import express from "express";
import { getStats, getRevenue } from "../controllers/statsController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Lấy thống kê tổng quan
router.get("/stats", verifyUser, verifyAdmin, getStats);

// Lấy dữ liệu doanh thu cho biểu đồ
router.get("/revenue", verifyUser, verifyAdmin, getRevenue);

export default router; 