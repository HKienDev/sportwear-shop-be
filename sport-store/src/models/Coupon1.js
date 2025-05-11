import mongoose from "mongoose";
// import dayjs from 'dayjs'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { DateUtils } from "../utils/timeUtils.js";
// import { logInfo, logError } from '../utils/logger.js'; // eslint-disable-line @typescript-eslint/no-unused-vars
// import { ERROR_MESSAGES } from '../utils/constants.js'; // eslint-disable-line @typescript-eslint/no-unused-vars
// import { generateCouponCode } from '../utils/couponUtils.js'; // eslint-disable-line @typescript-eslint/no-unused-vars

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
        // Thêm trường để theo dõi người dùng đã sử dụng
        usedBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            usedAt: {
                type: Date,
                default: () => DateUtils.getCurrentVietnamTime()
            }
        }],
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
    const userUsageCount = this.usedBy.filter(usage => 
        usage.user.toString() === userId.toString()
    ).length;

    if (userUsageCount >= this.userLimit) {
        throw new Error('Bạn đã sử dụng hết số lần cho phép');
    }

    // Thêm người dùng vào danh sách đã sử dụng
    this.usedBy.push({
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
couponSchema.index({ "usedBy.user": 1 });

// Models
export const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon; 