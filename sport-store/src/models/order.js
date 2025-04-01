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
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Số lượng sản phẩm phải lớn hơn 0"]
        },
        price: {
            type: Number,
            required: true,
            min: [0, "Giá sản phẩm không thể âm"]
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        sku: {
            type: String,
            required: true,
            trim: true
        }
    }],
    totalPrice: {
        type: Number,
        required: true,
        min: [0, "Tổng giá trị đơn hàng không thể âm"]
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHODS),
        required: true
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
            required: true,
            trim: true,
            maxlength: [100, "Tên không được vượt quá 100 ký tự"]
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        district: {
            type: String,
            required: true,
            trim: true
        },
        ward: {
            type: String,
            required: true,
            trim: true
        },
        postalCode: {
            type: String,
            required: true,
            trim: true,
            match: [/^[0-9]{6}$/, "Mã bưu điện không hợp lệ"]
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            match: [/^[0-9]{10}$/, "Số điện thoại không hợp lệ"]
        }
    },
    shippingMethod: {
        type: String,
        enum: Object.values(SHIPPING_METHODS),
        required: true
    },
    shippingFee: {
        type: Number,
        required: true,
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
        type: Date,
        required: false
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    statusHistory: [{
        status: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            required: true
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        note: {
            type: String,
            required: false,
            trim: true,
            maxlength: [500, "Ghi chú không được vượt quá 500 ký tự"]
        }
    }],
    isTotalSpentUpdated: {
        type: Boolean,
        default: false,
        required: true
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

orderSchema.statics.findPendingOrders = function() {
    return this.find({ status: ORDER_STATUS.PENDING });
};

orderSchema.statics.findProcessingOrders = function() {
    return this.find({ status: ORDER_STATUS.PROCESSING });
};

orderSchema.statics.findShippedOrders = function() {
    return this.find({ status: ORDER_STATUS.SHIPPED });
};

// Pre-save middleware
orderSchema.pre('save', async function(next) {
    if (this.isNew) {
        // Tính toán lại totalPrice nếu items thay đổi
        this.totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + this.shippingFee;
    }
    next();
});

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'shippingAddress.phone': 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;