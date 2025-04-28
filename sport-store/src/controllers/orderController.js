import mongoose from "mongoose";
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/product.js';
import stripe from "stripe";
import getExchangeRate from "../utils/exchangeRate.js";
import { nanoid } from "nanoid";
import { logInfo, logError } from "../utils/logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ORDER_STATUS, PAYMENT_METHODS, SHIPPING_METHODS, SHIPPING_FEES } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";
import { Coupon } from "../models/coupon.js";
import { getRedisClient } from '../config/redis.js';

const stripeInstance = stripe(env.STRIPE_SECRET_KEY);

// Helper functions
const validateShippingAddress = (shippingAddress) => {
    const requiredFields = [
        'fullName', 
        'address', 
        'city', 
        'district',
        'ward',
        'postalCode'
    ];
    
    for (const field of requiredFields) {
        if (!shippingAddress[field]) {
            throw new Error(`Thông tin ${field} không được để trống trong địa chỉ giao hàng`);
        }
    }
};

const validateShippingMethod = (shippingMethod) => {
    const requiredFields = ['method', 'expectedDate', 'courier', 'trackingId'];
    for (const field of requiredFields) {
        if (!shippingMethod[field]) {
            throw new Error(`Thông tin ${field} không được để trống trong phương thức vận chuyển`);
        }
    }
};

const validatePhone = (phone) => {
    const normalizedPhone = phone.replace(/\s+/g, "").trim();
    if (!normalizedPhone.match(/^0[0-9]{9}$/)) {
        throw new Error(ERROR_MESSAGES.INVALID_PHONE);
    }
    return normalizedPhone;
};

const calculateOrderTotal = (items, shippingFee) => {
    const subtotal = items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return total + (price * quantity);
    }, 0);
    return subtotal + shippingFee;
};

// Helper function để xóa cache
const clearDashboardCache = async (requestId) => {
    try {
        const redis = getRedisClient();
        if (redis) {
            // Xóa tất cả các key liên quan đến dashboard
            const dashboardKeys = await redis.keys('dashboard_*');
            if (dashboardKeys.length > 0) {
                await redis.del(dashboardKeys);
                logInfo(`[${requestId}] Dashboard cache cleared: ${dashboardKeys.join(', ')}`);
            }

            // Xóa tất cả các key liên quan đến revenue
            const revenueKeys = await redis.keys('revenue_*');
            if (revenueKeys.length > 0) {
                await redis.del(revenueKeys);
                logInfo(`[${requestId}] Revenue cache cleared: ${revenueKeys.join(', ')}`);
            }

            // Xóa tất cả các key liên quan đến recent orders
            const orderKeys = await redis.keys('recent_orders_*');
            if (orderKeys.length > 0) {
                await redis.del(orderKeys);
                logInfo(`[${requestId}] Orders cache cleared: ${orderKeys.join(', ')}`);
            }
        }
    } catch (error) {
        logError(`[${requestId}] Error clearing cache: ${error.message}`);
    }
};

// Hàm xóa cache
const clearOrderCache = async (requestId) => {
  try {
    const redis = getRedisClient();
    if (redis) {
      // Xóa cache recent orders
      const keys = await redis.keys('recent_orders:*');
      if (keys.length > 0) {
        await redis.del(keys);
        logInfo(`[${requestId}] Cleared ${keys.length} recent orders cache keys`);
      }

      // Xóa cache dashboard stats
      const dashboardKeys = await redis.keys('dashboard_stats:*');
      if (dashboardKeys.length > 0) {
        await redis.del(dashboardKeys);
        logInfo(`[${requestId}] Cleared ${dashboardKeys.length} dashboard stats cache keys`);
      }

      // Xóa cache revenue
      const revenueKeys = await redis.keys('revenue_data:*');
      if (revenueKeys.length > 0) {
        await redis.del(revenueKeys);
        logInfo(`[${requestId}] Cleared ${revenueKeys.length} revenue cache keys`);
      }

      // Xóa cache best selling products
      const productKeys = await redis.keys('best_selling_products:*');
      if (productKeys.length > 0) {
        await redis.del(productKeys);
        logInfo(`[${requestId}] Cleared ${productKeys.length} best selling products cache keys`);
      }

      // Xóa tất cả các key liên quan đến dashboard
      const allDashboardKeys = await redis.keys('dashboard:*');
      if (allDashboardKeys.length > 0) {
        await redis.del(allDashboardKeys);
        logInfo(`[${requestId}] Cleared ${allDashboardKeys.length} dashboard cache keys`);
      }
    }
  } catch (error) {
    logError(`[${requestId}] Error clearing cache: ${error.message}`);
  }
};

