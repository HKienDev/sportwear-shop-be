import express from 'express';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';
import { getRedisClient } from '../config/redis.js';
import { logInfo, logError } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Middleware để check admin role
router.use(isAuthenticated, isAdmin);

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Fetching dashboard stats`);

        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = 'dashboard_stats';
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                logInfo(`[${requestId}] Returning cached dashboard stats`);
                return res.json(JSON.parse(cachedData));
            }
        }

        // Tối ưu query với Promise.all và lean()
        const [totalOrders, totalRevenue, totalCustomers, totalProducts] = await Promise.all([
            Order.countDocuments(),
            Order.aggregate([
                { 
                    $match: { status: 'completed' } 
                },
                { 
                    $group: { 
                        _id: null, 
                        total: { $sum: "$totalAmount" } 
                    } 
                }
            ]).lean(),
            User.countDocuments({ role: 'customer' }),
            Product.countDocuments()
        ]);

        const response = {
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            totalCustomers,
            totalProducts,
            lastUpdated: new Date()
        };

        // Cache kết quả (5 phút)
        if (redis) {
            const cacheKey = 'dashboard_stats';
            await redis.set(cacheKey, JSON.stringify(response), 'EX', 300);
        }

        logInfo(`[${requestId}] Successfully fetched dashboard stats`);
        res.json(response);
    } catch (error) {
        logError(`[${requestId}] Error getting dashboard stats: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting dashboard stats',
            error: error.message
        });
    }
});

// Get Revenue Data
router.get('/revenue', async (req, res) => {
    const requestId = req.id || 'unknown';
    const months = parseInt(req.query.months) || 6;
    
    try {
        logInfo(`[${requestId}] Fetching revenue data for last ${months} months`);

        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = `revenue_data:${months}`;
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                logInfo(`[${requestId}] Returning cached revenue data`);
                return res.json(JSON.parse(cachedData));
            }
        }

        // Tối ưu query với lean()
        const revenue = await Order.aggregate([
            {
                $match: { 
                    status: 'completed',
                    createdAt: { 
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - months)) 
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $concat: [
                            { $toString: "$_id.month" },
                            "/",
                            { $toString: "$_id.year" }
                        ]
                    },
                    revenue: 1,
                    orderCount: 1
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]).lean();
        
        const response = {
            data: revenue,
            lastUpdated: new Date(),
            months
        };

        // Cache kết quả (5 phút)
        if (redis) {
            const cacheKey = `revenue_data:${months}`;
            await redis.set(cacheKey, JSON.stringify(response), 'EX', 300);
        }

        logInfo(`[${requestId}] Successfully fetched revenue data`);
        res.json(response);
    } catch (error) {
        logError(`[${requestId}] Error getting revenue data: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting revenue data',
            error: error.message
        });
    }
});

// Get Recent Orders
router.get('/recent-orders', async (req, res) => {
    const requestId = req.id || 'unknown';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    try {
        logInfo(`[${requestId}] Fetching recent orders - Page: ${page}, Limit: ${limit}`);

        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = `recent_orders:${page}:${limit}`;
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                logInfo(`[${requestId}] Returning cached recent orders`);
                return res.json(JSON.parse(cachedData));
            }
        }

        // Tối ưu query với lean() và select()
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email')
            .select('orderNumber user totalAmount status createdAt')
            .lean();

        // Format dữ liệu
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            customerName: order.user?.name || 'Unknown',
            customerEmail: order.user?.email || 'Unknown',
            total: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt
        }));

        // Lấy tổng số orders cho pagination
        const totalOrders = await Order.countDocuments();

        const response = {
            orders: formattedOrders,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders,
                hasMore: skip + limit < totalOrders
            }
        };

        // Cache kết quả (5 phút)
        if (redis) {
            const cacheKey = `recent_orders:${page}:${limit}`;
            await redis.set(cacheKey, JSON.stringify(response), 'EX', 300);
        }

        logInfo(`[${requestId}] Successfully fetched ${formattedOrders.length} recent orders`);
        res.json(response);
    } catch (error) {
        logError(`[${requestId}] Error getting recent orders: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting recent orders',
            error: error.message
        });
    }
});

// Get Best Selling Products
router.get('/best-selling-products', async (req, res) => {
    const requestId = req.id || 'unknown';
    const limit = parseInt(req.query.limit) || 5;
    const days = parseInt(req.query.days) || 30;
    
    try {
        logInfo(`[${requestId}] Fetching best selling products - Limit: ${limit}, Days: ${days}`);

        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = `best_selling_products:${limit}:${days}`;
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                logInfo(`[${requestId}] Returning cached best selling products`);
                return res.json(JSON.parse(cachedData));
            }
        }

        // Tối ưu query với lean()
        const products = await Order.aggregate([
            {
                $match: { 
                    status: 'completed',
                    createdAt: { 
                        $gte: new Date(new Date().setDate(new Date().getDate() - days)) 
                    }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    totalSales: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $project: {
                    _id: "$product._id",
                    name: "$product.name",
                    category: "$product.category",
                    image: "$product.image",
                    price: "$product.price",
                    totalSales: 1,
                    totalRevenue: 1,
                    averagePrice: { $divide: ["$totalRevenue", "$totalSales"] }
                }
            }
        ]).lean();
        
        const response = {
            products,
            lastUpdated: new Date(),
            limit,
            days
        };

        // Cache kết quả (5 phút)
        if (redis) {
            const cacheKey = `best_selling_products:${limit}:${days}`;
            await redis.set(cacheKey, JSON.stringify(response), 'EX', 300);
        }

        logInfo(`[${requestId}] Successfully fetched ${products.length} best selling products`);
        res.json(response);
    } catch (error) {
        logError(`[${requestId}] Error getting best selling products: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting best selling products',
            error: error.message
        });
    }
});

// Thống kê sản phẩm theo danh mục
router.get('/products/by-category', async (req, res) => {
    try {
        const requestId = generateRequestId();
        const { categoryId } = req.query;

        const pipeline = [
            {
                $match: {
                    isDeleted: false
                }
            },
            {
                $group: {
                    _id: '$categoryId',
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$stock' },
                    totalSold: { $sum: '$soldCount' },
                    averagePrice: { $avg: '$salePrice' }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: 'categoryId',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $project: {
                    _id: 0,
                    categoryId: '$_id',
                    categoryName: '$category.name',
                    totalProducts: 1,
                    totalStock: 1,
                    totalSold: 1,
                    averagePrice: 1
                }
            }
        ];

        const result = await Product.aggregate(pipeline);
        return sendSuccessResponse(res, 200, 'Product statistics by category retrieved successfully', { statistics: result });
    } catch (error) {
        console.error('Error getting product statistics by category:', error);
        return sendErrorResponse(res, 500, 'Error getting product statistics by category', error);
    }
});

export default router; 