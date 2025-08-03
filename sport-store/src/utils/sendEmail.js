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
    try {
        // Validate required fields
        if (!to || !subject || !html) {
            throw new Error('Missing required fields: to, subject, and html are required');
        }

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

        logInfo(requestId, `Email sent successfully to ${to}`);
        return result;
    } catch (error) {
        logError(requestId, `Error sending email: ${error.message}`);
        throw error;
    }
};