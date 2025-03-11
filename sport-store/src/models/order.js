import mongoose from "mongoose";
import { nanoid } from "nanoid"; // Import nanoid để tạo mã ngẫu nhiên

const generateOrderId = () => {
  return `VJUSPORT${nanoid(7).toUpperCase()}`; // "VJUSPORT" + 7 ký tự ngẫu nhiên
};

const orderSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      unique: true,
      default: generateOrderId, // Dùng hàm tự sinh mã
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
      }
    ],
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["COD", "Stripe"], required: true },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    paymentIntentId: { type: String },
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