// Controllers
export const createOrder = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { items, shippingAddress, paymentMethod, couponCode, shippingMethod } = req.body;
        const userId = req.user._id;

        // Validate items
        if (!items || items.length === 0) {
            logError(`[${requestId}] Order items are required`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_ITEMS_REQUIRED
            });
        }

        // Validate shipping address
        if (!shippingAddress || 
            !shippingAddress.fullName || !shippingAddress.phone ||
            !shippingAddress.address || 
            !shippingAddress.address.province || !shippingAddress.address.province.name || !shippingAddress.address.province.code ||
            !shippingAddress.address.district || !shippingAddress.address.district.name || !shippingAddress.address.district.code ||
            !shippingAddress.address.ward || !shippingAddress.address.ward.name || !shippingAddress.address.ward.code) {
            logError(`[${requestId}] Invalid shipping address`);
            return res.status(400).json({
                success: false,
                message: "Thông tin địa chỉ giao hàng không hợp lệ"
            });
        }

        // Validate shipping method
        if (!Object.values(SHIPPING_METHODS).includes(shippingMethod)) {
            logError(`[${requestId}] Invalid shipping method: ${shippingMethod}`);
            return res.status(400).json({
                success: false,
                message: "Phương thức vận chuyển không hợp lệ"
            });
        }

        // Calculate total and validate stock
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            // Tìm sản phẩm theo SKU
            const product = await Product.findOne({ sku: item.sku });
            
            if (!product) {
                logError(`[${requestId}] Product not found with SKU: ${item.sku}`);
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
                });
            }

            // Validate color and size
            if (item.color && !product.colors.includes(item.color)) {
                return res.status(400).json({
                    success: false,
                    message: `Màu sắc ${item.color} không có sẵn cho sản phẩm này`
                });
            }

            if (item.size && !product.sizes.includes(item.size)) {
                return res.status(400).json({
                    success: false,
                    message: `Kích thước ${item.size} không có sẵn cho sản phẩm này`
                });
            }

            if (product.stock < item.quantity) {
                logError(`[${requestId}] Insufficient stock for product: ${product.name}`);
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INSUFFICIENT_STOCK
                });
            }

            // Sử dụng salePrice nếu có, ngược lại dùng originalPrice
            const price = product.salePrice > 0 ? product.salePrice : product.originalPrice;
            subtotal += price * item.quantity;

            orderItems.push({
                product: product._id,
                quantity: item.quantity,
                price: price,
                name: product.name,
                sku: product.sku,
                color: item.color,
                size: item.size
            });
        }

        // Tính phí vận chuyển
        const shippingFee = SHIPPING_FEES[shippingMethod];
        
        // Lưu subtotal gốc (chưa bao gồm phí vận chuyển) để tính giảm giá
        const productSubtotal = subtotal;
        
        // Cộng phí vận chuyển vào subtotal
        subtotal += shippingFee;

        // Xử lý mã giảm giá nếu có
        let discountAmount = 0;
        let appliedCoupon = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            
            if (!coupon) {
                return res.status(400).json({
                    success: false,
                    message: "Mã giảm giá không tồn tại"
                });
            }

            // Kiểm tra trạng thái coupon
            if (coupon.status !== "Hoạt động") {
                return res.status(400).json({
                    success: false,
                    message: "Mã giảm giá không còn hoạt động"
                });
            }

            // Kiểm tra thời hạn sử dụng
            const now = new Date();
            if (now < coupon.startDate) {
                return res.status(400).json({
                    success: false,
                    message: `Mã giảm giá sẽ có hiệu lực từ ${new Date(coupon.startDate).toLocaleString('vi-VN')}`
                });
            }
            if (now > coupon.endDate) {
                return res.status(400).json({
                    success: false,
                    message: `Mã giảm giá đã hết hạn từ ${new Date(coupon.endDate).toLocaleString('vi-VN')}`
                });
            }

            // Kiểm tra số lần sử dụng
            const userUsageCount = coupon.usedBy.filter(usage => 
                usage.user.toString() === userId.toString()
            ).length;
            
            if (userUsageCount >= coupon.userLimit) {
                return res.status(400).json({
                    success: false,
                    message: "Bạn đã sử dụng hết lượt cho mã giảm giá này"
                });
            }

            // Kiểm tra giá trị đơn hàng tối thiểu (chỉ tính theo giá sản phẩm, chưa bao gồm phí vận chuyển)
            if (productSubtotal < coupon.minimumPurchaseAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Đơn hàng cần tối thiểu ${coupon.minimumPurchaseAmount.toLocaleString('vi-VN')}đ để áp dụng mã giảm giá này`
                });
            }

            // Tính giá trị giảm giá (chỉ áp dụng cho giá sản phẩm, không áp dụng cho phí vận chuyển)
            if (coupon.type === "percentage") {
                discountAmount = (productSubtotal * coupon.value) / 100;
            } else if (coupon.type === "fixed") {
                discountAmount = coupon.value;
            }

            try {
                // Cập nhật coupon với thông tin sử dụng mới
                await Coupon.findByIdAndUpdate(coupon._id, {
                    $inc: { usageCount: 1 },
                    $push: {
                        usedBy: {
                            user: userId,
                            usedAt: new Date()
                        }
                    }
                });
                
                // Lưu thông tin coupon đã áp dụng
                appliedCoupon = {
                    ...coupon.toObject(),
                    discountAmount
                };
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        }

        // Tính tổng tiền cuối cùng
        // Tổng tiền = (Giá sản phẩm - Giảm giá) + Phí vận chuyển
        const total = (productSubtotal - discountAmount) + shippingFee;

        // Tìm user theo số điện thoại nếu có
        let orderUser = userId;
        if (shippingAddress.phone) {
            const userByPhone = await User.findOne({ phone: shippingAddress.phone });
            if (userByPhone) {
                orderUser = userByPhone._id;
            }
        }

        // Tạo mã đơn hàng duy nhất
        let shortId;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        // Lấy ngày giờ hiện tại theo múi giờ Việt Nam (UTC+7)
        const now = new Date();
        const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        
        // Format ngày tháng năm: DDMMYY
        const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
        const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
        const year = String(vietnamTime.getUTCFullYear()).slice(-2);
        const dateStr = `${day}${month}${year}`;

        while (!isUnique && attempts < maxAttempts) {
            // Tạo chuỗi ngẫu nhiên 5 ký tự (số và chữ in hoa)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let randomStr = '';
            for (let i = 0; i < 5; i++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            // Kết hợp thành mã đơn hàng: VJUSPORTORDER-YYYYYY-XXXXX
            shortId = `VJUSPORTORDER-${dateStr}-${randomStr}`;
            
            const existingOrder = await Order.findOne({ shortId });
            if (!existingOrder) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            logError(`[${requestId}] Failed to generate unique order ID after ${maxAttempts} attempts`);
            return res.status(500).json({
                success: false,
                message: "Không thể tạo mã đơn hàng duy nhất. Vui lòng thử lại sau."
            });
        }

        // Create order
        const order = new Order({
            user: orderUser,
            shortId: shortId,
            items: orderItems,
            totalPrice: total,
            shippingAddress: {
                fullName: shippingAddress.fullName,
                phone: shippingAddress.phone,
                address: {
                    province: {
                        name: shippingAddress.address.province.name,
                        code: shippingAddress.address.province.code
                    },
                    district: {
                        name: shippingAddress.address.district.name,
                        code: shippingAddress.address.district.code
                    },
                    ward: {
                        name: shippingAddress.address.ward.name,
                        code: shippingAddress.address.ward.code
                    },
                    street: shippingAddress.address.street || ''
                }
            },
            paymentMethod,
            shippingMethod: {
                method: shippingMethod,
                fee: shippingFee
            },
            status: ORDER_STATUS.PENDING,
            coupon: appliedCoupon
        });

        const savedOrder = await order.save();

        // Update product stock
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }

        // Xóa cache sau khi tạo đơn hàng mới
        await clearDashboardCache(requestId);

        logInfo(`[${requestId}] Successfully created order: ${savedOrder._id}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.ORDER_CREATED,
            data: savedOrder
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getMyOrders = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const userId = req.user._id;
        logInfo(`[${requestId}] Fetching orders for user: ${userId}`);

        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .sort({ createdAt: -1 })
            .lean();

        logInfo(`[${requestId}] Successfully fetched ${orders.length} orders for user: ${userId}`);
        res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getMyOrderById = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { id } = req.params;
        const userId = req.user._id;

        logInfo(`[${requestId}] Fetching order ${id} for user: ${userId}`);

        const order = await Order.findOne({ _id: id, user: userId })
            .populate('items.product')
            .lean();

        if (!order) {
            logError(`[${requestId}] Order not found: ${id}`);
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn hàng"
            });
        }

        logInfo(`[${requestId}] Successfully fetched order: ${id}`);
        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const cancelOrder = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!order) {
            logError(`[${requestId}] Order not found: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }

        if (order.status !== ORDER_STATUS.PENDING) {
            logError(`[${requestId}] Order cannot be cancelled: ${order._id}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_CANNOT_CANCEL
            });
        }

        // Restore product stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: item.quantity }
            });
        }

        // Nếu đơn hàng có sử dụng coupon, hoàn lại usageLimit và userLimit
        if (order.coupon) {
            const coupon = await Coupon.findOne({ code: order.coupon.code });
            if (coupon) {
                // Hoàn lại usageCount, userUsageCount và tăng usageLimit
                await Coupon.findByIdAndUpdate(coupon._id, {
                    $inc: { 
                        usageCount: -1,
                        usageLimit: 1,
                        [`userUsageCount.${order.user}`]: -1
                    }
                });
            }
        }

        order.status = ORDER_STATUS.CANCELLED;
        await order.save();

        // Xóa cache sau khi hủy đơn hàng
        await clearDashboardCache(requestId);

        logInfo(`[${requestId}] Successfully cancelled order: ${order._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDER_CANCELLED,
            data: order
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getAllOrders = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { userId } = req.query;
        const query = userId ? { user: userId } : {};

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('user', 'email username')
            .populate('items.product', 'name price image')
            .lean();

        logInfo(`[${requestId}] Successfully retrieved all orders`);
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getOrderById = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate('user', 'username email fullname phone customId')
            .populate('items.product', 'name price mainImage')
            .lean();

        if (!order) {
            logError(`[${requestId}] Order not found: ${id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Successfully retrieved order: ${id}`);
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateOrderStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { status, note } = req.body;
        const orderId = req.params.id;
        const userId = req.user._id;

        if (!Object.values(ORDER_STATUS).includes(status)) {
            logError(`[${requestId}] Invalid order status: ${status}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_ORDER_STATUS
            });
        }

        // Kiểm tra xem id có phải là ObjectId hợp lệ không
        const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
        
        // Tìm kiếm đơn hàng bằng _id hoặc shortId
        const order = isObjectId 
            ? await Order.findById(orderId)
            : await Order.findOne({ shortId: orderId });

        if (!order) {
            logError(`[${requestId}] Order not found: ${orderId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }

        // Kiểm tra quy trình trạng thái đơn hàng
        const currentStatus = order.status;
        const newStatus = status;

        // Kiểm tra xem có thể chuyển từ trạng thái hiện tại sang trạng thái mới không
        const validTransitions = {
            [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.DELIVERED]: [], // Không thể chuyển từ DELIVERED sang trạng thái khác
            [ORDER_STATUS.CANCELLED]: [] // Không thể chuyển từ CANCELLED sang trạng thái khác
        };

        if (!validTransitions[currentStatus].includes(newStatus)) {
            logError(`[${requestId}] Invalid status transition from ${currentStatus} to ${newStatus}`);
            return res.status(400).json({
                success: false,
                message: `Không thể chuyển đơn hàng từ trạng thái "${currentStatus}" sang trạng thái "${newStatus}"`
            });
        }

        // Cập nhật trạng thái đơn hàng
        order.status = newStatus;

        // Nếu đơn hàng chuyển sang trạng thái DELIVERED, cập nhật orderCount và totalSpent của user
        if (newStatus === ORDER_STATUS.DELIVERED && currentStatus !== ORDER_STATUS.DELIVERED) {
            // Cập nhật orderCount và totalSpent của user
            await User.findByIdAndUpdate(order.user, {
                $inc: { 
                    orderCount: 1,
                    totalSpent: order.totalPrice
                }
            });

            // Cập nhật stock của sản phẩm
            for (const item of order.items) {
                await Product.findOneAndUpdate(
                    { sku: item.sku },
                    { $inc: { stock: -item.quantity } }
                );
            }
        }
        
        // Nếu đơn hàng bị hủy, hoàn lại stock
        if (newStatus === ORDER_STATUS.CANCELLED && currentStatus !== ORDER_STATUS.CANCELLED) {
            // Hoàn lại stock cho tất cả các sản phẩm
            for (const item of order.items) {
                await Product.findOneAndUpdate(
                    { sku: item.sku },
                    { $inc: { stock: item.quantity } }
                );
            }

            // Chỉ hoàn lại usageLimit và userLimit khi hủy đơn ở trạng thái PENDING
            if (currentStatus === ORDER_STATUS.PENDING && order.coupon) {
                const coupon = await Coupon.findOne({ code: order.coupon.code });
                if (coupon) {
                    // Hoàn lại usageCount, userUsageCount và tăng usageLimit
                    await Coupon.findByIdAndUpdate(coupon._id, {
                        $inc: { 
                            usageCount: -1,
                            usageLimit: 1,
                            [`userUsageCount.${order.user}`]: -1
                        }
                    });
                }
            }
        }
        
        // Thêm vào lịch sử trạng thái
        order.statusHistory.push({
            status: newStatus,
            updatedAt: new Date(), // Tự động lưu theo giờ Việt Nam
            updatedBy: userId,
            note: note || ''
        });
        
        await order.save();

        // Xóa cache sau khi cập nhật trạng thái đơn hàng
        await clearDashboardCache(requestId);

        logInfo(`[${requestId}] Successfully updated order status: ${order._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDER_STATUS_UPDATED,
            data: order
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateOrderPayment = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { paymentMethod, paymentStatus } = req.body;
        const orderId = req.params.id;

        if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
            logError(`[${requestId}] Invalid payment method: ${paymentMethod}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_PAYMENT_METHOD
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            logError(`[${requestId}] Order not found: ${orderId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }

        order.paymentMethod = paymentMethod;
        order.paymentStatus = paymentStatus;
        await order.save();

        // Xóa cache sau khi cập nhật trạng thái thanh toán
        await clearDashboardCache(requestId);

        logInfo(`[${requestId}] Successfully updated order payment: ${order._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDER_PAYMENT_UPDATED,
            data: order
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const deleteOrder = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const orderId = req.params.id;

        // Kiểm tra xem id có phải là ObjectId hợp lệ không
        const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
        
        // Tìm kiếm đơn hàng bằng _id hoặc shortId
        const order = isObjectId 
            ? await Order.findById(orderId)
            : await Order.findOne({ shortId: orderId });

        if (!order) {
            logError(`[${requestId}] Order not found: ${orderId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }

        // Restore product stock if order is pending
        if (order.status === ORDER_STATUS.PENDING) {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity }
                });
            }
        }

        await order.deleteOne();

        // Xóa cache sau khi xóa đơn hàng
        await clearOrderCache(requestId);

        logInfo(`[${requestId}] Successfully deleted order: ${orderId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDER_DELETED
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const stripeWebhook = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        try {
            event = stripeInstance.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            logError(`[${requestId}] Webhook signature verification failed:`, err);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata.orderId;

                logInfo(`[${requestId}] Processing successful payment for order: ${orderId}`);

                const order = await Order.findById(orderId);
                if (order) {
                    order.paymentStatus = 'paid';
                    await order.save();
                    logInfo(`[${requestId}] Updated payment status for order: ${orderId}`);
                }
                break;
            default:
                logInfo(`[${requestId}] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getOrdersByPhone = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { phone } = req.params;

        logInfo(`[${requestId}] Fetching orders by phone: ${phone}`);

        try {
            validatePhone(phone);
        } catch (error) {
            logError(`[${requestId}] Invalid phone number: ${phone}`);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        const orders = await Order.find({ 'shippingAddress.phone': phone })
            .sort({ createdAt: -1 })
            .lean();

        logInfo(`[${requestId}] Successfully fetched ${orders.length} orders for phone: ${phone}`);
        res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getRecentOrders = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const limit = parseInt(req.query.limit) || 5;

        logInfo(`[${requestId}] Fetching ${limit} recent orders`);
        
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        logInfo(`[${requestId}] Successfully fetched ${orders.length} recent orders`);
        res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getStats = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Fetching order statistics`);
        
        const [
            totalOrders,
            totalRevenue,
            pendingOrders,
            completedOrders,
            cancelledOrders
        ] = await Promise.all([
            Order.countDocuments(),
            Order.aggregate([
                { $match: { status: ORDER_STATUS.COMPLETED } },
                { $group: { _id: null, total: { $sum: "$totalPrice" } } }
            ]),
            Order.countDocuments({ status: ORDER_STATUS.PENDING }),
            Order.countDocuments({ status: ORDER_STATUS.COMPLETED }),
            Order.countDocuments({ status: ORDER_STATUS.CANCELLED })
        ]);

        const stats = {
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            pendingOrders,
            completedOrders,
            cancelledOrders,
            completionRate: totalOrders ? (completedOrders / totalOrders) * 100 : 0
        };

        logInfo(`[${requestId}] Successfully fetched order statistics`);
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getAdminOrders = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Xây dựng query
        const query = {};
        if (status) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Lấy tổng số đơn hàng
        const totalOrders = await Order.countDocuments(query);

        // Lấy danh sách đơn hàng với phân trang
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user', 'name email')
            .lean();

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalOrders / parseInt(limit));
        const hasMore = parseInt(page) < totalPages;

        logInfo(`[${requestId}] Successfully fetched admin orders`);
        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalOrders,
                    hasMore
                }
            }
        });
    } catch (error) {
        logError(`[${requestId}] Error fetching admin orders: ${error.message}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};

export const bulkDeleteOrders = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            logError(`[${requestId}] Invalid orderIds: ${JSON.stringify(orderIds)}`);
            return res.status(400).json({
                success: false,
                message: "Danh sách đơn hàng không hợp lệ"
            });
        }

        // Tìm tất cả đơn hàng cần xóa
        const orders = await Order.find({
            $or: [
                { _id: { $in: orderIds } },
                { shortId: { $in: orderIds } }
            ]
        });

        if (orders.length === 0) {
            logError(`[${requestId}] No orders found to delete`);
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đơn hàng nào để xóa"
            });
        }

        // Khôi phục số lượng sản phẩm cho các đơn hàng đang chờ xác nhận
        for (const order of orders) {
            if (order.status === ORDER_STATUS.PENDING) {
                for (const item of order.items) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: item.quantity }
                    });
                }
            }
        }

        // Xóa tất cả đơn hàng
        await Order.deleteMany({
            $or: [
                { _id: { $in: orderIds } },
                { shortId: { $in: orderIds } }
            ]
        });

        // Xóa cache sau khi xóa đơn hàng
        await clearOrderCache(requestId);

        logInfo(`[${requestId}] Successfully deleted ${orders.length} orders`);
        res.json({
            success: true,
            message: `Đã xóa thành công ${orders.length} đơn hàng`
        });
    } catch (error) {
        logError(`[${requestId}] Error deleting orders: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa đơn hàng"
        });
    }
};