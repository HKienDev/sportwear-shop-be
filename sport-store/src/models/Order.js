import mongoose from "mongoose";
// import { nanoid } from "nanoid"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS, SHIPPING_METHODS } from '../utils/constants.js';
// const SHIPPING_FEES = ... // eslint-disable-line @typescript-eslint/no-unused-vars

// Helper functions
const generateShortId = () => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    const timestamp = `${day}${month}${year}`; // Format: DDMMYYYY
    
    // Tạo chuỗi ngẫu nhiên 5 ký tự bao gồm chữ hoa, chữ thường và số
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomStr = '';
    for (let i = 0; i < 5; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `VJUSPORT-ORDER-${timestamp}-${randomStr}`;
};

// Schema
const orderSchema = new mongoose.Schema({
    shortId: {
        type: String,
        unique: true,
        default: generateShortId,
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
    subtotal: {
        type: Number,
        required: [true, "Tổng tiền hàng là bắt buộc"],
        min: [0, "Tổng tiền hàng không thể âm"]
    },
    directDiscount: {
        type: Number,
        default: 0,
        min: [0, "Giảm giá trực tiếp không thể âm"]
    },
    couponDiscount: {
        type: Number,
        default: 0,
        min: [0, "Giảm giá từ mã giảm giá không thể âm"]
    },
    shippingFee: {
        type: Number,
        required: [true, "Phí vận chuyển là bắt buộc"],
        default: 0,
        min: [0, "Phí vận chuyển không thể âm"]
    },
    totalPrice: {
        type: Number,
        required: [true, "Tổng tiền thanh toán là bắt buộc"],
        min: [0, "Tổng tiền thanh toán không thể âm"]
    },
    originalTotal: {
        type: Number,
        required: [true, "Tổng giá gốc là bắt buộc"],
        min: [0, "Tổng giá gốc không thể âm"]
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
        required: false,
        trim: true
    },
    shippingAddress: {
        fullName: {
            type: String,
            required: [true, "Họ tên là bắt buộc"],
            trim: true
        },
        phone: {
            type: String,
            required: [true, "Số điện thoại là bắt buộc"],
            trim: true
        },
        address: {
            province: {
                name: {
                    type: String,
                    required: [true, "Tên tỉnh/thành phố là bắt buộc"],
                    trim: true
                },
                code: {
                    type: Number,
                    required: [true, "Mã tỉnh/thành phố là bắt buộc"]
                }
            },
            district: {
                name: {
                    type: String,
                    required: [true, "Tên quận/huyện là bắt buộc"],
                    trim: true
                },
                code: {
                    type: Number,
                    required: [true, "Mã quận/huyện là bắt buộc"]
                }
            },
            ward: {
                name: {
                    type: String,
                    required: [true, "Tên phường/xã là bắt buộc"],
                    trim: true
                },
                code: {
                    type: Number,
                    required: [true, "Mã phường/xã là bắt buộc"]
                }
            },
            street: {
                type: String,
                trim: true
            }
        }
    },
    shippingMethod: {
        method: {
            type: String,
            enum: Object.values(SHIPPING_METHODS),
            required: [true, "Phương thức vận chuyển là bắt buộc"]
        },
        fee: {
            type: Number,
            required: [true, "Phí vận chuyển là bắt buộc"],
            min: [0, "Phí vận chuyển không thể âm"]
        },
        expectedDate: {
            type: Date
        },
        courier: {
            type: String,
            trim: true
        },
        trackingId: {
            type: String,
            trim: true
        }
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
            trim: true
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

// Middleware trước khi lưu
orderSchema.pre('save', function(next) {
    if (this.isNew) {
        this.statusHistory = [{
            status: this.status,
            updatedBy: this.user,
            note: 'Đơn hàng được tạo'
        }];
    }
    next();
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
orderSchema.methods.updateStatus = function(newStatus, updatedBy, note = '') {
    this.status = newStatus;
    this.statusHistory.push({
        status: newStatus,
        updatedBy,
        note
    });

    if (newStatus === ORDER_STATUS.CANCELLED) {
        this.cancelledAt = new Date();
        this.cancelledBy = updatedBy;
    }
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

// Kiểm tra model đã tồn tại chưa trước khi định nghĩa
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;