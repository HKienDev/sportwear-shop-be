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
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, "Tên danh mục là bắt buộc"],
        unique: true,
        trim: true,
        maxlength: [100, "Tên danh mục không được vượt quá 100 ký tự"]
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        default: "",
        trim: true,
        maxlength: [500, "Mô tả không được vượt quá 500 ký tự"]
    },
    image: {
        type: String,
        default: "",
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    },
    isFeatured: {
        type: Boolean,
        default: false,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true
    },
    deletedAt: {
        type: Date,
        required: false
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.id; // Xóa trường id
            return ret;
        }
    },
    toObject: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.id; // Xóa trường id
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
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    this.isActive = false;
    return this.save();
};

categorySchema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.isActive = true;
    return this.save();
};

// Static methods
categorySchema.statics.findActive = function() {
    return this.find({ 
        isActive: true,
        isDeleted: false 
    });
};

categorySchema.statics.findInactive = function() {
    return this.find({ 
        isActive: false,
        isDeleted: false 
    });
};

categorySchema.statics.findDeleted = function() {
    return this.find({ isDeleted: true });
};

categorySchema.statics.findBySlug = function(slug) {
    return this.findOne({ 
        slug: slug.toLowerCase(),
        isDeleted: false 
    });
};

categorySchema.statics.findByCategoryId = function(categoryId) {
    return this.findOne({ categoryId: categoryId.toUpperCase() });
};

// Pre-save middleware
categorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

// Indexes
categorySchema.index({ categoryId: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ isDeleted: 1 });
categorySchema.index({ createdAt: -1 });
categorySchema.index({ updatedAt: -1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;