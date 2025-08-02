import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/responseUtils.js";
import { logger } from "../utils/logger.js";
import { generateRequestId } from "../utils/requestUtils.js";
import { sendEmail } from "../utils/sendEmail.js";
import env from "../config/env.js";

// Get all reviews (with filtering and pagination)
export const getAllReviews = async (req, res) => {
    const requestId = generateRequestId();
    try {
        console.log(`[${requestId}] Getting reviews with query:`, req.query);
        
        const {
            productSku,
            userId,
            status,
            rating,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        // Build filter object
        const filter = {};
        if (productSku) filter.productSku = productSku;
        if (userId) filter.user = userId;
        if (status) filter.status = status;
        if (rating) filter.rating = parseInt(rating);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        console.log(`[${requestId}] Filter:`, filter);
        console.log(`[${requestId}] Sort:`, sort);
        
        const reviews = await Review.find(filter)
            .populate("user", "fullname avatar totalSpent")
            .populate("product", "name mainImage sku")
            .sort(sort)
            .limit(parseInt(limit))
            .skip(skip);



        // Get total count
        const total = await Review.countDocuments(filter);

        logger.info(`[${requestId}] Retrieved ${reviews.length} reviews`);

        return res.status(200).json({
            success: true,
            data: {
                reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            },
            message: "Lấy danh sách đánh giá thành công"
        });

    } catch (error) {
        logger.error(`[${requestId}] Error getting reviews:`, error);
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách đánh giá",
            error: error.message
        });
    }
};

