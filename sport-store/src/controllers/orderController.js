import mongoose from "mongoose";
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import stripe from "stripe";
import { nanoid } from "nanoid";
import { logInfo, logError } from "../utils/logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ORDER_STATUS, PAYMENT_METHODS, SHIPPING_METHODS, SHIPPING_FEES, PAYMENT_STATUS } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";
import { Coupon } from "../models/coupon.js";
import { sendEmail } from "../utils/sendEmail.js";
import { clearDashboardCacheUtil } from './dashboardController.js';

const stripeInstance = stripe(env.STRIPE_SECRET_KEY);

// Helper functions
// empty

// Helper function để xóa cache
// empty

// Hàm xóa cache
// empty

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

        // Validate payment method
        if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
            logError(`[${requestId}] Invalid payment method: ${paymentMethod}`);
            return res.status(400).json({
                success: false,
                message: "Phương thức thanh toán không hợp lệ"
            });
        }

        // Calculate total and validate stock
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
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

            // Validate quantity
            if (item.quantity > product.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ${product.name} chỉ còn ${product.quantity} sản phẩm`
                });
            }

            const price = Number(product.price) || 0;
            const quantity = Number(item.quantity) || 0;
            const itemTotal = price * quantity;
            subtotal += itemTotal;

            orderItems.push({
                product: product._id,
                sku: product.sku,
                name: product.name,
                price: price,
                quantity: quantity,
                color: item.color || 'Mặc định',
                size: item.size || 'Mặc định',
                image: product.images && product.images.length > 0 ? product.images[0] : null,
                total: itemTotal
            });
        }

        // Apply shipping fee
        const shippingFee = SHIPPING_FEES[shippingMethod] || 0;
        let totalPrice = Number(subtotal) + Number(shippingFee);

        // Apply coupon if provided
        let couponDiscount = 0;
        let appliedCoupon = null;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            
            if (!coupon) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.COUPON_NOT_FOUND
                });
            }

            if (!coupon.isValid()) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.COUPON_EXPIRED
                });
            }

            couponDiscount = Number(coupon.calculateDiscount(subtotal)) || 0;
            totalPrice = Number(totalPrice) - Number(couponDiscount);
            appliedCoupon = {
                code: coupon.code,
                discount: couponDiscount
            };
        }

        // Create order with initial status
        const initialStatus = paymentMethod === PAYMENT_METHODS.STRIPE ? ORDER_STATUS.PENDING_PAYMENT : ORDER_STATUS.PROCESSING;
        
        const order = new Order({
            user: userId,
            items: orderItems,
            shippingAddress,
            shippingMethod: {
                method: shippingMethod,
                fee: shippingFee,
                expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                courier: 'VJU Express',
                trackingId: nanoid(10).toUpperCase()
            },
            shippingFee,
            subtotal,
            totalPrice,
            paymentMethod,
            coupon: appliedCoupon,
            status: initialStatus,
            paymentStatus: paymentMethod === PAYMENT_METHODS.STRIPE ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PAID,
            payment: {
                amount: totalPrice,
                currency: 'vnd',
                status: paymentMethod === PAYMENT_METHODS.STRIPE ? 'pending' : 'completed',
                method: paymentMethod,
                updatedAt: new Date()
            }
        });

        // Thêm timeout cho việc lưu đơn hàng
        const saveOrderWithTimeout = async () => {
            return Promise.race([
                order.save(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout saving order')), 5000)
                )
            ]);
        };

        try {
            const savedOrder = await saveOrderWithTimeout();
            // Clear cache
            await clearOrderCache(requestId);

            // Nếu thanh toán qua Stripe, trả về orderId để client tạo payment intent
            if (paymentMethod === PAYMENT_METHODS.STRIPE) {
                return res.status(200).json({
                    success: true,
                    message: SUCCESS_MESSAGES.ORDER_CREATED,
                    data: {
                        orderId: savedOrder._id,
                        requiresPayment: true,
                        amount: totalPrice
                    }
                });
            }

            // Nếu thanh toán COD, cập nhật stock và gửi email
            const updateStockPromises = orderItems.map(item => 
                Product.findOneAndUpdate(
                    { sku: item.sku },
                    { $inc: { quantity: -item.quantity } }
                ).exec()
            );

            try {
                await Promise.race([
                    Promise.all(updateStockPromises),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout updating stock')), 5000)
                    )
                ]);
            } catch (stockError) {
                logError(`[${requestId}] Error updating stock: ${stockError.message}`);
            }

            // Gửi email xác nhận đơn hàng
            try {
                const sendEmailPromise = sendEmail({
                    to: req.user.email,
                    subject: 'Xác nhận đơn hàng',
                    template: 'order-confirmation',
                    context: {
                        order: savedOrder,
                        user: req.user
                    }
                });

                await Promise.race([
                    sendEmailPromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout sending email')), 5000)
                    )
                ]);
            } catch (emailError) {
                logError(`[${requestId}] Error sending order confirmation email: ${emailError.message}`);
            }

            res.status(200).json({
                success: true,
                message: SUCCESS_MESSAGES.ORDER_CREATED,
                data: {
                    orderId: savedOrder._id,
                    requiresPayment: false
                }
            });
        } catch (error) {
            logError(`[${requestId}] Error saving order: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo đơn hàng, vui lòng thử lại'
            });
        }
    } catch (error) {
        logError(`[${requestId}] Error creating order: ${error.message}`);
        handleError(res, error);
    }
};

