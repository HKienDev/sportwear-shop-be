import mongoose from "mongoose";
import { nanoid } from "nanoid";

// Hàm sinh mã đơn hàng ngắn
const generateOrderId = () => {
  return `VJUSPORT${nanoid(7).toUpperCase()}`;
};

const orderSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      unique: true,
      default: generateOrderId,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Nếu cho phép đặt hàng không cần đăng nhập
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Stripe"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentIntentId: {
      type: String,
      required: false, // Chỉ cần khi dùng Stripe
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    // Thêm trường shippingMethod
    shippingMethod: {
      type: {
        method: { type: String, required: true }, // Ví dụ: "Giao hàng tiêu chuẩn"
        expectedDate: { type: String, required: true }, // Ví dụ: "15/03/2025 - 17/03/2025"
        courier: { type: String, required: true }, // Ví dụ: "Giao hàng nhanh"
        trackingId: { type: String, required: true }, // Mã vận đơn
      },
      required: true, // Trường này bắt buộc
    },
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      district: {  // Thêm trường Quận/Huyện
        type: String,
        required: true,
      },
      ward: {      // Thêm trường Phường/Xã
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
    },
    // Thêm các trường mới cho việc hủy đơn
    cancelledAt: {
      type: Date,
      required: false,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    cancellationReason: {
      type: String,
      required: false,
      maxLength: 500,
    },
    // Thêm trường để lưu lịch sử trạng thái đơn hàng
    statusHistory: [{
      status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        required: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      note: {
        type: String,
        required: false,
        maxLength: 500,
      },
    }],
    isTotalSpentUpdated: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;