// Get review by ID
export const getReviewById = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;

        const review = await Review.findById(id)
            .populate("user", "fullname avatar totalSpent")
            .populate("product", "name mainImage sku");

        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        logger.info(`[${requestId}] Retrieved review ${id}`);

        return sendSuccessResponse(res, { review }, "Lấy thông tin đánh giá thành công", requestId);

    } catch (error) {
        logger.error(`[${requestId}] Error getting review:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi lấy thông tin đánh giá", error.message, requestId);
    }
};

// Create new review
export const createReview = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const userId = req.user._id;
        const { productSku, orderId, rating, title, comment, images = [] } = req.body;

        logger.info(`[${requestId}] Creating review for user: ${userId}, product: ${productSku}, order: ${orderId}`);

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            logger.error(`[${requestId}] User not found: ${userId}`);
            return sendErrorResponse(res, 404, "Không tìm thấy người dùng", {}, requestId);
        }

        // Verify product exists
        const product = await Product.findOne({ sku: productSku });
        if (!product) {
            logger.error(`[${requestId}] Product not found: ${productSku}`);
            return sendErrorResponse(res, 404, "Không tìm thấy sản phẩm", {}, requestId);
        }
        logger.info(`[${requestId}] Found product: ${product._id}`);

        // Verify order exists and belongs to user
        const order = await Order.findOne({ 
            shortId: orderId,
            user: userId
        });
        if (!order) {
            logger.error(`[${requestId}] Order not found: ${orderId} for user: ${userId}`);
            return sendErrorResponse(res, 404, "Không tìm thấy đơn hàng hoặc đơn hàng không thuộc về bạn", {}, requestId);
        }
        logger.info(`[${requestId}] Found order: ${order._id} with status: ${order.status}`);

        // Check if order is delivered (required for review)
        if (order.status !== 'delivered') {
            logger.error(`[${requestId}] Order ${orderId} is not delivered. Current status: ${order.status}`);
            return sendErrorResponse(res, 400, "Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công", {}, requestId);
        }

        // Check if user has already reviewed this product for this order
        const existingReview = await Review.findOne({
            user: userId,
            product: product._id,
            orderId: order._id
        });
        if (existingReview) {
            return sendErrorResponse(res, 400, "Bạn đã đánh giá sản phẩm này cho đơn hàng này", {}, requestId);
        }

        // Find the purchased item in the order
        const purchasedItem = order.items.find(item => item.sku === productSku);
        if (!purchasedItem) {
            return sendErrorResponse(res, 400, "Sản phẩm không có trong đơn hàng này", {}, requestId);
        }

        // Validate comment
        if (!comment || !comment.trim()) {
            return sendErrorResponse(res, 400, "Nội dung đánh giá không được để trống", {}, requestId);
        }

        if (comment.trim().length > 1000) {
            return sendErrorResponse(res, 400, "Nội dung đánh giá không được vượt quá 1000 ký tự", {}, requestId);
        }

        // Create review
        const review = new Review({
            product: product._id,
            productSku,
            user: userId,
            userName: user.fullname,
            userAvatar: user.avatar,
            rating,
            title,
            comment: comment.trim(),
            images,
            orderId: order._id,
            orderShortId: order.shortId,
            purchasedItem: {
                sku: purchasedItem.sku,
                name: purchasedItem.name,
                color: purchasedItem.color || "",
                size: purchasedItem.size || "",
                quantity: purchasedItem.quantity,
                price: purchasedItem.price
            }
        });

        await review.save();

        // Update product rating
        await updateProductRating(product._id);

        // Send email notification to admin
        if (env.ADMIN_EMAIL) {
            try {
                logger.info(`[${requestId}] Sending new review notification to admin: ${env.ADMIN_EMAIL}`);
                
                const { render } = await import('@react-email/render');
                const AdminNewReviewEmail = (await import('../email-templates/AdminNewReviewEmail.js')).default;
                
                const emailData = {
                    userName: user.fullname,
                    productName: product.name, // Display name
                    productSku: product.sku, // For URL
                    rating,
                    comment: comment.trim(),
                    reviewUrl: `https://vjusport.com/admin/reviews`
                };
                
                const reactElement = AdminNewReviewEmail(emailData);
                const html = await render(reactElement);
                
                const emailResult = await sendEmail({
                    to: env.ADMIN_EMAIL,
                    subject: 'Đánh giá mới từ user',
                    html,
                    requestId
                });
                
                logger.info(`[${requestId}] Admin review notification sent successfully:`, emailResult);
            } catch (emailError) {
                logger.error(`[${requestId}] Error sending admin review notification:`, emailError);
            }
        }

        logger.info(`[${requestId}] Created review ${review._id} for product ${productSku}`);

        return res.status(201).json({
            success: true,
            message: "Tạo đánh giá thành công",
            data: { review }
        });

    } catch (error) {
        logger.error(`[${requestId}] Error creating review:`, error);
        return res.status(500).json({
            success: false,
            message: "Lỗi khi tạo đánh giá",
            errors: [{ message: error.message }]
        });
    }
};

// Update review
export const updateReview = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updateData = req.body;

        // Find review
        const review = await Review.findById(id);
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        // Check if user owns the review or is admin
        if (review.user.toString() !== userId && req.user.role !== "admin") {
            return sendErrorResponse(res, 403, "Không có quyền chỉnh sửa đánh giá này", {}, requestId);
        }

        // Update review
        Object.assign(review, updateData);
        await review.save();

        // Update product rating if rating changed
        if (updateData.rating) {
            await updateProductRating(review.product);
        }

        logger.info(`[${requestId}] Updated review ${id}`);

        return sendSuccessResponse(res, { review }, "Cập nhật đánh giá thành công", requestId);

    } catch (error) {
        logger.error(`[${requestId}] Error updating review:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi cập nhật đánh giá", error.message, requestId);
    }
};

// Delete review
export const deleteReview = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find review
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đánh giá"
            });
        }

        // Check if user owns the review or is admin
        if (review.user.toString() !== userId.toString() && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Không có quyền xóa đánh giá này"
            });
        }

        // Delete review
        await Review.findByIdAndDelete(id);

        // Update product rating
        await updateProductRating(review.product);

        logger.info(`[${requestId}] Deleted review ${id}`);

        return res.status(200).json({
            success: true,
            message: "Xóa đánh giá thành công"
        });

    } catch (error) {
        logger.error(`[${requestId}] Error deleting review:`, error);
        return res.status(500).json({
            success: false,
            message: "Lỗi khi xóa đánh giá",
            errors: [{ message: error.message }]
        });
    }
};

// Bulk delete reviews (admin only)
export const bulkDeleteReviews = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { reviewIds } = req.body;

        if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
            return sendErrorResponse(res, 400, "Danh sách ID đánh giá không hợp lệ", {}, requestId);
        }

        // Get reviews to update product ratings
        const reviews = await Review.find({ _id: { $in: reviewIds } });
        const productIds = [...new Set(reviews.map(review => review.product))];

        // Delete reviews
        const result = await Review.deleteMany({ _id: { $in: reviewIds } });

        // Update product ratings
        for (const productId of productIds) {
            await updateProductRating(productId);
        }

        logger.info(`[${requestId}] Bulk deleted ${result.deletedCount} reviews`);

        return sendSuccessResponse(res, { deletedCount: result.deletedCount }, "Xóa đánh giá hàng loạt thành công", requestId);

    } catch (error) {
        logger.error(`[${requestId}] Error bulk deleting reviews:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi xóa đánh giá hàng loạt", error.message, requestId);
    }
};

