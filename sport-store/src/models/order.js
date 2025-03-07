import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Người đặt hàng
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
      }
    ],
    totalPrice: { type: Number, required: true }, // Tổng tiền đơn hàng
    paymentMethod: { type: String, enum: ["COD", "Stripe"], required: true }, // Thanh toán COD hoặc Stripe
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" }, // Trạng thái thanh toán
    paymentIntentId: { type: String }, // Lưu ID thanh toán Stripe
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;