import express from 'express';
import { getStats, getRevenue, getRecentOrders, getBestSellingProducts } from '../controllers/dashboardController.js';
import { verifyAccessTokenMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Tất cả các routes đều yêu cầu xác thực và quyền admin
router.use(verifyAccessTokenMiddleware, isAdmin);

// Lấy thống kê tổng quan
router.get('/stats', getStats);

// Lấy doanh thu
router.get('/revenue', getRevenue);

// Lấy đơn hàng gần đây
router.get('/recent-orders', getRecentOrders);

// Lấy sản phẩm bán chạy
router.get('/best-selling-products', getBestSellingProducts);

export default router; 