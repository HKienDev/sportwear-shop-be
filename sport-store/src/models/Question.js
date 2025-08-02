import mongoose from "mongoose";

// Constants
const QUESTION_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected"
};

const QUESTION_VISIBILITY = {
    PUBLIC: "public",
    PRIVATE: "private"
};

// Schema
const questionSchema = new mongoose.Schema({
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
    
    // Thông tin người hỏi
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
    
    // Nội dung câu hỏi
    question: {
        type: String,
        required: [true, "Nội dung câu hỏi là bắt buộc"],
        trim: true,
        maxlength: [500, "Nội dung câu hỏi không được vượt quá 500 ký tự"]
    },
    
    // Thông tin đơn hàng (để xác minh mua hàng - tùy chọn)
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    },
    orderShortId: {
        type: String
    },
    
    // Thông tin sản phẩm trong đơn hàng (nếu có)
    purchasedItem: {
        sku: {
            type: String
        },
        name: {
            type: String
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
            type: Number
        },
        price: {
            type: Number
        }
    },
    
    // Trạng thái và hiển thị
    status: {
        type: String,
        enum: Object.values(QUESTION_STATUS),
        default: QUESTION_STATUS.APPROVED
    },
    visibility: {
        type: String,
        enum: Object.values(QUESTION_VISIBILITY),
        default: QUESTION_VISIBILITY.PUBLIC
    },
    
    // Thống kê
    isHelpful: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    
    // Phản hồi từ admin
    adminAnswer: {
        type: String,
        trim: true,
        maxlength: [1000, "Phản hồi từ admin không được vượt quá 1000 ký tự"]
    },
    answeredAt: {
        type: Date
    },
    answeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
questionSchema.index({ productSku: 1, createdAt: -1 });
questionSchema.index({ user: 1, createdAt: -1 });
questionSchema.index({ status: 1 });
questionSchema.index({ isVerified: 1 });

// Pre-save middleware
questionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static methods
questionSchema.statics.getProductQuestions = async function(productSku, options = {}) {
    const {
        page = 1,
        limit = 10,
        status = QUESTION_STATUS.APPROVED,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const query = {
        productSku,
        status,
        visibility: QUESTION_VISIBILITY.PUBLIC
    };

    const [questions, total] = await Promise.all([
        this.find(query)
            .populate('user', 'fullname avatar totalSpent')
            .populate('answeredBy', 'fullname')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        questions,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

questionSchema.statics.getUserQuestions = async function(userId, options = {}) {
    const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const query = { user: userId };

    const [questions, total] = await Promise.all([
        this.find(query)
            .populate('product', 'name images')
            .populate('answeredBy', 'fullname')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        questions,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

questionSchema.statics.getAllQuestions = async function(options = {}) {
    const {
        page = 1,
        limit = 10,
        status,
        productSku,
        userId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const query = {};
    
    if (status) query.status = status;
    if (productSku) query.productSku = productSku;
    if (userId) query.user = userId;

    const [questions, total] = await Promise.all([
        this.find(query)
            .populate('user', 'fullname avatar email totalSpent')
            .populate('product', 'name images sku')
            .populate('answeredBy', 'fullname')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    // Add answer field for frontend compatibility
    const questionsWithAnswer = questions.map(q => ({
        ...q,
        answer: q.adminAnswer
    }));

    return {
        questions: questionsWithAnswer,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

questionSchema.statics.getPendingQuestions = async function(options = {}) {
    const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const query = { status: QUESTION_STATUS.PENDING };

    const [questions, total] = await Promise.all([
        this.find(query)
            .populate('user', 'fullname avatar email totalSpent')
            .populate('product', 'name images')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        questions,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// Instance methods
questionSchema.methods.markAsHelpful = async function() {
    this.isHelpful += 1;
    return this.save();
};

questionSchema.methods.answerByAdmin = async function(answer, adminId) {
    this.adminAnswer = answer;
    this.answeredAt = new Date();
    this.answeredBy = adminId;
    this.status = QUESTION_STATUS.APPROVED;
    return this.save();
};

questionSchema.methods.approve = async function() {
    this.status = QUESTION_STATUS.APPROVED;
    return this.save();
};

questionSchema.methods.reject = async function() {
    this.status = QUESTION_STATUS.REJECTED;
    return this.save();
};

questionSchema.methods.verify = async function() {
    this.isVerified = true;
    return this.save();
};

const Question = mongoose.model("Question", questionSchema);

export default Question; 