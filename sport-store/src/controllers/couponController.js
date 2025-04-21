import { Coupon } from "../models/coupon.js";
import { DISCOUNT_TYPE, COUPON_STATUS } from "../models/coupon.js";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "../utils/constants.js";
import { handleError } from "../utils/errorHandler.js";
import { DateUtils } from "../utils/timeUtils.js";
import { validateCoupon, calculateDiscount } from "../utils/couponUtils.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isBetween from "dayjs/plugin/isBetween.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import mongoose from "mongoose";
import { logInfo, logError } from "../utils/logger.js";
import { generateCouponCode } from "../utils/couponUtils.js";

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// Constants
const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";
const MIN_COUPON_DURATION = 1; // 1 hour
const MAX_COUPON_DURATION = 365; // 365 days
const SIMPLE_DATE_FORMAT = "YYYY-MM-DD";

// Create a new coupon
export const createCoupon = async (req, res) => {
    try {
        logInfo("=== BẮT ĐẦU TẠO COUPON ===");
        logInfo("Request Body:", req.body);

        // Validate required fields
        const requiredFields = ["type", "value", "usageLimit", "userLimit", "startDate", "endDate"];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        logInfo("Kiểm tra các trường bắt buộc:", req.body);
        
        if (missingFields.length > 0) {
            logError("Thiếu các trường bắt buộc:", missingFields);
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc",
                errors: missingFields.map(field => ({
                    field,
                    message: "Trường này là bắt buộc"
                }))
            });
        }
        
        logInfo("Các trường bắt buộc hợp lệ");

        // Parse and validate dates
        logInfo("Bắt đầu parse và validate ngày tháng");
        const { parsedStartDate, parsedEndDate } = parseAndValidateDates(req.body.startDate, req.body.endDate);
        logInfo("Ngày tháng đã được parse:", { parsedStartDate, parsedEndDate });

        // Validate coupon type and value
        logInfo("Kiểm tra loại và giá trị coupon:", { type: req.body.type, value: req.body.value });
        const validationResult = validateCoupon(req.body);
        if (!validationResult.isValid) {
            logError("Loại hoặc giá trị coupon không hợp lệ:", validationResult.error);
            return res.status(400).json({
                success: false,
                message: validationResult.error,
                errors: [
                    {
                        field: "type",
                        message: validationResult.error
                    }
                ]
            });
        }
        logInfo("Loại và giá trị coupon hợp lệ");

        // Generate coupon code
        logInfo("Bắt đầu tạo mã coupon");
        const code = await generateCouponCode();
        logInfo("Mã coupon được tạo:", code);

        // Create new coupon
        logInfo("Bắt đầu tạo coupon mới");
        const coupon = new Coupon({
            code,
            type: req.body.type,
            value: req.body.value,
            usageLimit: req.body.usageLimit,
            userLimit: req.body.userLimit,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            minimumPurchaseAmount: req.body.minimumPurchaseAmount || 0,
            status: "Hoạt động"
        });

        // Save coupon
        logInfo("Lưu coupon vào database");
        await coupon.save();
        logInfo("Coupon đã được lưu:", coupon._id);

        // Format response data
        logInfo("Format dữ liệu trả về");
        const responseData = {
            success: true,
            message: "Tạo coupon thành công",
            data: {
                id: coupon._id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                usageLimit: coupon.usageLimit,
                userLimit: coupon.userLimit,
                startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
                endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
                minimumPurchaseAmount: coupon.minimumPurchaseAmount,
                status: coupon.status
            }
        };

        logInfo("=== HOÀN THÀNH TẠO COUPON ===");
        return res.status(201).json(responseData);
    } catch (error) {
        logError("Lỗi khi tạo coupon:", error);
        return handleError(res, error);
    }
};

// Helper functions
function validateRequiredFields(data) {
    const errors = [];
    for (const [key, value] of Object.entries(data)) {
        if (!value) {
            errors.push({ field: key, message: `${key} là bắt buộc` });
        }
    }
    if (errors.length > 0) {
        throw { status: 400, message: "Vui lòng cung cấp đầy đủ thông tin", errors };
    }
}