// Verify review (admin only)
export const verifyReview = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        review.status = "approved";
        review.reviewedBy = req.user.id;
        review.reviewedAt = new Date();
        await review.save();

        // Update product rating
        await updateProductRating(review.product);

        logger.info(`[${requestId}] Verified review ${id}`);

        return sendSuccessResponse(res, { review }, "Phê duyệt đánh giá thành công", requestId);

    } catch (error) {
        logger.error(`[${requestId}] Error verifying review:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi phê duyệt đánh giá", error.message, requestId);
    }
};

// Unverify review (admin only)
export const unverifyReview = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        review.status = "pending";
        review.reviewedBy = req.user.id;
        review.reviewedAt = new Date();
        await review.save();

        // Update product rating
        await updateProductRating(review.product);

        logger.info(`[${requestId}] Unverified review ${id}`);

        return sendSuccessResponse(res, { review }, "Hủy phê duyệt đánh giá thành công", requestId);

    } catch (error) {
        logger.error(`[${requestId}] Error unverifying review:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi hủy phê duyệt đánh giá", error.message, requestId);
    }
};

// Make review public (admin only)
export const makePublic = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        review.visibility = "public";
        await review.save();

        logger.info(`[${requestId}] Made review ${id} public`);

        return sendSuccessResponse(res, { review }, "Công khai đánh giá thành công", requestId);

    } catch (error) {
        logger.error(`[${requestId}] Error making review public:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi công khai đánh giá", error.message, requestId);
    }
};

// Make review private (admin only)
export const makePrivate = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        review.visibility = "private";
        await review.save();

        logger.info(`[${requestId}] Made review ${id} private`);

        return sendSuccessResponse(res, { review }, "Ẩn đánh giá thành công", requestId);

    } catch (error) {
        logger.error(`[${requestId}] Error making review private:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi ẩn đánh giá", error.message, requestId);
    }
};

