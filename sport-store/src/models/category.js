import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    image: { type: String, default: "" }, 
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;