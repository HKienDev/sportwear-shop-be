import mongoose from "mongoose";
import { nanoid } from "nanoid";

// Constants
const ORDER_STATUS = {
    PENDING: "pending",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled"
};

const PAYMENT_METHODS = {
    COD: "COD",
    STRIPE: "Stripe"
};

const PAYMENT_STATUS = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed"
};

const SHIPPING_METHODS = {
    STANDARD: "standard",
    EXPRESS: "express"
};

// Helper functions
const generateOrderId = () => {
    return `VJUSPORT${nanoid(7).toUpperCase()}`;
};

// Schema
const orderSchema = new mongoose.Schema({
    shortId: {
        type: String,
        unique: true,
        default: generateOrderId,
        required: [true, "Mã đơn hàng là bắt buộc"],
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Người dùng là bắt buộc"]
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "Sản phẩm là bắt buộc"]
        },
        quantity: {
            type: Number,
            required: [true, "Số lượng là bắt buộc"],
            min: [1, "Số lượng phải lớn hơn 0"]
        },
        price: {
            type: Number,
            required: [true, "Giá là bắt buộc"],
            min: [0, "Giá không thể âm"]
        },
        name: {
            type: String,
            required: [true, "Tên sản phẩm là bắt buộc"],
            trim: true
        },
        sku: {
            type: String,
            required: [true, "SKU là bắt buộc"],
            trim: true
        }
    }],
    totalPrice: {
        type: Number,
        required: [true, "Tổng giá trị đơn hàng là bắt buộc"],
        min: [0, "Tổng giá trị đơn hàng không thể âm"]
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHODS),
        required: [true, "Phương thức thanh toán là bắt buộc"]
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING
    },
    paymentIntentId: {
        type: String,
        required: function() {
            return this.paymentMethod === PAYMENT_METHODS.STRIPE;
        },
        trim: true
    },
    shippingAddress: {
        fullName: {
            type: String,
            required: [true, "Họ tên là bắt buộc"],
            trim: true,
            maxlength: [100, "Họ tên không được vượt quá 100 ký tự"]
        },
        address: {
            type: String,
            required: [true, "Địa chỉ là bắt buộc"],
            trim: true
        },
        city: {
            type: String,
            required: [true, "Thành phố là bắt buộc"],
            trim: true
        },
        district: {
            type: String,
            required: [true, "Quận/Huyện là bắt buộc"],
            trim: true
        },
        ward: {
            type: String,
            required: [true, "Phường/Xã là bắt buộc"],
            trim: true
        },
        postalCode: {
            type: String,
            required: [true, "Mã bưu điện là bắt buộc"],
            trim: true,
            match: [/^[0-9]{6}$/, "Mã bưu điện không hợp lệ"]
        },
        phone: {
            type: String,
            required: [true, "Số điện thoại là bắt buộc"],
            trim: true,
            match: [/^[0-9]{10}$/, "Số điện thoại không hợp lệ"]
        }
    },
    shippingMethod: {
        type: String,
        enum: Object.values(SHIPPING_METHODS),
        required: [true, "Phương thức vận chuyển là bắt buộc"]
    },
    shippingFee: {
        type: Number,
        required: [true, "Phí vận chuyển là bắt buộc"],
        default: 0,
        min: [0, "Phí vận chuyển không thể âm"]
    },
    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING
    },
    notes: {
        type: String,
        default: "",
        trim: true,
        maxlength: [500, "Ghi chú không được vượt quá 500 ký tự"]
    },
    cancellationReason: {
        type: String,
        default: "",
        trim: true,
        maxlength: [500, "Lý do hủy đơn không được vượt quá 500 ký tự"]
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    statusHistory: [{
        status: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            required: [true, "Trạng thái là bắt buộc"]
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Người cập nhật là bắt buộc"]
        },
        note: {
            type: String,
            trim: true,
            maxlength: [500, "Ghi chú không được vượt quá 500 ký tự"]
        }
    }],
    isTotalSpentUpdated: {
        type: Boolean,
        default: false,
        required: [true, "Trạng thái cập nhật tổng chi tiêu là bắt buộc"]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields
orderSchema.virtual('totalItems').get(function() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.virtual('isPaid').get(function() {
    return this.paymentStatus === PAYMENT_STATUS.PAID;
});

orderSchema.virtual('isCancelled').get(function() {
    return this.status === ORDER_STATUS.CANCELLED;
});

orderSchema.virtual('isDelivered').get(function() {
    return this.status === ORDER_STATUS.DELIVERED;
});

// Methods
orderSchema.methods.addStatusHistory = async function(status, updatedBy, note = '') {
    this.statusHistory.push({
        status,
        updatedBy,
        note
    });
    this.status = status;
    if (status === ORDER_STATUS.CANCELLED) {
        this.cancelledAt = new Date();
        this.cancelledBy = updatedBy;
    }
    return this.save();
};

orderSchema.methods.updatePaymentStatus = async function(status, paymentIntentId = null) {
    this.paymentStatus = status;
    if (paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
    }
    return this.save();
};

// Static methods
orderSchema.statics.findByShortId = function(shortId) {
    return this.findOne({ shortId: shortId.toUpperCase() });
};

orderSchema.statics.findByUser = function(userId) {
    return this.find({ user: userId }).sort({ createdAt: -1 });
};

orderSchema.statics.findByStatus = function(status) {
    return this.find({ status }).sort({ createdAt: -1 });
};

// Compound indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ shortId: 1, user: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;