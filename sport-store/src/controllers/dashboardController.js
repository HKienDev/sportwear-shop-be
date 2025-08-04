import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { getRedisClient } from '../config/redis.js';
import { logInfo, logError } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Hàm utility xóa cache dashboard (không req/res)
export const clearDashboardCacheUtil = async () => {
    try {
        const redis = getRedisClient();
        if (redis) {
            // Clear dashboard stats cache
            const statsCacheKey = 'dashboard_stats';
            await redis.del(statsCacheKey);
            
            // Clear revenue data cache for all periods
            const revenueCacheKeys = [
                'revenue_data:day:7',
                'revenue_data:month:12', 
                'revenue_data:year:5'
            ];
            
            for (const key of revenueCacheKeys) {
                await redis.del(key);
            }
            
            logInfo(`[clearDashboardCacheUtil] Dashboard cache cleared successfully`);
        }
    } catch (error) {
        logError(`[clearDashboardCacheUtil] Error clearing dashboard cache: ${error.message}`);
    }
};

// Middleware cho route thủ công (giữ nguyên route, dùng cho API clear cache)
export const clearDashboardCache = async (req, res) => {
    const requestId = req.id || 'unknown';
    try {
        await clearDashboardCacheUtil();
        logInfo(`[${requestId}] Dashboard cache cleared manually`);
        res.json({
            success: true,
            message: 'Dashboard cache cleared successfully'
        });
    } catch (error) {
        logError(`[${requestId}] Error clearing dashboard cache: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error clearing dashboard cache',
            error: error.message
        });
    }
};

// Get Dashboard Stats
export const getStats = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = 'dashboard_stats';
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                return res.json({
                    success: true,
                    data: JSON.parse(cachedData),
                    message: 'Dashboard stats retrieved from cache'
                });
            }
        }

        // Lấy ngày đầu tháng này và tháng trước
        const now = new Date();
        const firstDayOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Tối ưu query với Promise.all
        const [
            pendingOrders, 
            confirmedOrders, 
            deliveredOrders, 
            cancelledOrders, 
            totalRevenue, 
            totalCustomers, 
            totalProducts,
            // Thống kê tháng này
            thisMonthOrders,
            thisMonthRevenue,
            thisMonthCustomers,
            thisMonthProducts,
            // Thống kê tháng trước
            lastMonthOrders,
            lastMonthRevenue,
            lastMonthCustomers,
            lastMonthProducts
        ] = await Promise.all([
            // Đếm số đơn hàng đang chờ xác nhận
            Order.countDocuments({ status: 'pending' }),
            // Đếm số đơn hàng đã xác nhận
            Order.countDocuments({ status: 'confirmed' }),
            // Đếm số đơn hàng đã giao
            Order.countDocuments({ status: 'delivered' }),
            // Đếm số đơn hàng đã hủy
            Order.countDocuments({ status: 'cancelled' }),
            // Tính tổng doanh thu từ đơn hàng đã giao thành công
            Order.aggregate([
                { 
                    $match: { status: 'delivered' } 
                },
                { 
                    $group: { 
                        _id: null, 
                        total: { $sum: "$totalPrice" } 
                    } 
                }
            ]).exec(),
            // Đếm tổng số khách hàng (role user)
            User.countDocuments({ role: 'user' }),
            // Đếm tổng số sản phẩm
            Product.countDocuments(),
            
            // Đơn hàng tháng này (tính từ pending trừ cancelled)
            Order.countDocuments({ 
                $or: [
                    { status: 'pending', createdAt: { $gte: firstDayOfThisMonth } },
                    { status: 'confirmed', createdAt: { $gte: firstDayOfThisMonth } },
                    { status: 'delivered', createdAt: { $gte: firstDayOfThisMonth } }
                ]
            }),
            // Doanh thu tháng này
            Order.aggregate([
                { 
                    $match: { 
                        status: 'delivered',
                        createdAt: { $gte: firstDayOfThisMonth }
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        total: { $sum: "$totalPrice" } 
                    } 
                }
            ]).exec(),
            // Khách hàng mới tháng này
            User.countDocuments({ 
                role: 'user',
                createdAt: { $gte: firstDayOfThisMonth }
            }),
            // Sản phẩm mới tháng này
            Product.countDocuments({ 
                createdAt: { $gte: firstDayOfThisMonth }
            }),
            
            // Đơn hàng tháng trước (tính từ pending trừ cancelled)
            Order.countDocuments({ 
                $or: [
                    { status: 'pending', createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfThisMonth } },
                    { status: 'confirmed', createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfThisMonth } },
                    { status: 'delivered', createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfThisMonth } }
                ]
            }),
            // Doanh thu tháng trước
            Order.aggregate([
                { 
                    $match: { 
                        status: 'delivered',
                        createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfThisMonth }
                    } 
                },
                { 
                    $group: { 
                        _id: null, 
                        total: { $sum: "$totalPrice" } 
                    } 
                }
            ]).exec(),
            // Khách hàng mới tháng trước
            User.countDocuments({ 
                role: 'user',
                createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfThisMonth }
            }),
            // Sản phẩm mới tháng trước
            Product.countDocuments({ 
                createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfThisMonth }
            })
        ]);

        // Tính phần trăm tăng trưởng
        const calculateGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const orderGrowth = calculateGrowth(thisMonthOrders, lastMonthOrders);
        const revenueGrowth = calculateGrowth(
            thisMonthRevenue[0]?.total || 0, 
            lastMonthRevenue[0]?.total || 0
        );
        const customerGrowth = calculateGrowth(thisMonthCustomers, lastMonthCustomers);
        const productGrowth = calculateGrowth(thisMonthProducts, lastMonthProducts);

        const data = {
            totalOrders: pendingOrders + confirmedOrders + deliveredOrders + cancelledOrders, // Tổng đơn hàng = Tất cả các đơn hàng, không phân biệt trạng thái
            totalRevenue: totalRevenue[0]?.total || 0,
            totalCustomers,
            totalProducts,
            growth: {
                orders: orderGrowth,
                revenue: revenueGrowth,
                customers: customerGrowth,
                products: productGrowth
            },
            lastUpdated: new Date()
        };

        // Cache kết quả (5 phút)
        if (redis) {
            const cacheKey = 'dashboard_stats';
            await redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
        }


        res.json({
            success: true,
            data,
            message: 'Dashboard stats retrieved successfully'
        });
    } catch (error) {
        logError(`[${requestId}] Error getting dashboard stats: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting dashboard stats',
            error: error.message
        });
    }
};