// Helper function to update product rating
const updateProductRating = async (productId) => {
    try {
        const result = await Review.aggregate([
            {
                $match: {
                    product: productId
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

        const ratingData = result.length > 0 ? {
            rating: parseFloat(result[0].averageRating.toFixed(1)),
            numReviews: result[0].totalReviews
        } : {
            rating: 0,
            numReviews: 0
        };

        logger.info(`Updating product ${productId} rating: ${ratingData.rating}, reviews: ${ratingData.numReviews}`);
        await Product.findByIdAndUpdate(productId, ratingData);
    } catch (error) {
        logger.error("Error updating product rating:", error);
    }
};

// Reply to review (admin only)
export const replyToReview = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;
        const { adminReply } = req.body;

        if (!adminReply || adminReply.trim().length === 0) {
            return sendErrorResponse(res, 400, "Nội dung phản hồi không được để trống", {}, requestId);
        }

        if (adminReply.length > 500) {
            return sendErrorResponse(res, 400, "Nội dung phản hồi không được vượt quá 500 ký tự", {}, requestId);
        }

        const review = await Review.findById(id).populate('user', 'fullname email').populate('product', 'name');
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        review.adminNote = adminReply.trim();
        review.reviewedBy = req.user.id;
        review.reviewedAt = new Date();
        await review.save();

        // Send email notification to user
        try {
            const AdminReviewReplyEmail = require('../email-templates/AdminReviewReplyEmail.js');
            const emailHtml = AdminReviewReplyEmail(
                review.user.fullname,
                review.product.name,
                review.title,
                adminReply.trim(),
                req.user.fullname || 'Admin'
            );

            await sendEmail({
                to: review.user.email,
                subject: 'Phản hồi từ Admin về đánh giá của bạn',
                html: emailHtml
            });

            logger.info(`[${requestId}] Email notification sent to user ${review.user.email} for review reply`);
        } catch (emailError) {
            logger.error(`[${requestId}] Error sending email notification:`, emailError);
            // Don't fail the request if email fails
        }

        logger.info(`[${requestId}] Admin replied to review ${id}`);

        return sendSuccessResponse(res, 200, "Phản hồi đánh giá thành công", { review });

    } catch (error) {
        logger.error(`[${requestId}] Error replying to review:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi phản hồi đánh giá", error.message, requestId);
    }
};

// Update admin reply (admin only)
export const updateAdminReply = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;
        const { adminReply } = req.body;

        if (!adminReply || adminReply.trim().length === 0) {
            return sendErrorResponse(res, 400, "Nội dung phản hồi không được để trống", {}, requestId);
        }

        if (adminReply.length > 500) {
            return sendErrorResponse(res, 400, "Nội dung phản hồi không được vượt quá 500 ký tự", {}, requestId);
        }

        const review = await Review.findById(id).populate('user', 'fullname email').populate('product', 'name');
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        if (!review.adminNote) {
            return sendErrorResponse(res, 400, "Không có phản hồi admin để cập nhật", {}, requestId);
        }

        review.adminNote = adminReply.trim();
        review.reviewedBy = req.user.id;
        review.reviewedAt = new Date();
        await review.save();

        // Send email notification to user about updated reply
        try {
            const AdminReviewReplyEmail = require('../email-templates/AdminReviewReplyEmail.js');
            const emailHtml = AdminReviewReplyEmail(
                review.user.fullname,
                review.product.name,
                review.title,
                adminReply.trim(),
                req.user.fullname || 'Admin'
            );

            await sendEmail({
                to: review.user.email,
                subject: 'Cập nhật phản hồi từ Admin về đánh giá của bạn',
                html: emailHtml
            });

            logger.info(`[${requestId}] Email notification sent to user ${review.user.email} for updated review reply`);
        } catch (emailError) {
            logger.error(`[${requestId}] Error sending email notification:`, emailError);
            // Don't fail the request if email fails
        }

        logger.info(`[${requestId}] Admin updated reply to review ${id}`);

        return sendSuccessResponse(res, 200, "Cập nhật phản hồi thành công", { review });

    } catch (error) {
        logger.error(`[${requestId}] Error updating admin reply:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi cập nhật phản hồi", error.message, requestId);
    }
};

// Delete admin reply (admin only)
export const deleteAdminReply = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { id } = req.params;

        const review = await Review.findById(id);
        if (!review) {
            return sendErrorResponse(res, 404, "Không tìm thấy đánh giá", {}, requestId);
        }

        if (!review.adminNote) {
            return sendErrorResponse(res, 400, "Không có phản hồi admin để xóa", {}, requestId);
        }

        review.adminNote = undefined;
        review.reviewedBy = undefined;
        review.reviewedAt = undefined;
        await review.save();

        logger.info(`[${requestId}] Admin deleted reply to review ${id}`);

        return sendSuccessResponse(res, 200, "Xóa phản hồi thành công", { review });

    } catch (error) {
        logger.error(`[${requestId}] Error deleting admin reply:`, error);
        return sendErrorResponse(res, 500, "Lỗi khi xóa phản hồi", error.message, requestId);
    }
};