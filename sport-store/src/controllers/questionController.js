import Question from '../models/Question.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { logger } from '../utils/logger.js';
import env from '../config/env.js';

// Constants
const QUESTION_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected"
};

// Get all questions (with optional productSku filter)
export const getQuestions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = QUESTION_STATUS.APPROVED, productSku } = req.query;

        // If productSku is provided, validate product exists
        if (productSku) {
            const product = await Product.findOne({ sku: productSku });
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Sản phẩm không tồn tại'
                });
            }
        }

        const result = await Question.getAllQuestions({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            productSku
        });

        res.json({
            success: true,
            message: 'Lấy danh sách câu hỏi thành công',
            data: result
        });

    } catch (error) {
        logger.error('Error getting questions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách câu hỏi'
        });
    }
};

// Get questions for a specific product
export const getProductQuestions = async (req, res) => {
    try {
        const { productSku } = req.params;
        const { page = 1, limit = 10, status = QUESTION_STATUS.APPROVED } = req.query;

        // Validate product exists
        const product = await Product.findOne({ sku: productSku });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại'
            });
        }

        const result = await Question.getProductQuestions(productSku, {
            page: parseInt(page),
            limit: parseInt(limit),
            status
        });

        res.json({
            success: true,
            message: 'Lấy danh sách câu hỏi thành công',
            data: result
        });

    } catch (error) {
        logger.error('Error getting product questions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách câu hỏi'
        });
    }
};

// Get user's questions
export const getUserQuestions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const result = await Question.getUserQuestions(userId, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            message: 'Lấy danh sách câu hỏi của bạn thành công',
            data: result
        });

    } catch (error) {
        logger.error('Error getting user questions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách câu hỏi'
        });
    }
};

// Create a new question
export const createQuestion = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productSku, question, orderId } = req.body;

        // Validate required fields
        if (!productSku || !question) {
            return res.status(400).json({
                success: false,
                message: 'SKU sản phẩm và nội dung câu hỏi là bắt buộc'
            });
        }

        // Validate product exists
        const product = await Product.findOne({ sku: productSku });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại'
            });
        }

        // Validate question length
        if (!question.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung câu hỏi không được để trống'
            });
        }

        if (question.trim().length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung câu hỏi không được vượt quá 500 ký tự'
            });
        }

        // Get user info
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Prepare question data
        const questionData = {
            product: product._id,
            productSku,
            user: userId,
            userName: user.fullname,
            userAvatar: user.avatar || '',
            question: question.trim()
        };

        // OrderId is optional - users can ask questions freely
        if (orderId) {
            const order = await Order.findById(orderId);
            if (order) {
                // Check if user owns this order
                if (order.user.toString() === userId.toString()) {
                    // Check if order contains the product
                    const orderItem = order.items.find(item => item.sku === productSku);
                    if (orderItem) {
                        questionData.orderId = order._id;
                        questionData.orderShortId = order.shortId;
                        questionData.purchasedItem = {
                            sku: orderItem.sku,
                            name: orderItem.name,
                            color: orderItem.color || '',
                            size: orderItem.size || '',
                            quantity: orderItem.quantity,
                            price: orderItem.price
                        };
                    }
                }
            }
        }

        // Create the question
        const newQuestion = new Question(questionData);
        await newQuestion.save();

        // Send email notification to admin
        if (env.ADMIN_EMAIL) {
            try {
                logger.info(`[${req.requestId || 'unknown'}] Sending new question notification to admin: ${env.ADMIN_EMAIL}`);
                
                const { render } = await import('@react-email/render');
                const AdminNewQuestionEmail = (await import('../email-templates/AdminNewQuestionEmail.js')).default;
                
                const emailData = {
                    userName: user.fullname,
                    productName: product.name, // Display name
                    productSku: product.sku, // For URL
                    question: question.trim(),
                    questionUrl: `https://vjusport.com/admin/questions`
                };
                
                const reactElement = AdminNewQuestionEmail(emailData);
                const html = await render(reactElement);
                
                const emailResult = await sendEmail({
                    to: env.ADMIN_EMAIL,
                    subject: 'Câu hỏi mới từ user',
                    html,
                    requestId: req.requestId || 'unknown'
                });
                
                logger.info(`[${req.requestId || 'unknown'}] Admin question notification sent successfully:`, emailResult);
            } catch (emailError) {
                logger.error(`[${req.requestId || 'unknown'}] Error sending admin question notification:`, emailError);
            }
        }

        // Populate user info for response
        await newQuestion.populate('user', 'fullname avatar totalSpent');

        res.status(201).json({
            success: true,
            message: 'Câu hỏi đã được gửi thành công',
            data: {
                question: newQuestion
            }
        });

    } catch (error) {
        logger.error('Error creating question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo câu hỏi'
        });
    }
};

// Delete a question
export const deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const userId = req.user._id;

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Câu hỏi không tồn tại'
            });
        }

        // Check if user owns this question or is admin
        if (question.user.toString() !== userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa câu hỏi này'
            });
        }

        await Question.findByIdAndDelete(questionId);

        res.json({
            success: true,
            message: 'Đã xóa câu hỏi thành công'
        });

    } catch (error) {
        logger.error('Error deleting question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa câu hỏi'
        });
    }
};