// Get Revenue Data
export const getRevenue = async (req, res) => {
    const requestId = req.id || 'unknown';
    const { period = 'month', limit = 12 } = req.query;
    
    try {
        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = `revenue_data:${period}:${limit}`;
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                const lastUpdated = new Date(parsedData.lastUpdated);
                const now = new Date();
                
                // Kiểm tra xem dữ liệu có phải là của ngày hôm nay không
                const isSameDay = lastUpdated.getDate() === now.getDate() &&
                                lastUpdated.getMonth() === now.getMonth() &&
                                lastUpdated.getFullYear() === now.getFullYear();
                
                // Kiểm tra cache cho tất cả period
                if (isSameDay) {
                    // Kiểm tra xem dữ liệu từ cache có đủ số lượng không
                    if (parsedData.revenue && parsedData.revenue.length < parseInt(limit)) {
                        await redis.del(cacheKey);
                    } else {
                        return res.json({
                            success: true,
                            data: parsedData,
                            message: 'Revenue data retrieved from cache'
                        });
                    }
                } else {
                    // Nếu không phải dữ liệu của ngày hôm nay, xóa cache
                    await redis.del(cacheKey);
                }
            }
        }

        const now = new Date();
        let startDate;

        switch (period) {
            case 'day':
                // 7 ngày gần nhất: từ 6 ngày trước đến hôm nay
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 6); // 6 ngày trước
                startDate.setHours(0, 0, 0, 0); // Reset về đầu ngày
                break;
            case 'month':
                // 12 tháng gần nhất: từ 11 tháng trước đến tháng này
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 11); // 11 tháng trước
                break;
            case 'year':
                // 5 năm gần nhất: từ 4 năm trước đến năm này
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 4); // 4 năm trước
                break;
            default:
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 11);
        }

        // Tối ưu query



        const revenue = await Order.aggregate([
            {
                $match: {
                    status: 'delivered',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $addFields: { 
                    _period: { $literal: period }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: period === 'day' ? '%Y-%m-%d' :
                                    period === 'month' ? '%Y-%m' :
                                    '%Y',
                            date: '$createdAt'
                        }
                    },
                    revenue: { $sum: '$totalPrice' },
                    orderCount: { $sum: 1 },
                    _period: { $first: '$_period' }
                }
            },
            {
                $project: {
                    _id: 0,
                    revenue: 1,
                    orderCount: 1,
                    date: {
                        $let: {
                            vars: {
                                period: '$_period',
                                id: '$_id'
                            },
                            in: {
                                $switch: {
                                    branches: [
                                        {
                                            case: { $eq: ['$$period', 'day'] },
                                            then: {
                                                $concat: [
                                                    { $substr: ['$$id', 8, 2] }, '/',
                                                    { $substr: ['$$id', 5, 2] }, '/',
                                                    { $substr: ['$$id', 0, 4] }
                                                ]
                                            }
                                        },
                                        {
                                            case: { $eq: ['$$period', 'month'] },
                                            then: {
                                                $concat: [
                                                    { $substr: ['$$id', 5, 2] }, '/',
                                                    { $substr: ['$$id', 0, 4] }
                                                ]
                                            }
                                        },
                                        {
                                            case: { $eq: ['$$period', 'year'] },
                                            then: '$$id'
                                        }
                                    ],
                                    default: '$$id'
                                }
                            }
                        }
                    }
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);

        // Format lại date theo period - Đồng bộ với frontend
        const formattedRevenue = revenue.map(item => {
            let date = item.date;
            if (period === 'day') {
                // Đảm bảo format DD/MM/YYYY cho ngày
                const parts = date.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    date = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
                }
            } else if (period === 'month') {
                // Đảm bảo format MM/YYYY cho tháng
                const parts = date.split('/');
                if (parts.length === 2) {
                    const [month, year] = parts;
                    date = `${month.padStart(2, '0')}/${year}`;
                }
            } else if (period === 'year') {
                // Đảm bảo format YYYY cho năm
                date = date.toString();
            }
            return {
                ...item,
                date
            };
        });



        const data = {
            revenue: formattedRevenue,
            lastUpdated: new Date()
        };

        // Cache kết quả (1 phút cho tất cả period để đảm bảo dữ liệu mới nhất)
        if (redis) {
            const cacheKey = `revenue_data:${period}:${limit}`;
            const cacheTime = 60; // 1 phút cho tất cả period
            await redis.set(cacheKey, JSON.stringify(data), 'EX', cacheTime);
        }

        res.json({
            success: true,
            data,
            message: 'Revenue data retrieved successfully'
        });
    } catch (error) {
        logError(`[${requestId}] Error getting revenue data: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting revenue data',
            error: error.message
        });
    }
};

// Get Recent Orders
export const getRecentOrders = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {

        // Tối ưu query với lean() và select()
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(2) // Chỉ lấy 2 đơn hàng gần nhất
            .populate('user', 'fullname email')
            .select('shortId user totalPrice status createdAt shippingAddress statusHistory')
            .lean();

        // Điểm xuất phát cố định
        const originAddress = "VJUSPORT, đường Lưu Hữu Phước, Cầu Diễn, Nam Từ Liêm, Hà Nội";

        // Format dữ liệu
        const formattedOrders = orders.map(order => {
            // Tạo địa chỉ đích từ shippingAddress
            let destinationAddress = "Không có thông tin";
            if (order.shippingAddress && order.shippingAddress.address) {
                const { province, district, ward, street } = order.shippingAddress.address;
                destinationAddress = `${street ? street + ', ' : ''}${ward.name}, ${district.name}, ${province.name}`;
            }

            // Xác định tiến độ dựa trên trạng thái
            let progress = 0;
            switch (order.status) {
                case 'pending':
                    progress = 0;
                    break;
                case 'confirmed':
                    progress = 25;
                    break;
                case 'shipped':
                    progress = 50;
                    break;
                case 'delivered':
                    progress = 100;
                    break;
                case 'cancelled':
                    progress = 0;
                    break;
                default:
                    progress = 0;
            }

            return {
                _id: order._id,
                orderNumber: order.shortId,
                customerName: order.user?.fullname || 'Unknown',
                customerEmail: order.user?.email || 'Unknown',
                total: order.totalPrice,
                status: order.status,
                progress: progress,
                createdAt: order.createdAt,
                originAddress,
                destinationAddress,
                statusHistory: order.statusHistory || []
            };
        });

        const data = {
            orders: formattedOrders,
            pagination: {
                totalPages: 1,
                totalOrders: formattedOrders.length,
                hasMore: false
            }
        };


        res.json({
            success: true,
            data,
            message: 'Recent orders retrieved successfully'
        });
    } catch (error) {
        logError(`[${requestId}] Error getting recent orders: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting recent orders',
            error: error.message
        });
    }
};

