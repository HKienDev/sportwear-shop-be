import Coupon from "../models/coupon.js";
import { logInfo, logError } from "../utils/logger.js";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "../config/constants.js";

export const getAllCoupons = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (page - 1) * limit;

        // Xây dựng query
        const query = {};
        if (search) {
            query.code = { $regex: search, $options: "i" };
        }

        // Lấy danh sách coupons với phân trang
        const coupons = await Coupon.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Đếm tổng số coupons
        const total = await Coupon.countDocuments(query);

        logInfo(`[${requestId}] Successfully retrieved coupons`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPONS_RETRIEVED,
            data: {
                coupons,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        logError(`[${requestId}] Error retrieving coupons:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

export const getCouponById = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        logInfo(`[${requestId}] Successfully retrieved coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_RETRIEVED,
            data: coupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error retrieving coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

export const createCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const coupon = new Coupon(req.body);
        await coupon.save();

        logInfo(`[${requestId}] Successfully created coupon: ${coupon._id}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_CREATED,
            data: coupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error creating coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

export const updateCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const coupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        logInfo(`[${requestId}] Successfully updated coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_UPDATED,
            data: coupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error updating coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

export const deleteCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        logInfo(`[${requestId}] Successfully deleted coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_DELETED,
        });
    } catch (error) {
        logError(`[${requestId}] Error deleting coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

export const bulkDeleteCoupons = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { couponIds } = req.body;

        if (!Array.isArray(couponIds) || couponIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_COUPON_IDS,
            });
        }

        await Coupon.deleteMany({ _id: { $in: couponIds } });

        logInfo(`[${requestId}] Successfully deleted ${couponIds.length} coupons`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPONS_DELETED,
        });
    } catch (error) {
        logError(`[${requestId}] Error deleting coupons:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
}; 