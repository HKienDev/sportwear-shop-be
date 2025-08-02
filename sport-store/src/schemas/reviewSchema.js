import Joi from "joi";

// Create review schema
export const createReviewSchema = Joi.object({
    productSku: Joi.string().required().messages({
        "string.empty": "SKU sản phẩm không được để trống",
        "any.required": "SKU sản phẩm là bắt buộc"
    }),
    orderId: Joi.string().required().messages({
        "string.empty": "Mã đơn hàng không được để trống",
        "any.required": "Mã đơn hàng là bắt buộc"
    }),
    rating: Joi.number().integer().min(1).max(5).required().messages({
        "number.base": "Đánh giá sao phải là số",
        "number.integer": "Đánh giá sao phải là số nguyên",
        "number.min": "Đánh giá tối thiểu là 1 sao",
        "number.max": "Đánh giá tối đa là 5 sao",
        "any.required": "Đánh giá sao là bắt buộc"
    }),
    title: Joi.string().trim().min(1).max(100).required().messages({
        "string.empty": "Tiêu đề đánh giá không được để trống",
        "string.min": "Tiêu đề đánh giá không được để trống",
        "string.max": "Tiêu đề đánh giá không được vượt quá 100 ký tự",
        "any.required": "Tiêu đề đánh giá là bắt buộc"
    }),
    comment: Joi.string().trim().min(1).max(1000).required().messages({
        "string.empty": "Nội dung đánh giá không được để trống",
        "string.min": "Nội dung đánh giá không được để trống",
        "string.max": "Nội dung đánh giá không được vượt quá 1000 ký tự",
        "any.required": "Nội dung đánh giá là bắt buộc"
    }),
    images: Joi.array().items(Joi.string().uri()).max(5).optional().messages({
        "array.max": "Tối đa 5 hình ảnh đánh giá"
    })
});

// Update review schema
export const updateReviewSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional().messages({
        "number.base": "Đánh giá sao phải là số",
        "number.integer": "Đánh giá sao phải là số nguyên",
        "number.min": "Đánh giá tối thiểu là 1 sao",
        "number.max": "Đánh giá tối đa là 5 sao"
    }),
    title: Joi.string().trim().min(1).max(100).optional().messages({
        "string.empty": "Tiêu đề đánh giá không được để trống",
        "string.min": "Tiêu đề đánh giá không được để trống",
        "string.max": "Tiêu đề đánh giá không được vượt quá 100 ký tự"
    }),
    comment: Joi.string().trim().min(1).max(1000).optional().messages({
        "string.empty": "Nội dung đánh giá không được để trống",
        "string.min": "Nội dung đánh giá không được để trống",
        "string.max": "Nội dung đánh giá không được vượt quá 1000 ký tự"
    }),
    images: Joi.array().items(Joi.string().uri()).max(5).optional().messages({
        "array.max": "Tối đa 5 hình ảnh đánh giá"
    })
});

// Search review schema
export const searchReviewSchema = Joi.object({
    productSku: Joi.string().optional(),
    userId: Joi.string().optional(),
    status: Joi.string().valid("pending", "approved", "rejected").optional(),
    rating: Joi.number().integer().min(1).max(5).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid("createdAt", "rating", "isHelpful").default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc")
}); 