// Get Best Selling Products
export const getBestSellingProducts = async (req, res) => {
    const requestId = req.id || 'unknown';
    const { limit = 6, days = 30 } = req.query;
    
    try {
        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = `best_selling_products:${limit}:${days}`;
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        }

        const cacheKey = `best_selling_products:${limit}:${days}`;

        // Luôn xóa cache cũ để đảm bảo dữ liệu mới nhất
        if (redis) {
            await redis.del(cacheKey);
        }

        const currentPeriodStart = new Date();
        currentPeriodStart.setDate(currentPeriodStart.getDate() - parseInt(days));

        const previousPeriodStart = new Date(currentPeriodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(days));

        // Lấy tất cả sản phẩm trước
        const allProducts = await Product.find()
            .select('name mainImage categoryId soldCount salePrice brand sku')
            .populate('categoryId', 'name')
            .lean();

        // Lấy dữ liệu cho kỳ hiện tại và kỳ trước
        const [currentDelivered, currentCancelled, previousDelivered, previousCancelled] = await Promise.all([
            // Kỳ hiện tại - đơn đã giao
            Order.aggregate([
                {
                    $match: {
                        status: 'delivered',
                        createdAt: { $gte: currentPeriodStart }
                    }
                },
                {
                    $unwind: '$items'
                },
                {
                    $group: {
                        _id: '$items.product',
                        totalSold: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                }
            ]).exec(),
            // Kỳ hiện tại - đơn đã hủy
            Order.aggregate([
                {
                    $match: {
                        status: 'cancelled',
                        createdAt: { $gte: currentPeriodStart }
                    }
                },
                {
                    $unwind: '$items'
                },
                {
                    $group: {
                        _id: '$items.product',
                        totalCancelled: { $sum: '$items.quantity' }
                    }
                }
            ]).exec(),
            // Kỳ trước - đơn đã giao
            Order.aggregate([
                {
                    $match: {
                        status: 'delivered',
                        createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart }
                    }
                },
                {
                    $unwind: '$items'
                },
                {
                    $group: {
                        _id: '$items.product',
                        totalSold: { $sum: '$items.quantity' }
                    }
                }
            ]).exec(),
            // Kỳ trước - đơn đã hủy
            Order.aggregate([
                {
                    $match: {
                        status: 'cancelled',
                        createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart }
                    }
                },
                {
                    $unwind: '$items'
                },
                {
                    $group: {
                        _id: '$items.product',
                        totalCancelled: { $sum: '$items.quantity' }
                    }
                }
            ]).exec(),
        ]);



        // Tính % tăng trưởng
        const calculateGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const bestSellingProducts = allProducts.map(product => {
            // Tính số lượng bán kỳ hiện tại
            const currentDeliveredStats = currentDelivered.find(
                p => p._id.toString() === product._id.toString()
            ) || { totalSold: 0 };
            const currentCancelledStats = currentCancelled.find(
                p => p._id.toString() === product._id.toString()
            ) || { totalCancelled: 0 };
            const currentTotalSold = (currentDeliveredStats.totalSold || 0) - (currentCancelledStats.totalCancelled || 0);

            // Tính số lượng bán kỳ trước
            const previousDeliveredStats = previousDelivered.find(
                p => p._id.toString() === product._id.toString()
            ) || { totalSold: 0 };
            const previousCancelledStats = previousCancelled.find(
                p => p._id.toString() === product._id.toString()
            ) || { totalCancelled: 0 };
            const previousTotalSold = (previousDeliveredStats.totalSold || 0) - (previousCancelledStats.totalCancelled || 0);



            // Tính % tăng trưởng
            const growthRate = calculateGrowth(currentTotalSold, previousTotalSold);

            return {
                _id: product._id.toString(),
                name: product.name,
                image: product.mainImage,
                category: product.categoryId?.name || 'Unknown Category',
                sku: product.sku || '',
                totalSales: currentTotalSold,
                growthRate: Math.round(growthRate * 100) / 100 // Làm tròn đến 2 chữ số thập phân
            };
        });

        // Sắp xếp theo số lượng bán và giới hạn kết quả
        bestSellingProducts.sort((a, b) => b.totalSales - a.totalSales);
        const limitedProducts = bestSellingProducts.slice(0, parseInt(limit));

        const data = {
            success: true,
            data: {
                products: limitedProducts
            },
            message: 'Best selling products retrieved successfully'
        };

        // Cache kết quả (1 phút)
        if (redis) {
            await redis.set(cacheKey, JSON.stringify(data), 'EX', 60); // Giảm thời gian cache xuống 1 phút
        }
        res.json(data);
    } catch (error) {
        logError(`[${requestId}] Error getting best selling products: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        res.status(500).json({ 
            success: false,
            message: 'Error getting best selling products',
            error: error.message
        });
    }
};

// Thống kê sản phẩm theo danh mục
export const getProductStatsByCategory = async (req, res) => {
    try {
        const requestId = req.id || uuidv4();
        logInfo(`[${requestId}] Bắt đầu xử lý thống kê sản phẩm theo danh mục`);

        const stats = await Product.aggregate([
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
        ]);

        logInfo(`[${requestId}] Thống kê sản phẩm theo danh mục thành công`);
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        const requestId = req.id || uuidv4();
        logError(`[${requestId}] Lỗi khi thống kê sản phẩm theo danh mục: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getDashboardStats = async () => {
    // ... giữ nguyên code, không khai báo req, res, requestId, query, error nếu không dùng ...
    // ... existing code ...
};

// Xóa cache
export const clearCache = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Clearing dashboard cache`);
        
        const redis = getRedisClient();
        if (!redis) {
            logInfo(`[${requestId}] Redis client not available`);
            return res.json({
                success: true,
                message: 'Redis client not available',
                clearedKeys: {
                    dashboard: 0,
                    revenue: 0,
                    orders: 0,
                    products: 0
                }
            });
        }

        // Xóa tất cả các key liên quan đến dashboard
        const dashboardKeys = await redis.keys('dashboard_*');
        if (dashboardKeys.length > 0) {
            await redis.del(dashboardKeys);
            logInfo(`[${requestId}] Cleared dashboard keys: ${dashboardKeys.join(', ')}`);
        }

        // Xóa tất cả các key liên quan đến revenue
        const revenueKeys = await redis.keys('revenue_*');
        if (revenueKeys.length > 0) {
            await redis.del(revenueKeys);
            logInfo(`[${requestId}] Cleared revenue keys: ${revenueKeys.join(', ')}`);
        }

        // Xóa tất cả các key liên quan đến recent orders
        const orderKeys = await redis.keys('recent_orders_*');
        if (orderKeys.length > 0) {
            await redis.del(orderKeys);
            logInfo(`[${requestId}] Cleared order keys: ${orderKeys.join(', ')}`);
        }

        // Xóa tất cả các key liên quan đến best selling products
        const productKeys = await redis.keys('best_selling_products_*');
        if (productKeys.length > 0) {
            await redis.del(productKeys);
            logInfo(`[${requestId}] Cleared product keys: ${productKeys.join(', ')}`);
        }

        logInfo(`[${requestId}] Successfully cleared all dashboard cache`);
        res.json({
            success: true,
            message: 'Cache cleared successfully',
            clearedKeys: {
                dashboard: dashboardKeys.length,
                revenue: revenueKeys.length,
                orders: orderKeys.length,
                products: productKeys.length
            }
        });
    } catch (error) {
        logError(`[${requestId}] Error clearing cache: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Error clearing cache',
            error: error.message
        });
    }
};