import mongoose from "mongoose";

// Constants
const REVIEW_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected"
};

const REVIEW_VISIBILITY = {
    PUBLIC: "public",
    PRIVATE: "private"
};

// Schema
const reviewSchema = new mongoose.Schema({
    // Thông tin sản phẩm
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Sản phẩm là bắt buộc"]
    },
    productSku: {
        type: String,
        required: [true, "SKU sản phẩm là bắt buộc"],
        index: true
    },
    
    // Thông tin người đánh giá
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Người dùng là bắt buộc"]
    },
    userName: {
        type: String,
        required: [true, "Tên người dùng là bắt buộc"],
        trim: true
    },
    userAvatar: {
        type: String,
        default: ""
    },
    
    // Nội dung đánh giá
    rating: {
        type: Number,
        required: [true, "Đánh giá sao là bắt buộc"],
        min: [1, "Đánh giá tối thiểu là 1 sao"],
        max: [5, "Đánh giá tối đa là 5 sao"]
    },
    title: {
        type: String,
        required: [true, "Tiêu đề đánh giá là bắt buộc"],
        trim: true,
        maxlength: [100, "Tiêu đề không được vượt quá 100 ký tự"]
    },
    comment: {
        type: String,
        required: [true, "Nội dung đánh giá là bắt buộc"],
        trim: true,
        maxlength: [1000, "Nội dung đánh giá không được vượt quá 1000 ký tự"]
    },
    
    // Thông tin đơn hàng (để xác minh mua hàng)
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: [true, "Mã đơn hàng là bắt buộc để xác minh mua hàng"]
    },
    orderShortId: {
        type: String,
        required: [true, "Mã đơn hàng ngắn là bắt buộc"]
    },
    
    // Thông tin sản phẩm trong đơn hàng
    purchasedItem: {
        sku: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        color: {
            type: String,
            default: ""
        },
        size: {
            type: String,
            default: ""
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    },
    
    // Trạng thái và hiển thị
    status: {
        type: String,
        enum: Object.values(REVIEW_STATUS),
        default: REVIEW_STATUS.PENDING
    },
    visibility: {
        type: String,
        enum: Object.values(REVIEW_VISIBILITY),
        default: REVIEW_VISIBILITY.PUBLIC
    },
    
    // Thông tin bổ sung
    isVerified: {
        type: Boolean,
        default: false,
        description: "Đánh giá đã được xác minh mua hàng"
    },
    isHelpful: {
        type: Number,
        default: 0,
        description: "Số lượt đánh giá hữu ích"
    },
    helpfulUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    
    // Hình ảnh đánh giá (nếu có)
    images: [{
        type: String,
        trim: true
    }],
    
    // Thông tin quản trị
    adminNote: {
        type: String,
        trim: true,
        maxlength: [500, "Ghi chú không được vượt quá 500 ký tự"]
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields
reviewSchema.virtual('isPending').get(function() {
    return this.status === REVIEW_STATUS.PENDING;
});

reviewSchema.virtual('isApproved').get(function() {
    return this.status === REVIEW_STATUS.APPROVED;
});

reviewSchema.virtual('isRejected').get(function() {
    return this.status === REVIEW_STATUS.REJECTED;
});

reviewSchema.virtual('isPublic').get(function() {
    return this.visibility === REVIEW_VISIBILITY.PUBLIC;
});

// Methods
reviewSchema.methods.approve = async function(adminId) {
    this.status = REVIEW_STATUS.APPROVED;
    this.reviewedBy = adminId;
    this.reviewedAt = new Date();
    return this.save();
};

reviewSchema.methods.reject = async function(adminId, note = "") {
    this.status = REVIEW_STATUS.REJECTED;
    this.reviewedBy = adminId;
    this.reviewedAt = new Date();
    this.adminNote = note;
    return this.save();
};

reviewSchema.methods.makePublic = async function() {
    this.visibility = REVIEW_VISIBILITY.PUBLIC;
    return this.save();
};

reviewSchema.methods.makePrivate = async function() {
    this.visibility = REVIEW_VISIBILITY.PRIVATE;
    return this.save();
};

reviewSchema.methods.toggleHelpful = async function(userId) {
    const userIndex = this.helpfulUsers.indexOf(userId);
    if (userIndex > -1) {
        // User đã vote helpful, remove vote
        this.helpfulUsers.splice(userIndex, 1);
        this.isHelpful = Math.max(0, this.isHelpful - 1);
    } else {
        // User chưa vote, add vote
        this.helpfulUsers.push(userId);
        this.isHelpful += 1;
    }
    return this.save();
};

// Static methods
reviewSchema.statics.findByProduct = function(productId, options = {}) {
    const query = {
        product: productId,
        status: REVIEW_STATUS.APPROVED,
        visibility: REVIEW_VISIBILITY.PUBLIC
    };
    
    return this.find(query)
        .populate('user', 'fullname avatar')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 10)
        .skip(options.skip || 0);
};

reviewSchema.statics.findByUser = function(userId, options = {}) {
    return this.find({ user: userId })
        .populate('product', 'name mainImage sku')
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 10)
        .skip(options.skip || 0);
};

reviewSchema.statics.findPending = function() {
    return this.find({ status: REVIEW_STATUS.PENDING })
        .populate('user', 'fullname email')
        .populate('product', 'name sku')
        .sort({ createdAt: -1 });
};

reviewSchema.statics.getAverageRating = async function(productId) {
    const result = await this.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(productId),
                status: REVIEW_STATUS.APPROVED,
                visibility: REVIEW_VISIBILITY.PUBLIC
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
            }
        }
    ]);
    
    return result.length > 0 ? {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        totalReviews: result[0].totalReviews
    } : {
        averageRating: 0,
        totalReviews: 0
    };
};

// Pre-save middleware
reviewSchema.pre('save', async function(next) {
    // Tự động verify nếu user đã mua sản phẩm
    if (this.isNew && this.orderId) {
        this.isVerified = true;
    }
    
    // Cập nhật thông tin user nếu chưa có
    if (this.isNew && this.user) {
        const User = mongoose.model('User');
        const user = await User.findById(this.user);
        if (user) {
            this.userName = user.fullname;
            this.userAvatar = user.avatar;
        }
    }
    
    next();
});

// Indexes
reviewSchema.index({ product: 1, status: 1, visibility: 1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ productSku: 1, status: 1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ isHelpful: -1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

// Export model
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review; 