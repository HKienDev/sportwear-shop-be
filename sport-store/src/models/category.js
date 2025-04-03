import mongoose from "mongoose";

// Constants
const CATEGORY_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive"
};

// Schema
const categorySchema = new mongoose.Schema({
    categoryId: {
        type: String,
        required: [true, "Mã danh mục là bắt buộc"],
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, "Tên danh mục là bắt buộc"],
        trim: true,
        unique: true,
        minlength: [2, "Tên danh mục phải có ít nhất 2 ký tự"],
        maxlength: [100, "Tên danh mục không được vượt quá 100 ký tự"]
    },
    slug: {
        type: String,
        required: [true, "Slug là bắt buộc"],
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Mô tả không được vượt quá 500 ký tự"]
    },
    image: {
        type: String,
        required: [true, "Ảnh danh mục là bắt buộc"],
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Người tạo là bắt buộc"]
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    productCount: {
        type: Number,
        default: 0,
        min: [0, "Số lượng sản phẩm không thể âm"]
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.id;
            return ret;
        }
    },
    toObject: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.id;
            return ret;
        }
    }
});

// Virtual fields
categorySchema.virtual('hasProducts').get(function() {
    return this.productCount > 0;
});

// Methods
categorySchema.methods.softDelete = async function(userId) {
    this.isActive = false;
    this.updatedBy = userId;
    return this.save();
};

categorySchema.methods.restore = async function(userId) {
    this.isActive = true;
    this.updatedBy = userId;
    return this.save();
};

// Static methods
categorySchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

categorySchema.statics.findInactive = function() {
    return this.find({ isActive: false });
};

categorySchema.statics.findBySlug = function(slug) {
    return this.findOne({ 
        slug: slug.toLowerCase(),
        isActive: true 
    });
};

categorySchema.statics.findByCategoryId = function(categoryId) {
    return this.findOne({ 
        categoryId: categoryId.toUpperCase(),
        isActive: true 
    });
};

// Pre-save middleware
categorySchema.pre('save', async function(next) {
    if (!this.isNew) return next();
    
    try {
        const lastCategory = await this.constructor.findOne({}, {}, { sort: { 'categoryId': -1 } });
        const lastId = lastCategory ? parseInt(lastCategory.categoryId.slice(-4)) : 0;
        this.categoryId = `VJUSPORTCAT${String(lastId + 1).padStart(4, '0')}`;
        next();
    } catch (error) {
        next(error);
    }
});

categorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }
    next();
});

// Compound indexes
categorySchema.index({ name: 1, isActive: 1 });
categorySchema.index({ slug: 1, isActive: 1 });
categorySchema.index({ categoryId: 1, isActive: 1 });
categorySchema.index({ productCount: -1, isActive: 1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;