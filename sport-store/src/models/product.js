import mongoose from "mongoose";
import Category from "./category.js";

// Constants
const PRODUCT_STATUS = {
    ACTIVE: true,
    INACTIVE: false
};

const SORT_OPTIONS = {
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
    RATING_DESC: 'rating_desc',
    NEWEST: 'newest'
};

// Schema
const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Tên sản phẩm là bắt buộc"],
        trim: true,
        maxlength: [200, "Tên sản phẩm không được vượt quá 200 ký tự"]
    },
    slug: {
        type: String,
        required: [true, "Slug là bắt buộc"],
        unique: true,
        trim: true,
        lowercase: true
    },
    description: { 
        type: String, 
        required: [true, "Mô tả sản phẩm là bắt buộc"],
        trim: true,
        maxlength: [2000, "Mô tả không được vượt quá 2000 ký tự"]
    },
    brand: { 
        type: String, 
        required: [true, "Thương hiệu sản phẩm là bắt buộc"],
        trim: true,
        maxlength: [100, "Thương hiệu không được vượt quá 100 ký tự"]
    },
    price: { 
        type: Number, 
        required: [true, "Giá sản phẩm là bắt buộc"],
        min: [0, "Giá sản phẩm không thể âm"]
    },
    discountPrice: { 
        type: Number, 
        default: 0,
        min: [0, "Giá giảm không thể âm"],
        validate: {
            validator: function(v) {
                return v <= this.price;
            },
            message: "Giá giảm không thể cao hơn giá gốc"
        }
    },
    stock: { 
        type: Number, 
        required: [true, "Số lượng sản phẩm là bắt buộc"],
        min: [0, "Số lượng sản phẩm không thể âm"]
    },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Category", 
        required: [true, "Danh mục sản phẩm là bắt buộc"]
    },
    isActive: { 
        type: Boolean, 
        default: PRODUCT_STATUS.ACTIVE 
    },
    images: {
        main: { 
            type: String, 
            required: [true, "Ảnh chính là bắt buộc"],
            trim: true
        },
        sub: { 
            type: [String], 
            default: [],
            validate: {
                validator: function(v) {
                    return v.length <= 5;
                },
                message: "Không được phép upload quá 5 ảnh phụ"
            }
        }
    },
    color: { 
        type: [String], 
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 10;
            },
            message: "Không được phép thêm quá 10 màu sắc"
        }
    },
    size: { 
        type: [String], 
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 10;
            },
            message: "Không được phép thêm quá 10 kích thước"
        }
    },
    sku: {
        type: String,
        required: [true, "SKU là bắt buộc"],
        unique: true,
        trim: true,
        uppercase: true
    },
    tags: { 
        type: [String], 
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 10;
            },
            message: "Không được phép thêm quá 10 tags"
        }
    },
    ratings: {
        average: { 
            type: Number, 
            default: 0,
            min: [0, "Đánh giá trung bình không thể âm"],
            max: [5, "Đánh giá trung bình không thể vượt quá 5"]
        },
        count: { 
            type: Number, 
            default: 0,
            min: [0, "Số lượng đánh giá không thể âm"]
        }
    },
    soldCount: {
        type: Number,
        default: 0,
        min: [0, "Số lượng đã bán không thể âm"]
    },
    viewCount: {
        type: Number,
        default: 0,
        min: [0, "Số lượt xem không thể âm"]
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields
productSchema.virtual('discountPercentage').get(function() {
    if (this.discountPrice === 0) return 0;
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

productSchema.virtual('isOutOfStock').get(function() {
    return this.stock === 0;
});

productSchema.virtual('isLowStock').get(function() {
    return this.stock > 0 && this.stock <= 5;
});

// Methods
productSchema.methods.updateStock = async function(quantity) {
    if (this.stock + quantity < 0) {
        throw new Error('Số lượng sản phẩm không đủ');
    }
    this.stock += quantity;
    return this.save();
};

productSchema.methods.incrementViewCount = async function() {
    this.viewCount += 1;
    return this.save();
};

productSchema.methods.updateRating = async function(newRating) {
    const totalRating = this.ratings.average * this.ratings.count;
    this.ratings.count += 1;
    this.ratings.average = (totalRating + newRating) / this.ratings.count;
    return this.save();
};

// Static methods
productSchema.statics.findBySKU = function(sku) {
    return this.findOne({ 
        sku: sku.toUpperCase(),
        isActive: true 
    });
};

productSchema.statics.findByCategory = function(categoryId) {
    return this.find({ 
        category: categoryId, 
        isActive: true 
    });
};

productSchema.statics.findBestSellers = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ soldCount: -1 })
        .limit(limit);
};

productSchema.statics.findNewest = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit);
};

productSchema.statics.findMostViewed = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ viewCount: -1 })
        .limit(limit);
};

// Pre-save middleware
productSchema.pre('save', async function(next) {
    if (this.isNew) {
        // Tăng productCount trong category
        await Category.findByIdAndUpdate(this.category, { $inc: { productCount: 1 } });
    }
    next();
});

// Post-save middleware
productSchema.post('remove', async function(doc, next) {
    // Giảm productCount trong category
    await Category.findByIdAndUpdate(doc.category, { $inc: { productCount: -1 } });
    next();
});

// Compound indexes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });
productSchema.index({ ratings: -1, isActive: 1 });
productSchema.index({ soldCount: -1, isActive: 1 });
productSchema.index({ viewCount: -1, isActive: 1 });

const Product = mongoose.model("Product", productSchema);
export default Product;