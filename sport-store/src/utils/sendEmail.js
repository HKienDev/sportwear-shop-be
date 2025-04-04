import { Resend } from "resend";
import { logInfo, logError } from "./logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./constants.js";

const resend = new Resend(env.RESEND_API_KEY);

// Email templates
const emailTemplates = {
    // Template cho đổi mật khẩu
    changePassword: (otp) => ({
        subject: "Xác thực đổi mật khẩu Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Xác thực đổi mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Bạn đã yêu cầu đổi mật khẩu. Vui lòng sử dụng mã OTP sau để xác nhận:</p>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="color: #007bff; margin: 0;">${otp}</h1>
                </div>
                <p>Mã OTP này sẽ hết hạn sau 5 phút.</p>
                <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho quên mật khẩu
    forgotPassword: (otp) => ({
        subject: "Đặt lại mật khẩu Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Đặt lại mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP sau để xác nhận:</p>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="color: #007bff; margin: 0;">${otp}</h1>
                </div>
                <p>Mã OTP này sẽ hết hạn sau 5 phút.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho đơn hàng mới
    newOrder: (order) => ({
        subject: "Xác nhận đơn hàng mới Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Xác nhận đơn hàng mới</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Cảm ơn bạn đã đặt hàng tại Sport Store. Dưới đây là thông tin đơn hàng của bạn:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Tổng tiền:</strong> ${order.totalAmount.toLocaleString('vi-VN')}đ</p>
                    <p><strong>Phương thức thanh toán:</strong> ${order.paymentMethod}</p>
                    <p><strong>Địa chỉ giao hàng:</strong> ${order.shippingAddress}</p>
                </div>
                <p>Chúng tôi sẽ cập nhật trạng thái đơn hàng của bạn sớm nhất có thể.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho cập nhật trạng thái đơn hàng
    orderStatusUpdate: (order) => ({
        subject: "Cập nhật trạng thái đơn hàng Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Cập nhật trạng thái đơn hàng</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Đơn hàng của bạn đã được cập nhật trạng thái:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Trạng thái mới:</strong> ${order.status}</p>
                </div>
                <p>Bạn có thể theo dõi đơn hàng của mình tại trang quản lý đơn hàng.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho xác nhận cập nhật thông tin cá nhân
    profileUpdate: (otp) => ({
        subject: "Xác nhận cập nhật thông tin cá nhân Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Xác nhận cập nhật thông tin cá nhân</h2>
                <p>Xin chào,</p>
                <p>Bạn đã yêu cầu cập nhật thông tin cá nhân. Vui lòng sử dụng mã OTP sau để xác nhận:</p>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="color: #007bff; margin: 0;">${otp}</h1>
                </div>
                <p>Mã OTP này sẽ hết hạn sau 5 phút.</p>
                <p>Nếu bạn không yêu cầu cập nhật thông tin, vui lòng bỏ qua email này.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho thông báo đơn hàng đã giao thành công
    orderDelivered: (order) => ({
        subject: "Đơn hàng đã giao thành công Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Đơn hàng đã giao thành công</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Đơn hàng của bạn đã được giao thành công:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Ngày giao:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
                </div>
                <p>Cảm ơn bạn đã tin tưởng và ủng hộ Sport Store!</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho thông báo đơn hàng bị hủy
    orderCancelled: (order) => ({
        subject: "Đơn hàng đã bị hủy Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Đơn hàng đã bị hủy</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Đơn hàng của bạn đã bị hủy:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Lý do hủy:</strong> ${order.cancellationReason || 'Không có thông tin'}</p>
                </div>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho thông báo đơn hàng đang được xử lý
    orderProcessing: (order) => ({
        subject: "Đơn hàng đang được xử lý Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Đơn hàng đang được xử lý</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Đơn hàng của bạn đang được xử lý:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Trạng thái:</strong> Đang xử lý</p>
                </div>
                <p>Chúng tôi sẽ cập nhật trạng thái đơn hàng của bạn sớm nhất có thể.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho thông báo đơn hàng đang được vận chuyển
    orderShipped: (order) => ({
        subject: "Đơn hàng đang được vận chuyển Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Đơn hàng đang được vận chuyển</h2>
                <p>Xin chào ${order.user.name},</p>
                <p>Đơn hàng của bạn đang được vận chuyển:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Mã đơn hàng:</strong> ${order._id}</p>
                    <p><strong>Đơn vị vận chuyển:</strong> ${order.shippingProvider || 'Chưa có thông tin'}</p>
                    <p><strong>Mã vận đơn:</strong> ${order.trackingNumber || 'Chưa có thông tin'}</p>
                </div>
                <p>Bạn có thể theo dõi đơn hàng của mình tại trang quản lý đơn hàng.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
            </div>
        `
    }),

    // Template cho đăng ký thành công
    register_success: (data) => ({
        subject: "Đăng ký tài khoản thành công - Sport Store",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Chào mừng đến với Sport Store!</h2>
                <p>Xin chào ${data.fullname},</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại Sport Store. Dưới đây là thông tin tài khoản của bạn:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Họ và tên:</strong> ${data.fullname}</p>
                    <p><strong>Email:</strong> ${data.email}</p>
                    <p><strong>Tên đăng nhập:</strong> ${data.username}</p>
                    <p><strong>Số điện thoại:</strong> ${data.phone}</p>
                </div>
                <p>Vui lòng đăng nhập và đổi mật khẩu ngay để bảo mật tài khoản của bạn.</p>
                <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul>
                    <li>Email: support@sportstore.com</li>
                    <li>Hotline: 0362195258</li>
                </ul>
                <p>Trân trọng,<br>Đội ngũ Sport Store</p>
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
export const sendEmail = async ({ to, template, data, requestId }) => {
    try {
        const emailTemplate = emailTemplates[template];
        if (!emailTemplate) {
            throw new Error(ERROR_MESSAGES.EMAIL_TEMPLATE_NOT_FOUND);
        }

        const { subject, html } = emailTemplate(data);
        const result = await resend.emails.send({
            from: 'Sport Store <no-reply@vjusport.com>',
            to,
            subject,
            html
        });

        logInfo(requestId, `Email sent successfully to ${to}`);
        return result;
    } catch (error) {
        logError(requestId, `Error sending email: ${error.message}`);
        throw error;
    }
};