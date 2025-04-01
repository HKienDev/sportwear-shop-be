import { Resend } from "resend";
import { logInfo, logError } from "./logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./constants.js";

const resend = new Resend(env.RESEND_API_KEY);

// Email templates
const emailTemplates = {
    // Template cho đăng ký
    register: (otp) => ({
        subject: "Xác nhận đăng ký tài khoản",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Xác nhận đăng ký tài khoản</h2>
                <p>Xin chào,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại Sport Store. Vui lòng sử dụng mã OTP sau để xác nhận email của bạn:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #007bff; margin: 0;">${otp}</h1>
                </div>
                <p>Mã OTP này sẽ hết hạn sau 5 phút.</p>
                <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
            </div>
        `
    }),

    // Template cho quên mật khẩu
    forgotPassword: (otp) => ({
        subject: "Đặt lại mật khẩu",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Đặt lại mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP sau để xác nhận:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #007bff; margin: 0;">${otp}</h1>
                </div>
                <p>Mã OTP này sẽ hết hạn sau 5 phút.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            </div>
        `
    }),

    // Template cho đơn hàng mới
    newOrder: (order) => ({
        subject: "Xác nhận đơn hàng mới",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Xác nhận đơn hàng mới</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Cảm ơn bạn đã đặt hàng tại Sport Store. Dưới đây là thông tin đơn hàng của bạn:</p>
                <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Tổng tiền:</strong> ${order.totalAmount.toLocaleString('vi-VN')}đ</p>
                    <p><strong>Phương thức thanh toán:</strong> ${order.paymentMethod}</p>
                    <p><strong>Địa chỉ giao hàng:</strong> ${order.shippingAddress}</p>
                </div>
                <p>Chúng tôi sẽ cập nhật trạng thái đơn hàng của bạn sớm nhất có thể.</p>
                <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
            </div>
        `
    }),

    // Template cho cập nhật trạng thái đơn hàng
    orderStatusUpdate: (order) => ({
        subject: "Cập nhật trạng thái đơn hàng",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Cập nhật trạng thái đơn hàng</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Đơn hàng của bạn đã được cập nhật trạng thái:</p>
                <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Trạng thái mới:</strong> ${order.status}</p>
                </div>
                <p>Bạn có thể theo dõi đơn hàng của mình tại trang quản lý đơn hàng.</p>
                <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
            </div>
        `
    })
};

/**
 * Gửi email sử dụng Resend
 * @param {string} to - Email người nhận
 * @param {string} template - Tên template email
 * @param {Object} data - Dữ liệu cho template
 * @param {string} requestId - ID của request
 * @returns {Promise<Object>} Kết quả gửi email
 */
export const sendEmail = async (to, template, data, requestId) => {
    try {
        if (!emailTemplates[template]) {
            throw new Error(ERROR_MESSAGES.INVALID_EMAIL_TEMPLATE);
        }

        const { subject, html } = emailTemplates[template](data);

        const result = await resend.emails.send({
            from: env.EMAIL_FROM,
            to,
            subject,
            html
        });

        logInfo(`[${requestId}] Email sent successfully to ${to}`);
        return {
            success: true,
            message: SUCCESS_MESSAGES.EMAIL_SENT,
            data: result
        };
    } catch (error) {
        logError(`[${requestId}] Error sending email to ${to}:`, error);
        return {
            success: false,
            message: ERROR_MESSAGES.EMAIL_SEND_FAILED,
            error: error.message
        };
    }
};