function parseAndValidateDates(startDate, endDate) {
    console.log('Parsing dates:', { startDate, endDate });
    
    try {
        // Parse dates using dayjs with timezone
        const startDayjs = dayjs(startDate).tz(VIETNAM_TIMEZONE);
        const endDayjs = dayjs(endDate).tz(VIETNAM_TIMEZONE);
        
        console.log('Parsed dayjs objects:', {
            startDayjs: startDayjs.format(),
            endDayjs: endDayjs.format(),
            isStartValid: startDayjs.isValid(),
            isEndValid: endDayjs.isValid()
        });

        // Validate if dates are valid
        if (!startDayjs.isValid() || !endDayjs.isValid()) {
            console.error('Invalid date format:', {
                startDate,
                endDate
            });
            throw new Error('Invalid date format');
        }

        // Convert to Date objects with timezone, giữ nguyên thời gian người dùng nhập
        const parsedStartDate = startDayjs.tz(VIETNAM_TIMEZONE).toDate();
        const parsedEndDate = endDayjs.tz(VIETNAM_TIMEZONE).toDate();
        
        console.log('Parsed dates:', { 
            parsedStartDate: DateUtils.formatToVietnamDateString(parsedStartDate),
            parsedEndDate: DateUtils.formatToVietnamDateString(parsedEndDate)
        });

        validateDates(parsedStartDate, parsedEndDate);

        return { parsedStartDate, parsedEndDate };
    } catch (error) {
        console.error('Error parsing dates:', error);
        throw error;
    }
}

function validateDates(startDate, endDate) {
    const now = DateUtils.getCurrentVietnamTime();
    console.log('Validating dates:', {
        now: DateUtils.formatToVietnamDateString(now),
        startDate: DateUtils.formatToVietnamDateString(startDate),
        endDate: DateUtils.formatToVietnamDateString(endDate)
    });
    
    const startDayjs = dayjs(startDate).tz(VIETNAM_TIMEZONE);
    const endDayjs = dayjs(endDate).tz(VIETNAM_TIMEZONE);
    
    if (endDayjs.isSameOrBefore(startDayjs, 'day')) {
        throw { 
            status: 400, 
            message: "Ngày kết thúc phải lớn hơn ngày bắt đầu",
            errors: [
                { field: "endDate", message: "Ngày kết thúc phải lớn hơn ngày bắt đầu" }
            ]
        };
    }
}

async function validateOverlappingCoupons(startDate, endDate) {
    const overlappingCoupons = await Coupon.find({
        $or: [
            {
                startDate: { $lte: endDate },
                endDate: { $gte: startDate }
            }
        ],
        status: { $ne: COUPON_STATUS.EXPIRED }
    });

    if (overlappingCoupons.length > 0) {
        throw { status: 400, message: "Thời gian này đã có coupon khác đang hoạt động" };
    }
}

