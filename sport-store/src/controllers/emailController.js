import { sendEmail } from '../utils/sendEmail.js';
import { logError } from '../utils/logger.js';
import { ERROR_MESSAGES } from '../utils/constants.js';

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