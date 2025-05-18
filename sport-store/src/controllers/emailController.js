import { sendEmail } from '../utils/sendEmail.js';
import { getEmailTemplate } from '../utils/sendEmail.js';
import { logError } from '../utils/logger.js';
import { ERROR_MESSAGES } from '../utils/constants.js';

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
        // Sử dụng template HTML thuần giống user
        const { subject, html } = await getEmailTemplate('newOrder', orderData);
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
    return res.status(501).json({ success: false, message: 'Chức năng chưa hỗ trợ gửi email HTML thuần cho admin (CancelRequest)' });
};

export const sendAdminPaymentErrorEmail = async (req, res) => {
    return res.status(501).json({ success: false, message: 'Chức năng chưa hỗ trợ gửi email HTML thuần cho admin (PaymentError)' });
};

export const sendAdminNewUserEmail = async (req, res) => {
    return res.status(501).json({ success: false, message: 'Chức năng chưa hỗ trợ gửi email HTML thuần cho admin (NewUser)' });
};

export const sendAdminProductLowStockEmail = async (req, res) => {
    return res.status(501).json({ success: false, message: 'Chức năng chưa hỗ trợ gửi email HTML thuần cho admin (ProductLowStock)' });
};

export const sendAdminCouponUsedEmail = async (req, res) => {
    return res.status(501).json({ success: false, message: 'Chức năng chưa hỗ trợ gửi email HTML thuần cho admin (CouponUsed)' });
};

export const sendAdminPeriodicReportEmail = async (req, res) => {
    return res.status(501).json({ success: false, message: 'Chức năng chưa hỗ trợ gửi email HTML thuần cho admin (PeriodicReport)' });
};

export const sendAdminSecurityAlertEmail = async (req, res) => {
    return res.status(501).json({ success: false, message: 'Chức năng chưa hỗ trợ gửi email HTML thuần cho admin (SecurityAlert)' });
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