function formatCouponResponse(coupon) {
    return {
        ...coupon.toObject(),
        startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
        endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
        createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
        updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
    };
}

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
                startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
                endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
                createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
                updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
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
        const { id } = req.params;

        // Kiểm tra xem id có phải là một ObjectId hợp lệ không
        if (!mongoose.Types.ObjectId.isValid(id)) {
            // Nếu không phải là ObjectId hợp lệ, thử tìm kiếm theo code
            const coupon = await Coupon.findOne({ code: id })
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
                startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
                endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
                createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
                updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
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

            logInfo(`[${requestId}] Successfully retrieved coupon by code: ${id}`);
            res.json({
                success: true,
                message: SUCCESS_MESSAGES.COUPON_RETRIEVED,
                data: formattedCoupon,
            });
            return;
        }

        const coupon = await Coupon.findById(id)
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
            startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
            endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
            createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
            updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
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
        const updateData = req.body;

        // Kiểm tra xem id có phải là một ObjectId hợp lệ không
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_COUPON_ID,
            });
        }

        // Kiểm tra xem coupon có tồn tại không
        const existingCoupon = await Coupon.findById(id);
        if (!existingCoupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        // Xử lý ngày tháng nếu có
        if (updateData.startDate) {
            updateData.startDate = dayjs(updateData.startDate).toISOString();
        }
        if (updateData.endDate) {
            updateData.endDate = dayjs(updateData.endDate).toISOString();
        }

        // Thêm thông tin người cập nhật
        updateData.updatedBy = req.user._id;
        updateData.updatedAt = dayjs().toISOString();

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");

        // Format dates in response
        const formattedCoupon = {
            ...updatedCoupon.toObject(),
            startDate: DateUtils.formatToVietnamDateString(updatedCoupon.startDate),
            endDate: DateUtils.formatToVietnamDateString(updatedCoupon.endDate),
            createdAt: DateUtils.formatToVietnamDateString(updatedCoupon.createdAt),
            updatedAt: DateUtils.formatToVietnamDateString(updatedCoupon.updatedAt)
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

        logInfo(`[${requestId}] Successfully updated coupon: ${updatedCoupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_UPDATED,
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error updating coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Delete coupon
export const deleteCoupon = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { id } = req.params;

        // Kiểm tra xem id có phải là một ObjectId hợp lệ không
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_COUPON_ID,
            });
        }

        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        // Format dates in response
        const formattedCoupon = {
            ...deletedCoupon.toObject(),
            startDate: DateUtils.formatToVietnamDateString(deletedCoupon.startDate),
            endDate: DateUtils.formatToVietnamDateString(deletedCoupon.endDate),
            createdAt: DateUtils.formatToVietnamDateString(deletedCoupon.createdAt),
            updatedAt: DateUtils.formatToVietnamDateString(deletedCoupon.updatedAt)
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

        logInfo(`[${requestId}] Successfully deleted coupon: ${deletedCoupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_DELETED,
            data: formattedCoupon,
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
        console.log('=== BẮT ĐẦU ÁP DỤNG COUPON ===');
        const { code, userId, totalAmount } = req.body;
        console.log('Request Body:', { code, userId, totalAmount });

        if (!code || !userId || !totalAmount) {
            console.log('Thiếu thông tin bắt buộc');
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp đầy đủ thông tin"
            });
        }

        console.log('Tìm kiếm coupon theo code:', code);
        const coupon = await Coupon.findByCode(code);

        if (!coupon) {
            console.log('Không tìm thấy coupon');
            return res.status(404).json({
                success: false,
                message: "Mã giảm giá không hợp lệ hoặc đã hết hạn"
            });
        }

        console.log('Kiểm tra tính khả dụng của coupon');
        const validationResult = validateCoupon(coupon);
        if (!validationResult.isValid) {
            console.log('Coupon không khả dụng:', validationResult.error);
            return res.status(400).json({
                success: false,
                message: validationResult.error
            });
        }

        if (totalAmount < coupon.minimumPurchaseAmount) {
            console.log('Tổng tiền không đủ:', { totalAmount, minimumPurchaseAmount: coupon.minimumPurchaseAmount });
            return res.status(400).json({
                success: false,
                message: `Đơn hàng phải có giá trị tối thiểu ${coupon.minimumPurchaseAmount.toLocaleString('vi-VN')} VNĐ`
            });
        }

        console.log('Tính toán giảm giá');
        const { discountAmount, finalAmount } = calculateDiscount(coupon, totalAmount);
        console.log('Kết quả tính toán:', { discountAmount, finalAmount });

        console.log('=== HOÀN THÀNH ÁP DỤNG COUPON ===');
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
        console.error('Lỗi khi áp dụng coupon:', error);
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
            startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
            endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
            createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
            updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
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
            startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
            endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
            createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
            updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
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

// Get coupon by code
export const getCouponByCode = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { code } = req.params;

        const coupon = await Coupon.findOne({ code })
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        // Check if coupon is expired based on Vietnam time
        const now = DateUtils.getCurrentVietnamTime();
        if (DateUtils.compareVietnamDates(now, coupon.endDate) > 0 && coupon.status !== COUPON_STATUS.EXPIRED) {
            coupon.status = COUPON_STATUS.EXPIRED;
            await coupon.save();
        }

        // Format dates for response
        const formattedCoupon = {
            ...coupon.toObject(),
            startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
            endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
            createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
            updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
        };

        // Loại bỏ trường id nếu có
        if (formattedCoupon.id) {
            delete formattedCoupon.id;
        }

        logInfo(`[${requestId}] Successfully retrieved coupon by code: ${code}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_RETRIEVED,
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error retrieving coupon by code:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Validate coupon
export const validateCouponCode = async (req, res) => {
    const requestId = req.id || "unknown";

    try {
        const { code } = req.body;
        const userId = req.user._id;

        // Kiểm tra xem code có tồn tại không
        if (!code) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_CODE_REQUIRED,
            });
        }

        // Tìm coupon theo code
        const coupon = await Coupon.findOne({ code });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_FOUND,
            });
        }

        // Kiểm tra trạng thái coupon
        if (coupon.status !== COUPON_STATUS.ACTIVE) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_INACTIVE,
            });
        }

        // Kiểm tra ngày hiệu lực
        const now = DateUtils.getCurrentVietnamTime();
        if (DateUtils.compareVietnamDates(now, coupon.startDate) < 0) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_NOT_STARTED,
            });
        }

        if (DateUtils.compareVietnamDates(now, coupon.endDate) > 0) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_EXPIRED,
            });
        }

        // Kiểm tra số lần sử dụng
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.COUPON_USAGE_LIMIT_REACHED,
            });
        }

        // Kiểm tra số lần sử dụng của user
        if (coupon.userLimit) {
            const userUsageCount = coupon.usedBy.filter(usage => 
                usage.user.toString() === userId.toString()
            ).length;

            if (userUsageCount >= coupon.userLimit) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.COUPON_USER_LIMIT_REACHED,
                });
            }
        }

        // Format dates in response
        const formattedCoupon = {
            ...coupon.toObject(),
            startDate: DateUtils.formatToVietnamDateString(coupon.startDate),
            endDate: DateUtils.formatToVietnamDateString(coupon.endDate),
            createdAt: DateUtils.formatToVietnamDateString(coupon.createdAt),
            updatedAt: DateUtils.formatToVietnamDateString(coupon.updatedAt)
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

        logInfo(`[${requestId}] Successfully validated coupon: ${coupon._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.COUPON_VALID,
            data: formattedCoupon,
        });
    } catch (error) {
        logError(`[${requestId}] Error validating coupon:`, error);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

// Use coupon
export const useCoupon = async (req, res) => {
    try {
        const { couponId, userId } = req.body;

        // Validate input
        if (!couponId || !userId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc"
            });
        }

        // Find coupon
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy mã giảm giá"
            });
        }

        // Check if coupon is active
        if (coupon.status !== "Hoạt động") {
            return res.status(400).json({
                success: false,
                message: "Mã giảm giá không hoạt động"
            });
        }

        // Check usage limit
        if (coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: "Mã giảm giá đã hết lượt sử dụng"
            });
        }

        // Check user limit
        const userUsageCount = coupon.usedBy.filter(usage => 
            usage.user.toString() === userId.toString()
        ).length;

        if (userUsageCount >= coupon.userLimit) {
            return res.status(400).json({
                success: false,
                message: "Bạn đã sử dụng hết lượt cho mã giảm giá này"
            });
        }

        // Update coupon usage
        await Coupon.findByIdAndUpdate(couponId, {
            $inc: { usageCount: 1 },
            $push: {
                usedBy: {
                    user: userId,
                    usedAt: new Date()
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Sử dụng mã giảm giá thành công"
        });
    } catch (error) {
        logError("Lỗi khi sử dụng mã giảm giá:", error);
        return handleError(res, error);
    }
}; 