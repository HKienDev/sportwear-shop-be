import express from 'express';
import { getStats, getRevenue, getRecentOrders, getBestSellingProducts } from '../controllers/dashboardController.js';
import { verifyAccessTokenMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import { validateQueryParams } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// Tất cả các routes đều yêu cầu xác thực và quyền admin
router.use(verifyAccessTokenMiddleware, isAdmin);

// Validation schemas
const revenueValidation = {
  months: {
    type: 'number',
    min: 1,
    max: 12,
    default: 6
  }
};

const recentOrdersValidation = {
  page: {
    type: 'number',
    min: 1,
    default: 1
  },
  limit: {
    type: 'number',
    min: 1,
    max: 50,
    default: 5
  }
};

const bestSellingValidation = {
  limit: {
    type: 'number',
    min: 1,
    max: 20,
    default: 5
  },
  days: {
    type: 'number',
    min: 1,
    max: 365,
    default: 30
  }
};

// Lấy thống kê tổng quan
router.get('/stats', getStats);

// Lấy doanh thu
router.get('/revenue', validateQueryParams(revenueValidation), getRevenue);

// Lấy đơn hàng gần đây
router.get('/recent-orders', validateQueryParams(recentOrdersValidation), getRecentOrders);

// Lấy sản phẩm bán chạy
router.get('/best-selling-products', validateQueryParams(bestSellingValidation), getBestSellingProducts);

export default router; 