import Coupon, { COUPON_STATUS, DISCOUNT_TYPE } from "../models/coupon.js";
import { logInfo, logError } from "../utils/logger.js";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "../utils/constants.js";
import { formatVietnamDate } from "../utils/timeUtils.js";
import { generateCouponCode, validateCoupon, calculateDiscount } from "../utils/couponUtils.js";

// Create a new coupon
export const createCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { type, value, usageLimit, userLimit, startDate, endDate, minimumPurchaseAmount } = req.body;

        // Validate required fields
        if (!type || !value || !usageLimit || !userLimit || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ thông tin"
            });
        }

        // Generate coupon code if not provided
        const code = req.body.code || await generateCouponCode();

        // Create new coupon
        const coupon = new Coupon({
            code,
            type,
            value,
            usageLimit,
            userLimit,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            minimumPurchaseAmount: minimumPurchaseAmount || 0,
            createdBy: req.user._id
        });

        await coupon.save();

        // Format dates for response
        const formattedCoupon = {
            ...coupon.toObject(),
            startDate: formatVietnamDate(coupon.startDate),
            endDate: formatVietnamDate(coupon.endDate),
            createdAt: formatVietnamDate(coupon.createdAt),
            updatedAt: formatVietnamDate(coupon.updatedAt)
        };

        // Loại bỏ trường id nếu có
        if (formattedCoupon.id) {
            delete formattedCoupon.id;
        }

        logInfo(`[${requestId}] Successfully created coupon: ${coupon._id}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_CREATED,
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error creating coupon:`, error);
        res.status(500).json({
            success: false,
            message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Get all coupons
export const getAllCoupons = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { page = 1, limit = 10, search } = req.query;
        const status = req.query['status'];
        const skip = (page - 1) * limit;

        // Xây dựng query
        const query = {};
        if (search) {
            query.code = { $regex: search, $options: "i" };
        }
        
        // Log để debug
        console.log('Status from query:', status, 'Type:', typeof status);
        console.log('COUPON_STATUS values:', Object.values(COUPON_STATUS));
        
        // Kiểm tra chi tiết từng ký tự trong chuỗi status
        if (status && typeof status === 'string') {
            console.log('Status length:', status.length);
            console.log('Status characters:', Array.from(status).map(c => `${c} (${c.charCodeAt(0)})`));
            
            // Kiểm tra từng giá trị trong COUPON_STATUS
            Object.values(COUPON_STATUS).forEach(validStatus => {
                console.log(`Comparing with "${validStatus}" (length: ${validStatus.length}):`, status === validStatus);
                console.log('Valid status characters:', Array.from(validStatus).map(c => `${c} (${c.charCodeAt(0)})`));
            });
        }
        
        // Kiểm tra xem status có phải là một trong các giá trị hợp lệ không
        const isValidStatus = status && 
                             status !== 'null' && 
                             status !== 'undefined' && 
                             (status === COUPON_STATUS.ACTIVE || 
                              status === COUPON_STATUS.PAUSED || 
                              status === COUPON_STATUS.EXPIRED);
        
        console.log('Is status valid?', isValidStatus);
        
        // Chỉ thêm điều kiện status vào query nếu status có giá trị và là một trong các giá trị hợp lệ
        if (isValidStatus) {
            query.status = status;
            console.log('Added status to query:', query.status);
        } else {
            console.log('Status not added to query. Status value:', status);
        }

        // Lấy danh sách coupons với phân trang
        const coupons = await Coupon.find(query)
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Đếm tổng số coupons
        const total = await Coupon.countDocuments(query);

        // Format dates in response
        const formattedCoupons = coupons.map(coupon => {
            const formattedCoupon = {
                ...coupon.toObject(),
                startDate: formatVietnamDate(coupon.startDate),
                endDate: formatVietnamDate(coupon.endDate),
                createdAt: formatVietnamDate(coupon.createdAt),
                updatedAt: formatVietnamDate(coupon.updatedAt)
            };
            
            // Loại bỏ trường id nếu có
            if (formattedCoupon.id) {
                delete formattedCoupon.id;
            }
            
            // Loại bỏ trường id trong createdBy và updatedBy nếu có
            if (formattedCoupon.createdBy && formattedCoupon.createdBy.id) {
                delete formattedCoupon.createdBy.id;
            }
            
            if (formattedCoupon.updatedBy && formattedCoupon.updatedBy.id) {
                delete formattedCoupon.updatedBy.id;
            }
            
            return formattedCoupon;
        });

        logInfo(`[${requestId}] Successfully retrieved coupons`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPONS_RETRIEVED,
            data: {
                coupons: formattedCoupons,
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

// Get coupon by ID
export const getCouponById = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const coupon = await Coupon.findById(req.params.id)
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        // Format dates in response
        const formattedCoupon = {
            ...coupon.toObject(),
            startDate: formatVietnamDate(coupon.startDate),
            endDate: formatVietnamDate(coupon.endDate),
            createdAt: formatVietnamDate(coupon.createdAt),
            updatedAt: formatVietnamDate(coupon.updatedAt)
        };
        
        // Loại bỏ trường id nếu có
        if (formattedCoupon.id) {
            delete formattedCoupon.id;
        }
        
        // Loại bỏ trường id trong createdBy và updatedBy nếu có
        if (formattedCoupon.createdBy && formattedCoupon.createdBy.id) {
            delete formattedCoupon.createdBy.id;
        }
        
        if (formattedCoupon.updatedBy && formattedCoupon.updatedBy.id) {
            delete formattedCoupon.updatedBy.id;
        }

        logInfo(`[${requestId}] Successfully retrieved coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_RETRIEVED,
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error retrieving coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Update coupon
export const updateCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { id } = req.params;
        const {
            type,
            value,
            usageLimit,
            userLimit,
            startDate,
            endDate,
            minimumPurchaseAmount,
            status
        } = req.body;

        // Tìm coupon hiện tại
        const existingCoupon = await Coupon.findById(id);
        
        if (!existingCoupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        // Kiểm tra validation ngày tháng
        if (startDate && endDate) {
            const newStartDate = new Date(startDate);
            const newEndDate = new Date(endDate);
            
            if (newEndDate <= newStartDate) {
                return res.status(400).json({
                    success: false,
                    message: "Ngày kết thúc phải lớn hơn ngày bắt đầu"
                });
            }
        } else if (endDate && !startDate) {
            // Nếu chỉ cập nhật endDate, so sánh với startDate hiện tại
            const newEndDate = new Date(endDate);
            const currentStartDate = new Date(existingCoupon.startDate);
            
            if (newEndDate <= currentStartDate) {
                return res.status(400).json({
                    success: false,
                    message: "Ngày kết thúc phải lớn hơn ngày bắt đầu"
                });
            }
        } else if (startDate && !endDate) {
            // Nếu chỉ cập nhật startDate, so sánh với endDate hiện tại
            const newStartDate = new Date(startDate);
            const currentEndDate = new Date(existingCoupon.endDate);
            
            if (currentEndDate <= newStartDate) {
                return res.status(400).json({
                    success: false,
                    message: "Ngày kết thúc phải lớn hơn ngày bắt đầu"
                });
            }
        }

        const updateData = {
            type: type || existingCoupon.type,
            value: value !== undefined ? value : existingCoupon.value,
            usageLimit: usageLimit !== undefined ? usageLimit : existingCoupon.usageLimit,
            userLimit: userLimit !== undefined ? userLimit : existingCoupon.userLimit,
            startDate: startDate ? new Date(startDate) : existingCoupon.startDate,
            endDate: endDate ? new Date(endDate) : existingCoupon.endDate,
            minimumPurchaseAmount: minimumPurchaseAmount !== undefined ? minimumPurchaseAmount : existingCoupon.minimumPurchaseAmount,
            status: status || existingCoupon.status,
            updatedBy: req.user._id
        };

        const coupon = await Coupon.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        // Format dates in response
        const formattedCoupon = {
            ...coupon.toObject(),
            startDate: formatVietnamDate(coupon.startDate),
            endDate: formatVietnamDate(coupon.endDate),
            createdAt: formatVietnamDate(coupon.createdAt),
            updatedAt: formatVietnamDate(coupon.updatedAt)
        };
        
        // Loại bỏ trường id nếu có
        if (formattedCoupon.id) {
            delete formattedCoupon.id;
        }
        
        // Loại bỏ trường id trong createdBy và updatedBy nếu có
        if (formattedCoupon.createdBy && formattedCoupon.createdBy.id) {
            delete formattedCoupon.createdBy.id;
        }
        
        if (formattedCoupon.updatedBy && formattedCoupon.updatedBy.id) {
            delete formattedCoupon.updatedBy.id;
        }

        logInfo(`[${requestId}] Successfully updated coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_UPDATED,
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error updating coupon:`, error);
        res.status(500).json({
            success: false,
            message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Delete coupon
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

// Apply coupon
export const applyCoupon = async (req, res) => {
    try {
        const { code, userId, totalAmount } = req.body;

        if (!code || !userId || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ thông tin"
            });
        }

        const coupon = await Coupon.findByCode(code);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Mã giảm giá không hợp lệ hoặc đã hết hạn"
            });
        }

        if (!coupon.isAvailable) {
            return res.status(400).json({
                success: false,
                message: "Mã giảm giá không còn khả dụng"
            });
        }

        if (totalAmount < coupon.minimumPurchaseAmount) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng phải có giá trị tối thiểu ${coupon.minimumPurchaseAmount.toLocaleString('vi-VN')} VNĐ`
            });
        }

        let discountAmount = 0;
        if (coupon.type === DISCOUNT_TYPE.PERCENTAGE) {
            discountAmount = (totalAmount * coupon.value) / 100;
        } else {
            discountAmount = coupon.value;
        }

        const finalAmount = totalAmount - discountAmount;

        res.status(200).json({
            success: true,
            data: {
                coupon: {
                    code: coupon.code,
                    type: coupon.type,
                    value: coupon.value,
                    discountAmount,
                    finalAmount
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Bulk delete coupons
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

        // Kiểm tra xem có coupon nào tồn tại không
        const existingCoupons = await Coupon.find({ _id: { $in: couponIds } });
        
        if (existingCoupons.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy coupon nào để xóa",
            });
        }

        // Xóa các coupon tồn tại
        const result = await Coupon.deleteMany({ _id: { $in: couponIds } });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Không có coupon nào được xóa",
            });
        }

        logInfo(`[${requestId}] Successfully deleted ${result.deletedCount} coupons`);
        res.json({
            success: true,
            message: `Đã xóa thành công ${result.deletedCount} coupon`,
            data: {
                deletedCount: result.deletedCount
            }
        });
    } catch (error) {
        logError(`[${requestId}] Error deleting coupons:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Pause coupon
export const pauseCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        coupon.status = COUPON_STATUS.PAUSED;
        coupon.updatedBy = req.user._id;
        await coupon.save();

        // Format dates in response
        const formattedCoupon = {
            ...coupon.toObject(),
            startDate: formatVietnamDate(coupon.startDate),
            endDate: formatVietnamDate(coupon.endDate),
            createdAt: formatVietnamDate(coupon.createdAt),
            updatedAt: formatVietnamDate(coupon.updatedAt)
        };
        
        // Loại bỏ trường id nếu có
        if (formattedCoupon.id) {
            delete formattedCoupon.id;
        }
        
        // Loại bỏ trường id trong createdBy và updatedBy nếu có
        if (formattedCoupon.createdBy && formattedCoupon.createdBy.id) {
            delete formattedCoupon.createdBy.id;
        }
        
        if (formattedCoupon.updatedBy && formattedCoupon.updatedBy.id) {
            delete formattedCoupon.updatedBy.id;
        }

        logInfo(`[${requestId}] Successfully paused coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: "Coupon đã được tạm dừng",
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error pausing coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Activate coupon
export const activateCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        coupon.status = COUPON_STATUS.ACTIVE;
        coupon.updatedBy = req.user._id;
        await coupon.save();

        // Format dates in response
        const formattedCoupon = {
            ...coupon.toObject(),
            startDate: formatVietnamDate(coupon.startDate),
            endDate: formatVietnamDate(coupon.endDate),
            createdAt: formatVietnamDate(coupon.createdAt),
            updatedAt: formatVietnamDate(coupon.updatedAt)
        };
        
        // Loại bỏ trường id nếu có
        if (formattedCoupon.id) {
            delete formattedCoupon.id;
        }
        
        // Loại bỏ trường id trong createdBy và updatedBy nếu có
        if (formattedCoupon.createdBy && formattedCoupon.createdBy.id) {
            delete formattedCoupon.createdBy.id;
        }
        
        if (formattedCoupon.updatedBy && formattedCoupon.updatedBy.id) {
            delete formattedCoupon.updatedBy.id;
        }

        logInfo(`[${requestId}] Successfully activated coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: "Coupon đã được kích hoạt",
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error activating coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
}; 