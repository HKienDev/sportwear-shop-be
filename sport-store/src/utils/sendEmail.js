import { Resend } from "resend";
import { logInfo, logError } from "./logger.js";
import env from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Gửi email sử dụng Resend
 * @param {Object} params - Tham số gửi email
 * @param {string} params.to - Email người nhận
 * @param {string} params.subject - Tiêu đề email (bắt buộc)
 * @param {string} params.html - Nội dung email dạng HTML (bắt buộc)
 * @param {string} params.requestId - ID của request
 * @returns {Promise<Object>} Kết quả gửi email
 */
export const sendEmail = async ({ to, subject, html, requestId }) => {
    console.log('=== [SEND EMAIL UTILS] Bắt đầu gửi email ===');
    console.log('Request ID:', requestId);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML length:', html?.length);
    console.log('Resend API Key:', env.RESEND_API_KEY ? 'Present' : 'Missing');

    try {
        // Validate required fields
        if (!to || !subject || !html) {
            console.log('[SEND EMAIL UTILS] Thiếu trường bắt buộc:', { to, subject, htmlLength: html?.length });
            throw new Error('Missing required fields: to, subject, and html are required');
        }

        console.log('[SEND EMAIL UTILS] Gọi resend.emails.send...');
        const result = await resend.emails.send({
            from: 'Sport Store <support@vjusport.com>',
            reply_to: 'support@vjusport.com',
            to,
            subject,
            html,
            text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 500), // Limited plain text
            tags: [
                { name: 'category', value: 'question_answered' },
                { name: 'request_id', value: requestId }
            ]
        });

        console.log('[SEND EMAIL UTILS] Resend API Response:', result);
        logInfo(requestId, `Email sent successfully to ${to}`);
        return result;
    } catch (error) {
        console.error('[SEND EMAIL UTILS] Resend API Error:', error);
        logError(requestId, `Error sending email: ${error.message}`);
        throw error;
    }
};