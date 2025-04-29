import { Resend } from "resend";
import { logInfo, logError } from "./logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./constants.js";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Gửi email sử dụng Resend
 * @param {Object} params - Tham số gửi email
 * @param {string} params.to - Email người nhận
 * @param {string} [params.subject] - Tiêu đề email (nếu gửi HTML trực tiếp)
 * @param {string} [params.html] - Nội dung email dạng HTML (nếu gửi HTML trực tiếp)
 * @param {string} [params.template] - Tên template (nếu gửi qua template)
 * @param {any} [params.data] - Dữ liệu cho template (nếu gửi qua template)
 * @param {string} params.requestId - ID của request
 * @returns {Promise<Object>} Kết quả gửi email
 */
export const sendEmail = async ({ to, subject, html, template, data, requestId }) => {
    console.log('=== DEBUG SEND EMAIL ===');
    console.log('Request ID:', requestId);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Template:', template);
    console.log('Data:', data);
    console.log('HTML length:', html?.length);
    console.log('Resend API Key:', env.RESEND_API_KEY ? 'Present' : 'Missing');

    try {
        // Nếu gửi qua template
        if (template) {
            const emailContent = await getEmailTemplate(template, data);
            subject = emailContent.subject;
            html = emailContent.html;
            
            // Log thông tin sau khi lấy template
            console.log('Template subject:', subject);
            console.log('Template HTML length:', html?.length);
        }

        // Validate required fields
        if (!to || !subject || !html) {
            throw new Error('Missing required fields: to, subject, and html are required');
        }

        console.log('Sending email via Resend...');
        const result = await resend.emails.send({
            from: 'Sport Store <no-reply@vjusport.com>',
            reply_to: 'support@sportstore.com',
            to,
            subject,
            html,
            tags: [
                { name: 'category', value: template || 'direct_email' },
                { name: 'request_id', value: requestId }
            ]
        });

        console.log('Resend API Response:', result);
        logInfo(requestId, `Email sent successfully to ${to}`);
        return result;
    } catch (error) {
        console.error('Resend API Error:', error);
        logError(requestId, `Error sending email: ${error.message}`);
        throw error;
    }
};

/**
 * Lấy nội dung email từ template
 * @param {string} template - Tên template
 * @param {any} data - Dữ liệu cho template
 * @returns {Promise<{subject: string, html: string}>} Nội dung email
 */
async function getEmailTemplate(template, data) {
    // Kiểm tra dữ liệu đầu vào
    if (!data) {
        console.error('Template data is missing');
        throw new Error('Template data is required');
    }

    switch (template) {
        case 'newOrder':
            // Kiểm tra dữ liệu cần thiết
            if (!data.shortId || !data.shippingAddress || !data.items || !data.createdAt) {
                console.error('Missing required order data:', {
                    shortId: !!data.shortId,
                    shippingAddress: !!data.shippingAddress,
                    items: !!data.items,
                    createdAt: !!data.createdAt
                });
                throw new Error('Missing required order data for email template');
            }

            // Tạo subject
            const subject = `Xác nhận đơn hàng #${data.shortId} từ Sport Store`;
            
            // Tạo HTML
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Xác nhận đơn hàng</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .order-info { background: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                        .items { margin: 20px 0; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        .total { font-weight: bold; text-align: right; margin-top: 20px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Xin chào ${data.shippingAddress.fullName || 'Quý khách'}!</h1>
                            <p>Cảm ơn bạn đã đặt hàng tại Sport Store</p>
                        </div>
                        
                        <div class="order-info">
                            <h2>Thông tin đơn hàng</h2>
                            <p>Mã đơn hàng: ${data.shortId}</p>
                            <p>Ngày đặt: ${new Date(data.createdAt).toLocaleDateString('vi-VN')}</p>
                            
                            <div class="items">
                                <h3>Chi tiết sản phẩm</h3>
                                ${data.items.map(item => `
                                    <div class="item">
                                        <span>${item.name || 'Sản phẩm không xác định'} x ${item.quantity || 1}</span>
                                        <span>${(item.price || 0).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="total">
                                <p>Tổng tiền hàng: ${(data.subtotal || 0).toLocaleString('vi-VN')}đ</p>
                                ${data.directDiscount > 0 ? `<p>Giảm giá: -${data.directDiscount.toLocaleString('vi-VN')}đ</p>` : ''}
                                ${data.couponDiscount > 0 ? `<p>Mã giảm giá: -${data.couponDiscount.toLocaleString('vi-VN')}đ</p>` : ''}
                                <p>Phí vận chuyển: ${(data.shippingFee || 0).toLocaleString('vi-VN')}đ</p>
                                <p>Tổng thanh toán: ${(data.totalPrice || 0).toLocaleString('vi-VN')}đ</p>
                            </div>
                        </div>
                        
                        <div class="shipping-info">
                            <h3>Thông tin giao hàng</h3>
                            <p>Người nhận: ${data.shippingAddress.fullName || 'Quý khách'}</p>
                            <p>Số điện thoại: ${data.shippingAddress.phone || 'Không có'}</p>
                            <p>Địa chỉ: ${data.shippingAddress.address ? 
                                `${data.shippingAddress.address.street || ''}, ${data.shippingAddress.address.ward?.name || ''}, ${data.shippingAddress.address.district?.name || ''}, ${data.shippingAddress.address.province?.name || ''}` : 
                                'Không có'}</p>
                        </div>
                        
                        <div class="footer">
                            <p>© 2025 Sport Store. Tất cả các quyền được bảo lưu.</p>
                            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            return { subject, html };
        case 'verification':
            return {
                subject: 'Xác thực tài khoản Sport Store',
                html: `
                    <h1>Welcome to Sport Store</h1>
                    <p>Your verification code is: ${data}</p>
                `
            };
        default:
            throw new Error(`Template ${template} not found`);
    }
}