import mongoose from "mongoose";

// Constants
export const COUPON_STATUS = {
    ACTIVE: "Hoạt động",
    EXPIRED: "Hết hạn",
    PAUSED: "Tạm Dừng"
};

export const DISCOUNT_TYPE = {
    PERCENTAGE: "%",
    FIXED_AMOUNT: "VNĐ"
};

// Schema
const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, "Mã giảm giá là bắt buộc"],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [5, "Mã giảm giá phải có ít nhất 5 ký tự"],
            maxlength: [20, "Mã giảm giá không được vượt quá 20 ký tự"]
        },
        type: {
            type: String,
            required: [true, "Loại giảm giá là bắt buộc"],
            enum: {
                values: Object.values(DISCOUNT_TYPE),
                message: "Loại giảm giá không hợp lệ"
            }
        },
        value: {
            type: Number,
            required: [true, "Giá trị giảm giá là bắt buộc"],
            validate: {
                validator: function(v) {
                    if (this.type === DISCOUNT_TYPE.PERCENTAGE) {
                        return v >= 0 && v <= 100;
                    }
                    return v >= 0;
                },
                message: "Giá trị giảm giá không hợp lệ"
            }
        },
        usageLimit: {
            type: Number,
            required: [true, "Giới hạn sử dụng là bắt buộc"],
            min: [1, "Giới hạn sử dụng phải lớn hơn 0"]
        },
        userLimit: {
            type: Number,
            required: [true, "Giới hạn sử dụng trên mỗi user là bắt buộc"],
            min: [1, "Giới hạn sử dụng trên mỗi user phải lớn hơn 0"]
        },
        startDate: {
            type: Date,
            required: [true, "Ngày bắt đầu là bắt buộc"],
            validate: {
                validator: function(v) {
                    if (this.isNew) {
                        const startDate = new Date(v);
                        const now = new Date();
                        return startDate >= now;
                    }
                    return true;
                },
                message: "Ngày bắt đầu phải lớn hơn hoặc bằng ngày hiện tại"
            }
        },
        endDate: {
            type: Date,
            required: [true, "Ngày kết thúc là bắt buộc"],
            validate: {
                validator: function(v) {
                    if (this.isNew) {
                        const endDate = new Date(v);
                        const startDate = new Date(this.startDate);
                        return endDate > startDate;
                    }
                    return true;
                },
                message: "Ngày kết thúc phải lớn hơn ngày bắt đầu"
            }
        },
        status: {
            type: String,
            enum: {
                values: Object.values(COUPON_STATUS),
                message: "Trạng thái không hợp lệ"
            },
            default: COUPON_STATUS.ACTIVE
        },
        usageCount: {
            type: Number,
            default: 0,
            min: [0, "Số lần sử dụng không thể âm"]
        },
        userUsageCount: {
            type: Map,
            of: Number,
            default: {}
        },
        minimumPurchaseAmount: {
            type: Number,
            min: [0, "Số tiền tối thiểu không thể âm"],
            default: 0
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Người tạo là bắt buộc"]
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual fields
couponSchema.virtual('isExpired').get(function() {
    const endDate = new Date(this.endDate);
    const now = new Date();
    return endDate < now;
});

couponSchema.virtual('isAvailable').get(function() {
    return this.status === COUPON_STATUS.ACTIVE && 
           !this.isExpired && 
           this.usageCount < this.usageLimit;
});

// Methods
couponSchema.methods.incrementUsage = async function(userId) {
    if (this.usageCount >= this.usageLimit) {
        throw new Error('Coupon đã hết lượt sử dụng');
    }

    const userUsageCount = this.userUsageCount.get(userId) || 0;
    if (userUsageCount >= this.userLimit) {
        throw new Error('Bạn đã sử dụng hết số lần cho phép');
    }

    this.usageCount += 1;
    this.userUsageCount.set(userId, userUsageCount + 1);

    if (this.usageCount >= this.usageLimit) {
        this.status = COUPON_STATUS.EXPIRED;
    }
    return this.save();
};

// Static methods
couponSchema.statics.findByCode = function(code) {
    const now = new Date();
    return this.findOne({ 
        code: code.toUpperCase(),
        status: COUPON_STATUS.ACTIVE,
        startDate: { $lte: now },
        endDate: { $gte: now }
    });
};

// Compound indexes
couponSchema.index({ code: 1, status: 1 });
couponSchema.index({ startDate: 1, endDate: 1, status: 1 });
couponSchema.index({ usageCount: 1, usageLimit: 1, status: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon; 