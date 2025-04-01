import mongoose from "mongoose";

// Constants
const CATEGORY_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive"
};

// Schema
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Tên danh mục là bắt buộc"],
        unique: true,
        trim: true,
        maxlength: [100, "Tên danh mục không được vượt quá 100 ký tự"]
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
        default: "",
        trim: true,
        maxlength: [500, "Mô tả không được vượt quá 500 ký tự"]
    },
    image: {
        type: String,
        default: "",
        trim: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null
    },
    level: {
        type: Number,
        required: true,
        min: [0, "Level không thể âm"],
        default: 0
    },
    productCount: {
        type: Number,
        required: true,
        min: [0, "Số lượng sản phẩm không thể âm"],
        default: 0
    },
    status: {
        type: String,
        enum: Object.values(CATEGORY_STATUS),
        default: CATEGORY_STATUS.ACTIVE,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields
categorySchema.virtual('isActive').get(function() {
    return this.status === CATEGORY_STATUS.ACTIVE;
});

categorySchema.virtual('hasProducts').get(function() {
    return this.productCount > 0;
});

categorySchema.virtual('isLeaf').get(function() {
    return this.level === 0;
});

// Methods
categorySchema.methods.incrementProductCount = async function() {
    this.productCount += 1;
    return this.save();
};

categorySchema.methods.decrementProductCount = async function() {
    if (this.productCount > 0) {
        this.productCount -= 1;
    }
    return this.save();
};

categorySchema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    this.status = CATEGORY_STATUS.INACTIVE;
    return this.save();
};

categorySchema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.status = CATEGORY_STATUS.ACTIVE;
    return this.save();
};

// Static methods
categorySchema.statics.findActive = function() {
    return this.find({ 
        status: CATEGORY_STATUS.ACTIVE,
        isDeleted: false 
    });
};

categorySchema.statics.findInactive = function() {
    return this.find({ 
        status: CATEGORY_STATUS.INACTIVE,
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

categorySchema.statics.findRootCategories = function() {
    return this.find({ 
        parent: null,
        isDeleted: false 
    });
};

categorySchema.statics.findSubCategories = function(parentId) {
    return this.find({ 
        parent: parentId,
        isDeleted: false 
    });
};

// Pre-save middleware
categorySchema.pre('save', async function(next) {
    if (this.isNew) {
        // Tự động tạo slug từ name nếu chưa có
        if (!this.slug) {
            this.slug = this.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        // Tính level dựa trên parent
        if (this.parent) {
            const parent = await this.constructor.findById(this.parent);
            if (parent) {
                this.level = parent.level + 1;
            }
        } else {
            this.level = 0;
        }
    }
    next();
});

// Indexes
categorySchema.index({ parent: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ isDeleted: 1 });
categorySchema.index({ productCount: -1 });
categorySchema.index({ createdAt: -1 });
categorySchema.index({ updatedAt: -1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;