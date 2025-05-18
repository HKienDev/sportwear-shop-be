import { sendEmail } from '../utils/sendEmail.js';
import { logError } from '../utils/logger.js';
import { ERROR_MESSAGES } from '../utils/constants.js';
import { render } from '@react-email/render';
import AdminNewOrderEmail from '../email-templates/AdminNewOrderEmail.js';
import AdminCancelRequestEmail from '../email-templates/AdminCancelRequestEmail.js';
import AdminPaymentErrorEmail from '../email-templates/AdminPaymentErrorEmail.js';
import AdminNewUserEmail from '../email-templates/AdminNewUserEmail.js';
import AdminProductLowStockEmail from '../email-templates/AdminProductLowStockEmail.js';
import AdminCouponUsedEmail from '../email-templates/AdminCouponUsedEmail.js';
import AdminPeriodicReportEmail from '../email-templates/AdminPeriodicReportEmail.js';
import AdminSecurityAlertEmail from '../email-templates/AdminSecurityAlertEmail.js';

const ADMIN_EMAIL = 'notify.vjusport@gmail.com';

/**
 * Gửi email sử dụng template từ FE
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const sendEmailFromTemplate = async (req, res) => {
    const { to, subject, html } = req.body;
    const requestId = req.id;

    console.log('=== DEBUG EMAIL CONTROLLER ===');
    console.log('Request ID:', requestId);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML length:', html?.length);

    try {
        // Validate required fields
        if (!to || !subject || !html) {
            console.log('Missing required fields:', { to, subject, htmlLength: html?.length });
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            console.log('Invalid email format:', to);
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ'
            });
        }

        // Validate HTML content
        if (typeof html !== 'string' || html.length === 0) {
            console.log('Invalid HTML content:', { type: typeof html, length: html?.length });
            return res.status(400).json({
                success: false,
                message: 'Nội dung email không hợp lệ'
            });
        }

        console.log('Sending email...');
        const result = await sendEmail({
            to,
            subject,
            html,
            requestId
        });
        console.log('Email sent successfully:', result);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in sendEmailFromTemplate:', error);
        logError(requestId, `Error in sendEmailFromTemplate: ${error.message}`);
        
        // Xử lý các lỗi cụ thể từ Resend
        if (error.statusCode === 401) {
            return res.status(401).json({
                success: false,
                message: 'Không có quyền gửi email'
            });
        }
        
        if (error.statusCode === 422) {
            return res.status(422).json({
                success: false,
                message: 'Dữ liệu email không hợp lệ'
            });
        }

        return res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};

/**
 * Gửi email admin báo đơn hàng mới, render từ React component
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const sendAdminNewOrderEmail = async (req, res) => {
    const { orderData } = req.body;
    const requestId = req.id || 'unknown';
    try {
        // Render React template cho admin
        const html = render(<AdminNewOrderEmail {...orderData} />);
        const subject = `Đơn hàng mới #${orderData.shortId} từ Sport Store`;
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminNewOrderEmail:', error);
        logError(requestId, `Error in sendAdminNewOrderEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const sendAdminCancelRequestEmail = async (req, res) => {
    const { data } = req.body;
    const requestId = req.id || 'unknown';
    try {
        const html = render(<AdminCancelRequestEmail {...data} />);
        const subject = data.subject || 'Yêu cầu hủy đơn hàng mới từ Sport Store';
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminCancelRequestEmail:', error);
        logError(requestId, `Error in sendAdminCancelRequestEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const sendAdminPaymentErrorEmail = async (req, res) => {
    const { data } = req.body;
    const requestId = req.id || 'unknown';
    try {
        const html = render(<AdminPaymentErrorEmail {...data} />);
        const subject = data.subject || 'Lỗi thanh toán đơn hàng từ Sport Store';
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminPaymentErrorEmail:', error);
        logError(requestId, `Error in sendAdminPaymentErrorEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const sendAdminNewUserEmail = async (req, res) => {
    const { data } = req.body;
    const requestId = req.id || 'unknown';
    try {
        const html = render(<AdminNewUserEmail {...data} />);
        const subject = data.subject || 'Người dùng mới đăng ký trên Sport Store';
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminNewUserEmail:', error);
        logError(requestId, `Error in sendAdminNewUserEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const sendAdminProductLowStockEmail = async (req, res) => {
    const { data } = req.body;
    const requestId = req.id || 'unknown';
    try {
        const html = render(<AdminProductLowStockEmail {...data} />);
        const subject = data.subject || 'Cảnh báo sản phẩm sắp hết hàng';
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminProductLowStockEmail:', error);
        logError(requestId, `Error in sendAdminProductLowStockEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const sendAdminCouponUsedEmail = async (req, res) => {
    const { data } = req.body;
    const requestId = req.id || 'unknown';
    try {
        const html = render(<AdminCouponUsedEmail {...data} />);
        const subject = data.subject || 'Mã giảm giá đã được sử dụng';
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminCouponUsedEmail:', error);
        logError(requestId, `Error in sendAdminCouponUsedEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const sendAdminPeriodicReportEmail = async (req, res) => {
    const { data } = req.body;
    const requestId = req.id || 'unknown';
    try {
        const html = render(<AdminPeriodicReportEmail {...data} />);
        const subject = data.subject || 'Báo cáo định kỳ từ Sport Store';
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminPeriodicReportEmail:', error);
        logError(requestId, `Error in sendAdminPeriodicReportEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const sendAdminSecurityAlertEmail = async (req, res) => {
    const { data } = req.body;
    const requestId = req.id || 'unknown';
    try {
        const html = render(<AdminSecurityAlertEmail {...data} />);
        const subject = data.subject || 'Cảnh báo bảo mật từ Sport Store';
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendAdminSecurityAlertEmail:', error);
        logError(requestId, `Error in sendAdminSecurityAlertEmail: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

/**
 * Gửi email cho admin sử dụng template admin
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const sendEmailToAdmin = async (req, res) => {
    const { template, data, subject } = req.body;
    const requestId = req.id || 'unknown';
    try {
        // Nếu subject không truyền thì sẽ lấy từ template
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            template,
            data,
            subject,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in sendEmailToAdmin:', error);
        logError(requestId, `Error in sendEmailToAdmin: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
}; 