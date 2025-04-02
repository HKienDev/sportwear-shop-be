import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        discountPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        usageLimit: {
            type: Number,
            required: true,
            min: 0,
        },
        usageCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        minimumPurchaseAmount: {
            type: Number,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Thêm index cho code để tối ưu tìm kiếm
couponSchema.index({ code: 1 });

// Thêm index cho startDate và endDate để tối ưu tìm kiếm theo thời gian
couponSchema.index({ startDate: 1, endDate: 1 });

// Thêm index cho isActive để tối ưu tìm kiếm theo trạng thái
couponSchema.index({ isActive: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon; 