export const getMyOrders = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const userId = req.user._id;
        logInfo(`[${requestId}] Fetching orders for user: ${userId}`);

        // Lấy tham số phân trang từ query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Đếm tổng số đơn hàng
        const totalOrders = await Order.countDocuments({ user: userId });

        // Lấy danh sách đơn hàng với phân trang
        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalOrders / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        logInfo(`[${requestId}] Successfully fetched ${orders.length} orders for user: ${userId}`);
        res.json({
            success: true,
            data: orders,
            pagination: {
                total: totalOrders,
                page,
                limit,
                totalPages,
                hasNextPage,
                hasPrevPage
            }
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
        await clearDashboardCacheUtil(requestId);

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

        // Nếu trạng thái mới giống với trạng thái hiện tại, cho phép cập nhật
        if (currentStatus === newStatus) {
            // Cho phép cập nhật nếu có ghi chú mới
            if (note) {
                // Thêm vào lịch sử trạng thái với ghi chú mới
                order.statusHistory.push({
                    status: newStatus,
                    updatedAt: new Date(),
                    updatedBy: userId,
                    note: note
                });
                
                await order.save();
                
                logInfo(`[${requestId}] Successfully updated order note: ${order._id}`);
                return res.json({
                    success: true,
                    message: SUCCESS_MESSAGES.ORDER_STATUS_UPDATED,
                    data: order
                });
            }
            
            // Nếu không có ghi chú mới, trả về lỗi
            logError(`[${requestId}] Attempted to update order with same status without note: ${order._id}`);
            return res.status(400).json({
                success: false,
                message: `Không thể cập nhật đơn hàng với cùng trạng thái "${currentStatus}" mà không có ghi chú mới`
            });
        }

        // Kiểm tra xem có thể chuyển từ trạng thái hiện tại sang trạng thái mới không
        const validTransitions = {
            [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.DELIVERED]: [], // Không thể chuyển từ DELIVERED sang trạng thái khác
            [ORDER_STATUS.CANCELLED]: [] // Không thể chuyển từ CANCELLED sang trạng thái khác
        };

        // Cho phép hủy đơn từ bất kỳ trạng thái nào (trừ DELIVERED và CANCELLED)
        if (newStatus === ORDER_STATUS.CANCELLED && 
            currentStatus !== ORDER_STATUS.DELIVERED && 
            currentStatus !== ORDER_STATUS.CANCELLED) {
            // Cho phép hủy đơn
        } else if (!validTransitions[currentStatus].includes(newStatus)) {
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
        await clearDashboardCacheUtil(requestId);

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
        await clearDashboardCacheUtil(requestId);

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
            logError(`[${requestId}] Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata.orderId;

                logInfo(`[${requestId}] Processing successful payment for order: ${orderId}`);

                const order = await Order.findById(orderId);
                if (order) {
                    order.paymentStatus = PAYMENT_STATUS.PAID;
                    order.status = ORDER_STATUS.PROCESSING;
                    order.paymentIntentId = paymentIntent.id;
                    order.statusHistory.push({
                        status: ORDER_STATUS.PROCESSING,
                        updatedBy: order.user,
                        note: 'Thanh toán thành công qua Stripe',
                        updatedAt: new Date()
                    });

                    // Cập nhật stock sản phẩm
                    const updateStockPromises = order.items.map(item => 
                        Product.findOneAndUpdate(
                            { sku: item.sku },
                            { $inc: { quantity: -item.quantity } }
                        ).exec()
                    );

                    await Promise.all([
                        order.save(),
                        ...updateStockPromises
                    ]);

                    logInfo(`[${requestId}] Updated payment status and stock for order: ${orderId}`);
                }
                break;
            }
            default:
                logInfo(`[${requestId}] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

const clearOrderCache = async () => {};