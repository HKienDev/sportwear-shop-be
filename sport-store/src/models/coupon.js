import mongoose from "mongoose";
import dayjs from "../utils/timeUtils.js";
import { logInfo, logError } from "../utils/logger.js";
import { ERROR_MESSAGES } from "../utils/constants.js";
import { generateCouponCode } from "../utils/couponUtils.js";
import { DateUtils } from "../utils/timeUtils.js";

// Constants
export const COUPON_STATUS = {
    ACTIVE: "Hoạt động",
    EXPIRED: "Hết hạn",
    PAUSED: "Tạm Dừng"
};

export const DISCOUNT_TYPE = {
    PERCENTAGE: "percentage",
    FIXED_AMOUNT: "fixed"
};

// Schema cho CouponUsage
const couponUsageSchema = new mongoose.Schema(
    {
        coupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        usedAt: {
            type: Date,
            default: () => DateUtils.getCurrentVietnamTime(),
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                // Chuyển đổi các trường ngày tháng sang ISO string
                if (ret.usedAt) {
                    ret.usedAt = DateUtils.formatToVietnamDateString(ret.usedAt);
                }
                if (ret.createdAt) {
                    ret.createdAt = DateUtils.formatToVietnamDateString(ret.createdAt);
                }
                if (ret.updatedAt) {
                    ret.updatedAt = DateUtils.formatToVietnamDateString(ret.updatedAt);
                }
                return ret;
            },
        },
    }
);

// Indexes cho CouponUsage
couponUsageSchema.index({ coupon: 1, user: 1 }, { unique: true });
couponUsageSchema.index({ usedAt: 1 });

// Schema cho Coupon
const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },
        type: {
            type: String,
            enum: Object.values(DISCOUNT_TYPE),
            required: true
        },
        value: {
            type: Number,
            required: true,
            min: 0
        },
        usageLimit: {
            type: Number,
            required: true,
            min: 1
        },
        userLimit: {
            type: Number,
            required: true,
            min: 1
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        minimumPurchaseAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        status: {
            type: String,
            enum: Object.values(COUPON_STATUS),
            default: COUPON_STATUS.ACTIVE
        },
        usageCount: {
            type: Number,
            default: 0
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                // Chuyển đổi các trường ngày tháng sang ISO string
                if (ret.startDate) {
                    ret.startDate = DateUtils.formatToVietnamDateString(ret.startDate);
                }
                if (ret.endDate) {
                    ret.endDate = DateUtils.formatToVietnamDateString(ret.endDate);
                }
                if (ret.createdAt) {
                    ret.createdAt = DateUtils.formatToVietnamDateString(ret.createdAt);
                }
                if (ret.updatedAt) {
                    ret.updatedAt = DateUtils.formatToVietnamDateString(ret.updatedAt);
                }
                return ret;
            },
        },
        toObject: { virtuals: true }
    }
);

// Virtual fields
couponSchema.virtual('isAvailable').get(function() {
    const now = DateUtils.getCurrentVietnamTime();
    return this.status === COUPON_STATUS.ACTIVE && 
           !DateUtils.isExpiredInVietnam(this.endDate) && 
           this.usageCount < this.usageLimit &&
           DateUtils.isDateInRange(now, this.startDate, this.endDate);
});

// Methods
couponSchema.methods.incrementUsage = async function(userId) {
    if (this.usageCount >= this.usageLimit) {
        throw new Error('Coupon đã hết lượt sử dụng');
    }

    // Kiểm tra số lần sử dụng của user
    const userUsageCount = await CouponUsage.countDocuments({
        coupon: this._id,
        user: userId
    });

    if (userUsageCount >= this.userLimit) {
        throw new Error('Bạn đã sử dụng hết số lần cho phép');
    }

    // Tạo bản ghi sử dụng coupon
    await CouponUsage.create({
        coupon: this._id,
        user: userId,
        usedAt: DateUtils.getCurrentVietnamTime()
    });

    // Tăng số lần sử dụng
    this.usageCount += 1;

    // Nếu đã hết lượt sử dụng, cập nhật trạng thái
    if (this.usageCount >= this.usageLimit) {
        this.status = COUPON_STATUS.EXPIRED;
    }
    
    return this.save();
};

// Static methods
couponSchema.statics.findByCode = function(code) {
    return this.findOne({ code: code.toUpperCase() });
};

// Indexes
couponSchema.index({ status: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

// Models
export const Coupon = mongoose.model("Coupon", couponSchema);
export const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);
export default Coupon; 