import mongoose from "mongoose";
import Category from "./Category1.js";
import { generateSKU } from "../utils/productUtils.js";
import { PRODUCT_STATUS, SORT_OPTIONS } from '../utils/constants.js';
import * as slugifyModule from 'slugify';
const slugify = slugifyModule.default || slugifyModule;

// Schema
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên sản phẩm là bắt buộc'],
        trim: true,
        maxlength: [100, 'Tên sản phẩm không được vượt quá 100 ký tự'],
        unique: [true, 'Tên sản phẩm đã tồn tại'],
        validate: {
            validator: async function(value) {
                const product = await this.constructor.findOne({ 
                    name: value,
                    _id: { $ne: this._id }
                });
                return !product;
            },
            message: 'Tên sản phẩm đã tồn tại'
        }
    },
    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Mô tả sản phẩm là bắt buộc'],
        trim: true
    },
    brand: {
        type: String,
        required: [true, 'Thương hiệu là bắt buộc'],
        trim: true
    },
    originalPrice: {
        type: Number,
        required: [true, 'Giá gốc là bắt buộc'],
        min: [0, 'Giá gốc không được âm']
    },
    salePrice: {
        type: Number,
        min: [0, 'Giá khuyến mãi không được âm'],
        validate: {
            validator: function(value) {
                return value <= this.originalPrice;
            },
            message: 'Giá khuyến mãi không được cao hơn giá gốc'
        }
    },
    stock: {
        type: Number,
        required: [true, 'Số lượng tồn kho là bắt buộc'],
        min: [0, 'Số lượng tồn kho không được âm'],
        default: 0
    },
    categoryId: {
        type: String,
        required: [true, 'Danh mục là bắt buộc'],
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    mainImage: {
        type: String,
        required: [true, 'Hình ảnh chính là bắt buộc']
    },
    subImages: [{
        type: String
    }],
    colors: [{
        type: String,
        trim: true
    }],
    sizes: [{
        type: String,
        trim: true
    }],
    sku: {
        type: String,
        required: true,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    numReviews: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    soldCount: {
        type: Number,
        default: 0
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields
productSchema.virtual('discountPercentage').get(function() {
    if (!this.salePrice || !this.originalPrice) return 0;
    return Math.round(((this.originalPrice - this.salePrice) / this.originalPrice) * 100);
});

productSchema.virtual('isOutOfStock').get(function() {
    return this.stock === 0;
});

productSchema.virtual('isLowStock').get(function() {
    return this.stock > 0 && this.stock <= 5;
});

// Methods
productSchema.methods.updateStock = async function(quantity) {
    this.stock += quantity;
    if (this.stock < 0) {
        throw new Error('Số lượng tồn kho không đủ');
    }
    return this.save();
};

productSchema.methods.incrementViewCount = async function() {
    this.viewCount += 1;
    return this.save();
};

productSchema.methods.updateRating = async function(newRating) {
    const totalRating = this.rating * this.numReviews;
    this.numReviews += 1;
    this.rating = (totalRating + newRating) / this.numReviews;
    return this.save();
};

productSchema.methods.addReview = async function(userId, name, rating, comment) {
    const review = {
        user: userId,
        name,
        rating,
        comment
    };

    this.reviews.push(review);
    this.numReviews = this.reviews.length;
    this.rating = this.reviews.reduce((acc, item) => item.rating + acc, 0) / this.reviews.length;

    return this.save();
};

// Static methods
productSchema.statics.getActiveProducts = function() {
    return this.find({ isActive: true });
};

productSchema.statics.getActiveProductsByCategory = function(categoryId) {
    return this.find({ categoryId, isActive: true });
};

productSchema.statics.getActiveProductsByBrand = function(brand) {
    return this.find({ brand, isActive: true });
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
    // Tạo slug từ tên sản phẩm nếu chưa có
    if (this.isModified('name') || !this.slug) {
        this.slug = slugify(this.name, { 
            lower: true, 
            strict: true,
            locale: 'vi'
        });
        
        // Kiểm tra xem slug đã tồn tại chưa
        const slugExists = await this.constructor.findOne({ 
            slug: this.slug,
            _id: { $ne: this._id } 
        });
        
        // Nếu slug đã tồn tại, thêm số ngẫu nhiên vào cuối
        if (slugExists) {
            this.slug = `${this.slug}-${Math.floor(Math.random() * 1000)}`;
        }
    }
    
    // Tạo SKU nếu chưa có
    if (!this.sku) {
        this.sku = generateSKU();
        
        // Kiểm tra xem SKU đã tồn tại chưa
        const skuExists = await this.constructor.findOne({ 
            sku: this.sku,
            _id: { $ne: this._id } 
        });
        
        // Nếu SKU đã tồn tại, tạo SKU mới
        if (skuExists) {
            this.sku = generateSKU();
        }
    }
    
    if (this.isNew) {
        // Tăng productCount trong category
        await Category.findOneAndUpdate(
            { categoryId: this.categoryId },
            { $inc: { productCount: 1 } }
        );
    }
    
    // Chỉ gán originalPrice cho salePrice khi salePrice là undefined hoặc null
    if (this.salePrice === undefined || this.salePrice === null) {
        this.salePrice = this.originalPrice;
    }
    
    next();
});

// Post-save middleware
productSchema.post('remove', async function(doc, next) {
    // Giảm productCount trong category
    await Category.findOneAndUpdate(
        { categoryId: doc.categoryId },
        { $inc: { productCount: -1 } }
    );
    next();
});

// Indexes
productSchema.index({ name: 1, description: 'text', brand: 'text', tags: 'text' }, { unique: true });
productSchema.index({ categoryId: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ isActive: 1 });
productSchema.index({ originalPrice: 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });
productSchema.index({ rating: -1, isActive: 1 });
productSchema.index({ soldCount: -1, isActive: 1 });
productSchema.index({ viewCount: -1, isActive: 1 });

const Product = mongoose.model("Product", productSchema);
export default Product;