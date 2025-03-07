import mongoose from "mongoose";
import Category from "./category.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Tên sản phẩm là bắt buộc"] },
    description: { type: String, required: true },
    brand: { type: String, required: [true, "Thương hiệu sản phẩm là bắt buộc"] },
    price: { type: Number, required: [true, "Giá sản phẩm là bắt buộc"] },
    discountPrice: { type: Number, default: 0 },
    stock: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: [true, "Danh mục sản phẩm là bắt buộc"] }, 
    isActive: { type: Boolean, default: true },
    images: {
      main: { type: String, required: true },
      sub: { type: [String], default: [] },
    },
    color: { type: [String], default: [] },
    size: { type: [String], default: [] },
    sku: { type: String, unique: true, required: [true, "Mã SKU là bắt buộc"] },
    tags: { type: [String], default: [] },
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Tăng productCount khi có sản phẩm mới
productSchema.post("save", async function (doc, next) {
  await Category.findByIdAndUpdate(doc.category, { $inc: { productCount: 1 } });
  next();
});

// Giảm productCount khi xóa sản phẩm
productSchema.post("remove", async function (doc, next) {
  await Category.findByIdAndUpdate(doc.category, { $inc: { productCount: -1 } });
  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;