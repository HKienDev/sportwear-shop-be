import Order from "../models/Order.js";
import Product from "../models/product.js";
import User from "../models/User.js";
import { getRedisClient } from '../config/redis.js';
import { logInfo, logError } from '../utils/logger.js';
import { handleError } from '../utils/helpers.js';
import { v4 as uuidv4 } from 'uuid';

// Hàm xóa cache dashboard
export const clearDashboardCache = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Clearing dashboard cache`);
        
        const redis = getRedisClient();
        if (!redis) {
            logInfo(`[${requestId}] Redis client not available`);
            return res.json({
                success: true,
                message: 'Redis client not available',
                clearedKeys: 0
            });
        }

        const cacheKey = 'dashboard_stats';
        await redis.del(cacheKey);
        logInfo(`[${requestId}] Dashboard cache cleared successfully`);
        
        res.json({
            success: true,
            message: 'Dashboard cache cleared successfully',
            clearedKeys: 1
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
        logInfo(`[${requestId}] Fetching dashboard stats`);

        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = 'dashboard_stats';
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                logInfo(`[${requestId}] Returning cached dashboard stats`);
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
            // Tính tổng doanh thu từ đơn hàng đã giao
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

        logInfo(`[${requestId}] Successfully fetched dashboard stats`);
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
        logInfo(`[${requestId}] Fetching revenue data for period: ${period}, limit: ${limit}`);

        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = `revenue_data:${period}:${limit}`;
            logInfo(`[${requestId}] Checking cache with key: ${cacheKey}`);
            const cachedData = await redis.get(cacheKey);
            
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                const lastUpdated = new Date(parsedData.lastUpdated);
                const now = new Date();
                
                // Kiểm tra xem dữ liệu có phải là của ngày hôm nay không
                const isSameDay = lastUpdated.getDate() === now.getDate() &&
                                lastUpdated.getMonth() === now.getMonth() &&
                                lastUpdated.getFullYear() === now.getFullYear();
                
                // Nếu là dữ liệu của ngày hôm nay và không phải period=day, trả về từ cache
                if (isSameDay && period !== 'day') {
                    logInfo(`[${requestId}] Returning cached revenue data for period: ${period}`);
                    
                    // Kiểm tra xem dữ liệu từ cache có đủ số lượng không
                    if (parsedData.revenue && parsedData.revenue.length < parseInt(limit)) {
                        logInfo(`[${requestId}] Cached data has insufficient items, generating missing data`);
                        
                        // Tạo dữ liệu mẫu cho các tháng còn thiếu
                        const today = new Date();
                        const sampleData = [];
                        
                        // Tạo map để theo dõi các ngày/tháng/năm đã có dữ liệu
                        const existingDates = new Set(parsedData.revenue.map(item => item.date));
                        
                        for (let i = 0; i < parseInt(limit); i++) {
                            const date = new Date(today);
                            if (period === 'day') {
                                date.setDate(date.getDate() - i);
                                const day = date.getDate().toString().padStart(2, '0');
                                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                const year = date.getFullYear();
                                const dateStr = `${day}/${month}/${year}`;
                                
                                // Chỉ thêm nếu ngày này chưa có trong parsedData.revenue
                                if (!existingDates.has(dateStr)) {
                                    sampleData.push({
                                        date: dateStr,
                                        revenue: 0,
                                        orderCount: 0
                                    });
                                }
                            } else if (period === 'month') {
                                date.setMonth(date.getMonth() - i);
                                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                const year = date.getFullYear();
                                const dateStr = `${month}/${year}`;
                                
                                // Chỉ thêm nếu tháng này chưa có trong parsedData.revenue
                                if (!existingDates.has(dateStr)) {
                                    sampleData.push({
                                        date: dateStr,
                                        revenue: 0,
                                        orderCount: 0
                                    });
                                }
                            } else if (period === 'year') {
                                date.setFullYear(date.getFullYear() - i);
                                const dateStr = date.getFullYear().toString();
                                
                                // Chỉ thêm nếu năm này chưa có trong parsedData.revenue
                                if (!existingDates.has(dateStr)) {
                                    sampleData.push({
                                        date: dateStr,
                                        revenue: 0,
                                        orderCount: 0
                                    });
                                }
                            }
                        }
                        
                        // Kết hợp dữ liệu mới với dữ liệu hiện có và sắp xếp theo ngày
                        parsedData.revenue.push(...sampleData);
                        parsedData.revenue.sort((a, b) => {
                            if (period === 'day') {
                                const [dayA, monthA, yearA] = a.date.split('/');
                                const [dayB, monthB, yearB] = b.date.split('/');
                                const dateA = new Date(yearA, monthA - 1, dayA);
                                const dateB = new Date(yearB, monthB - 1, dayB);
                                return dateA - dateB;
                            } else if (period === 'month') {
                                const [monthA, yearA] = a.date.split('/');
                                const [monthB, yearB] = b.date.split('/');
                                if (yearA !== yearB) return yearA - yearB;
                                return monthA - monthB;
                            } else {
                                // period === 'year'
                                return a.date - b.date;
                            }
                        });
                    }
                    
                    return res.json({
                        success: true,
                        data: parsedData,
                        message: 'Revenue data retrieved from cache'
                    });
                } else if (!isSameDay || period === 'day') {
                    // Nếu không phải dữ liệu của ngày hôm nay hoặc đang xem theo ngày, xóa cache
                    logInfo(`[${requestId}] Cache outdated or viewing daily data, clearing cache key: ${cacheKey}`);
                    await redis.del(cacheKey);
                }
            }
        }

        const now = new Date();
        let startDate;
        let groupBy;
        let dateFormat;

        switch (period) {
            case 'day':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - parseInt(limit) + 1); // +1 để bao gồm ngày hiện tại
                startDate.setHours(0, 0, 0, 0); // Reset về đầu ngày
                groupBy = {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                    }
                };
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - parseInt(limit));
                groupBy = {
                    $dateToString: {
                        format: "%Y-%m",
                        date: "$createdAt"
                    }
                };
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - parseInt(limit));
                groupBy = {
                    $dateToString: {
                        format: "%Y",
                        date: "$createdAt"
                    }
                };
                break;
            default:
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - parseInt(limit));
                groupBy = {
                    $dateToString: {
                        format: "%Y-%m",
                        date: "$createdAt"
                    }
                };
        }

        // Tối ưu query
        logInfo(`[${requestId}] Start date: ${startDate}`);
        logInfo(`[${requestId}] Period: ${period}`);
        logInfo(`[${requestId}] Limit: ${limit}`);

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

        logInfo(`[${requestId}] Raw revenue data: ${JSON.stringify(revenue)}`);

        // Format lại date theo period
        const formattedRevenue = revenue.map(item => {
            let date = item.date;
            if (period === 'day') {
                // Nếu period là day, đảm bảo date có định dạng DD/MM/YYYY
                const parts = date.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    date = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
                }
            }
            return {
                ...item,
                date
            };
        });

        logInfo(`[${requestId}] Formatted revenue data: ${JSON.stringify(formattedRevenue)}`);

        // Tạo dữ liệu mẫu nếu không có dữ liệu hoặc không đủ số lượng
        if (formattedRevenue.length === 0 || period === 'day' || formattedRevenue.length < parseInt(limit)) {
            logInfo(`[${requestId}] Generating sample data for empty periods`);
            const today = new Date();
            const sampleData = [];
            
            // Tạo map để theo dõi các ngày/tháng/năm đã có dữ liệu
            const existingDates = new Set(formattedRevenue.map(item => item.date));

            for (let i = 0; i < parseInt(limit); i++) {
                const date = new Date(today);
                if (period === 'day') {
                    date.setDate(date.getDate() - i);
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    const dateStr = `${day}/${month}/${year}`;
                    
                    // Chỉ thêm nếu ngày này chưa có trong formattedRevenue
                    if (!existingDates.has(dateStr)) {
                        sampleData.push({
                            date: dateStr,
                            revenue: 0,
                            orderCount: 0
                        });
                    }
                } else if (period === 'month') {
                    date.setMonth(date.getMonth() - i);
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    const dateStr = `${month}/${year}`;
                    
                    // Chỉ thêm nếu tháng này chưa có trong formattedRevenue
                    if (!existingDates.has(dateStr)) {
                        sampleData.push({
                            date: dateStr,
                            revenue: 0,
                            orderCount: 0
                        });
                    }
                } else if (period === 'year') {
                    date.setFullYear(date.getFullYear() - i);
                    const dateStr = date.getFullYear().toString();
                    
                    // Chỉ thêm nếu năm này chưa có trong formattedRevenue
                    if (!existingDates.has(dateStr)) {
                        sampleData.push({
                            date: dateStr,
                            revenue: 0,
                            orderCount: 0
                        });
                    }
                }
            }

            // Kết hợp dữ liệu mới với dữ liệu hiện có và sắp xếp theo ngày
            formattedRevenue.push(...sampleData);
            formattedRevenue.sort((a, b) => {
                if (period === 'day') {
                    const [dayA, monthA, yearA] = a.date.split('/');
                    const [dayB, monthB, yearB] = b.date.split('/');
                    const dateA = new Date(yearA, monthA - 1, dayA);
                    const dateB = new Date(yearB, monthB - 1, dayB);
                    return dateA - dateB;
                } else if (period === 'month') {
                    const [monthA, yearA] = a.date.split('/');
                    const [monthB, yearB] = b.date.split('/');
                    if (yearA !== yearB) return yearA - yearB;
                    return monthA - monthB;
                } else {
                    // period === 'year'
                    return a.date - b.date;
                }
            });
        }

        const data = {
            revenue: formattedRevenue,
            lastUpdated: new Date()
        };

        // Cache kết quả (5 phút cho period khác day, 1 phút cho period=day)
        if (redis) {
            const cacheKey = `revenue_data:${period}:${limit}`;
            const cacheTime = period === 'day' ? 60 : 300; // 1 phút cho day, 5 phút cho các period khác
            await redis.set(cacheKey, JSON.stringify(data), 'EX', cacheTime);
            logInfo(`[${requestId}] Revenue data cached with key: ${cacheKey} for ${cacheTime} seconds`);
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
        logInfo(`[${requestId}] Fetching recent orders`);

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
                totalPages: null,
                totalOrders: formattedOrders.length,
                hasMore: false
            }
        };

        logInfo(`[${requestId}] Successfully fetched ${formattedOrders.length} recent orders`);
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
        logInfo(`[${requestId}] Fetching best selling products for last ${days} days`);

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

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Lấy tất cả sản phẩm trước
        const allProducts = await Product.find()
            .select('name mainImage categoryId soldCount salePrice brand sku')
            .populate('categoryId', 'name')
            .lean();

        // Lấy sản phẩm bán chạy từ đơn hàng đã giao và trừ đi đơn hàng đã hủy
        const [deliveredProducts, cancelledProducts] = await Promise.all([
            // Đếm số lượng bán từ đơn hàng đã giao
            Order.aggregate([
                {
                    $match: {
                        status: 'delivered',
                        createdAt: { $gte: startDate }
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
            // Đếm số lượng bán từ đơn hàng đã hủy để trừ đi
            Order.aggregate([
                {
                    $match: {
                        status: 'cancelled',
                        createdAt: { $gte: startDate }
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
            ]).exec()
        ]);

        // Kết hợp thông tin từ cả hai nguồn và format theo interface DashboardData
        const bestSellingProducts = allProducts.map(product => {
            const deliveredStats = deliveredProducts.find(
                p => p._id.toString() === product._id.toString()
            ) || { totalSold: 0, totalRevenue: 0 };

            const cancelledStats = cancelledProducts.find(
                p => p._id.toString() === product._id.toString()
            ) || { totalCancelled: 0 };

            // Tính tổng số lượng bán = Đơn đã giao - Đơn đã hủy
            const totalSold = (deliveredStats.totalSold || 0) - (cancelledStats.totalCancelled || 0);

            return {
                _id: product._id.toString(),
                name: product.name,
                image: product.mainImage,
                category: product.categoryId?.name || 'Unknown Category',
                sku: product.sku || '',
                totalSales: totalSold
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

        // Cache kết quả (5 phút)
        if (redis) {
            const cacheKey = `best_selling_products:${limit}:${days}`;
            await redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
        }

        logInfo(`[${requestId}] Successfully fetched best selling products`);
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

export const getDashboardStats = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // ... existing code ...
        const query = {}; // Xóa isDeleted: false
        // ... existing code ...
    } catch (error) {
        // ... existing code ...
    }
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