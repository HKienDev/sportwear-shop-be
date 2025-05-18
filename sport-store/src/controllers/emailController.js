import { sendEmail } from '../utils/sendEmail.js';
import { logError } from '../utils/logger.js';
import { ERROR_MESSAGES } from '../utils/constants.js';

const ADMIN_EMAIL = 'notify.vjusport@gmail.com';

/**
 * Gửi email sử dụng template từ FE (user + admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const sendEmailFromTemplate = async (req, res) => {
    const { to, subject, html } = req.body;
    const requestId = req.id;

    console.log('=== [EMAIL CONTROLLER] Nhận request gửi email ===');
    console.log('Request ID:', requestId);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML length:', html?.length);
    console.log('Body:', req.body);

    try {
        if (!to || !subject || !html) {
            console.log('[EMAIL CONTROLLER] Thiếu trường bắt buộc:', { to, subject, htmlLength: html?.length });
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS
            });
        }
        if (typeof html !== 'string' || html.length === 0) {
            console.log('[EMAIL CONTROLLER] Nội dung HTML không hợp lệ:', { type: typeof html, length: html?.length });
            return res.status(400).json({
                success: false,
                message: 'Nội dung email không hợp lệ'
            });
        }
        console.log('[EMAIL CONTROLLER] Bắt đầu gọi sendEmail...');
        const result = await sendEmail({ to, subject, html, requestId });
        console.log('[EMAIL CONTROLLER] Đã gửi email thành công:', result);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('[EMAIL CONTROLLER] Lỗi khi gửi email:', error);
        logError(requestId, `Error in sendEmailFromTemplate: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

/**
 * Các hàm gửi email admin đều gom về 1 hàm chung
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const sendAdminEmailFromTemplate = async (req, res) => {
    const { subject, html } = req.body;
    const requestId = req.id || 'unknown';
    console.log('=== [EMAIL CONTROLLER] Nhận request gửi email ADMIN ===');
    console.log('Request ID:', requestId);
    console.log('Subject:', subject);
    console.log('HTML length:', html?.length);
    console.log('Body:', req.body);
    try {
        if (!subject || !html) {
            console.log('[EMAIL CONTROLLER] Thiếu subject hoặc html');
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS
            });
        }
        console.log('[EMAIL CONTROLLER] Bắt đầu gọi sendEmail cho ADMIN...');
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        console.log('[EMAIL CONTROLLER] Đã gửi email ADMIN thành công:', result);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('[EMAIL CONTROLLER] Lỗi khi gửi email ADMIN:', error);
        logError(requestId, `Error in sendAdminEmailFromTemplate: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
}; 