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

    try {
        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS
            });
        }
        if (typeof html !== 'string' || html.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nội dung email không hợp lệ'
            });
        }
        const result = await sendEmail({ to, subject, html, requestId });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
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
    try {
        if (!subject || !html) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS
            });
        }
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            html,
            requestId
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        logError(requestId, `Error in sendAdminEmailFromTemplate: ${error.message}`);
        return res.status(500).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
}; 