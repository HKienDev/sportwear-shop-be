import express from 'express';
import { getStats, getRevenue, getRecentOrders, getBestSellingProducts, clearCache, clearDashboardCache } from '../controllers/dashboardController.js';
import { verifyAccessTokenMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import { validateQueryParams } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// Tất cả các routes đều yêu cầu xác thực và quyền admin
router.use(verifyAccessTokenMiddleware, isAdmin);

// Validation schemas
const revenueValidation = {
  period: {
    type: 'string',
    default: 'month',
    required: true
  },
  limit: {
    type: 'number',
    min: 1,
    max: 365,
    default: 12
  }
};

const recentOrdersValidation = {
  page: {
    in: ['query'],
    optional: true,
    isInt: true,
    toInt: true,
    errorMessage: 'Page must be an integer',
    custom: {
      options: (value) => value > 0
    },
    customSanitizer: {
      options: (value) => value || 1
    }
  },
  limit: {
    in: ['query'],
    optional: true,
    isInt: true,
    toInt: true,
    errorMessage: 'Limit must be an integer',
    custom: {
      options: (value) => value > 0
    },
    customSanitizer: {
      options: (value) => value || 2
    }
  }
};

const bestSellingValidation = {
  limit: {
    type: 'number',
    min: 1,
    max: 6,
    default: 6
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
router.post('/stats/clear-cache', clearDashboardCache);

// Lấy doanh thu
router.get('/revenue', validateQueryParams(revenueValidation), getRevenue);
router.post('/revenue/clear-cache', clearCache);

// Lấy đơn hàng gần đây
router.get('/recent-orders', validateQueryParams(recentOrdersValidation), getRecentOrders);

// Lấy sản phẩm bán chạy
router.get('/best-selling-products', validateQueryParams(bestSellingValidation), getBestSellingProducts);

export default router; 