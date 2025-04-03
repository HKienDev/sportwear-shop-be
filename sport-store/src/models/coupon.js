import mongoose from "mongoose";

// Constants
const COUPON_STATUS = {
    ACTIVE: true,
    INACTIVE: false
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
        discountPercentage: {
            type: Number,
            required: [true, "Phần trăm giảm giá là bắt buộc"],
            min: [0, "Phần trăm giảm giá không thể âm"],
            max: [100, "Phần trăm giảm giá không thể vượt quá 100"]
        },
        startDate: {
            type: Date,
            required: [true, "Ngày bắt đầu là bắt buộc"],
            validate: {
                validator: function(v) {
                    return v >= new Date();
                },
                message: "Ngày bắt đầu phải lớn hơn hoặc bằng ngày hiện tại"
            }
        },
        endDate: {
            type: Date,
            required: [true, "Ngày kết thúc là bắt buộc"],
            validate: {
                validator: function(v) {
                    return v > this.startDate;
                },
                message: "Ngày kết thúc phải lớn hơn ngày bắt đầu"
            }
        },
        isActive: {
            type: Boolean,
            default: COUPON_STATUS.ACTIVE
        },
        usageLimit: {
            type: Number,
            required: [true, "Giới hạn sử dụng là bắt buộc"],
            min: [1, "Giới hạn sử dụng phải lớn hơn 0"]
        },
        usageCount: {
            type: Number,
            default: 0,
            min: [0, "Số lần sử dụng không thể âm"]
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
    return this.endDate < new Date();
});

couponSchema.virtual('isAvailable').get(function() {
    return this.isActive && 
           !this.isExpired && 
           this.usageCount < this.usageLimit;
});

// Methods
couponSchema.methods.incrementUsage = async function() {
    if (this.usageCount >= this.usageLimit) {
        throw new Error('Coupon đã hết lượt sử dụng');
    }
    this.usageCount += 1;
    if (this.usageCount >= this.usageLimit) {
        this.isActive = false;
    }
    return this.save();
};

// Static methods
couponSchema.statics.findByCode = function(code) {
    return this.findOne({ 
        code: code.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    });
};

// Compound indexes
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
couponSchema.index({ usageCount: 1, usageLimit: 1, isActive: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon; 