// Mark question as helpful
export const markQuestionHelpful = async (req, res) => {
    try {
        const { questionId } = req.params;

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Câu hỏi không tồn tại'
            });
        }

        await question.markAsHelpful();

        res.json({
            success: true,
            message: 'Đã đánh dấu câu hỏi hữu ích',
            data: {
                isHelpful: question.isHelpful
            }
        });

    } catch (error) {
        logger.error('Error marking question helpful:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đánh dấu câu hỏi'
        });
    }
};

// Admin: Get all questions
export const getAllQuestions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, productSku, userId } = req.query;

        const result = await Question.getAllQuestions({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            productSku,
            userId
        });

        res.json({
            success: true,
            message: 'Lấy danh sách câu hỏi thành công',
            data: result
        });

    } catch (error) {
        logger.error('Error getting all questions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách câu hỏi'
        });
    }
};

// Admin: Get pending questions
export const getPendingQuestions = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const result = await Question.getPendingQuestions({
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            message: 'Lấy danh sách câu hỏi chờ phê duyệt thành công',
            data: result
        });

    } catch (error) {
        logger.error('Error getting pending questions:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách câu hỏi chờ phê duyệt'
        });
    }
};

// Admin: Approve question
export const approveQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const adminId = req.user._id;

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Câu hỏi không tồn tại'
            });
        }

        await question.approve();

        res.json({
            success: true,
            message: 'Đã phê duyệt câu hỏi thành công'
        });

    } catch (error) {
        logger.error('Error approving question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi phê duyệt câu hỏi'
        });
    }
};

// Admin: Reject question
export const rejectQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const adminId = req.user._id;

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Câu hỏi không tồn tại'
            });
        }

        await question.reject();

        res.json({
            success: true,
            message: 'Đã từ chối câu hỏi thành công'
        });

    } catch (error) {
        logger.error('Error rejecting question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi từ chối câu hỏi'
        });
    }
};

// Admin: Answer question
export const answerQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { answer } = req.body;
        const adminId = req.user._id;

        if (!answer || !answer.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung trả lời không được để trống'
            });
        }

        if (answer.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung trả lời không được vượt quá 1000 ký tự'
            });
        }

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Câu hỏi không tồn tại'
            });
        }

        await question.answerByAdmin(answer.trim(), adminId);

        // Populate user info for email
        await question.populate('user', 'email fullname');

        // Send email notification to user
        if (question.user.email) {
            try {
                logger.info(`[${req.requestId || 'unknown'}] Sending question answered email to: ${question.user.email}`);
                
                const { render } = await import('@react-email/render');
                const QuestionAnsweredEmail = (await import('../email-templates/QuestionAnsweredEmail.js')).default;
                
                const emailData = {
                    userName: question.user.fullname,
                    productName: question.productSku,
                    question: question.question,
                    answer: answer.trim(),
                    questionUrl: `https://vjusport.com/products/${question.productSku}`
                };
                
                logger.info(`[${req.requestId || 'unknown'}] Email data prepared:`, {
                    to: question.user.email,
                    userName: question.user.fullname,
                    productName: question.productSku,
                    questionLength: question.question.length,
                    answerLength: answer.trim().length
                });
                
                const reactElement = QuestionAnsweredEmail(emailData);
                const html = await render(reactElement);
                
                logger.info(`[${req.requestId || 'unknown'}] Email HTML generated, length: ${html.length}`);
                
                const emailResult = await sendEmail({
                    to: question.user.email,
                    subject: 'Câu hỏi của bạn đã được trả lời',
                    html,
                    requestId: req.requestId || 'unknown'
                });
                
                logger.info(`[${req.requestId || 'unknown'}] Question answered email sent successfully:`, emailResult);
            } catch (emailError) {
                logger.error(`[${req.requestId || 'unknown'}] Error sending question answered email:`, emailError);
            }
        } else {
            logger.warn(`[${req.requestId || 'unknown'}] User ${question.user._id} has no email address`);
        }

        // Fetch updated question with populated data
        const updatedQuestion = await Question.findById(questionId)
            .populate('user', 'fullname avatar email')
            .populate('product', 'name images sku')
            .populate('answeredBy', 'fullname');

        // Add answer field for frontend compatibility
        const questionWithAnswer = {
            ...updatedQuestion.toObject(),
            answer: updatedQuestion.adminAnswer
        };

        res.json({
            success: true,
            message: 'Đã trả lời câu hỏi thành công',
            data: {
                question: questionWithAnswer
            }
        });

    } catch (error) {
        logger.error('Error answering question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi trả lời câu hỏi'
        });
    }
};

// Admin: Verify question
export const verifyQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Câu hỏi không tồn tại'
            });
        }

        await question.verify();

        res.json({
            success: true,
            message: 'Đã xác thực câu hỏi thành công'
        });

    } catch (error) {
        logger.error('Error verifying question:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xác thực câu hỏi'
        });
    }
}; 