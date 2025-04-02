import mongoose from "mongoose";
import User from "../models/user.js";
import Order from "../models/order.js";
import Product from "../models/product.js";
import stripe from "stripe";
import getExchangeRate from "../utils/exchangeRate.js";
import { nanoid } from "nanoid";
import { logInfo, logError } from "../utils/logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ORDER_STATUS, PAYMENT_METHODS } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";

const stripeInstance = stripe(env.STRIPE_SECRET_KEY);

// Helper functions
const generateOrderId = () => `VJUSPORT${nanoid(7).toUpperCase()}`;

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

// Controllers
export const createOrder = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { items, shippingAddress, paymentMethod } = req.body;
        const userId = req.user._id;

        // Validate items
        if (!items || items.length === 0) {
            logError(`[${requestId}] Order items are required`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_ITEMS_REQUIRED
            });
        }

        // Calculate total and validate stock
        let total = 0;
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                logError(`[${requestId}] Product not found: ${item.productId}`);
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
                });
            }

            if (product.stock < item.quantity) {
                logError(`[${requestId}] Insufficient stock for product: ${product.name}`);
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.INSUFFICIENT_STOCK
                });
            }

            total += product.price * item.quantity;
        }

        // Create order
        const order = new Order({
            user: userId,
            items,
            total,
            shippingAddress,
            paymentMethod,
            status: ORDER_STATUS.PENDING
        });

        const savedOrder = await order.save();

        // Update product stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }

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
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate('items.productId', 'name price image');

        logInfo(`[${requestId}] Successfully retrieved orders for user: ${req.user._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDERS_RETRIEVED,
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
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('items.productId', 'name price image');

        if (!order) {
            logError(`[${requestId}] Order not found: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Successfully retrieved order: ${order._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDER_RETRIEVED,
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

        order.status = ORDER_STATUS.CANCELLED;
        await order.save();

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
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('user', 'email username')
            .populate('items.productId', 'name price image');

        logInfo(`[${requestId}] Successfully retrieved all orders`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDERS_RETRIEVED,
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
        const order = await Order.findById(req.params.id)
            .populate('user', 'email username')
            .populate('items.productId', 'name price image');

        if (!order) {
            logError(`[${requestId}] Order not found: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Successfully retrieved order: ${order._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.ORDER_RETRIEVED,
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
        const { status } = req.body;
        const orderId = req.params.id;

        if (!Object.values(ORDER_STATUS).includes(status)) {
            logError(`[${requestId}] Invalid order status: ${status}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_ORDER_STATUS
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

        order.status = status;
        await order.save();

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

        const order = await Order.findById(orderId);
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
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { stock: item.quantity }
                });
            }
        }

        await order.deleteOne();

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