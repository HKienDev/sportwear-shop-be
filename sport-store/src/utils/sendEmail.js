import { Resend } from "resend";
import { logInfo, logError } from "./logger.js";
import env from "../config/env.js";

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
        case 'newOrder': {
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
        }
        case 'verification':
            return {
                subject: 'Xác thực tài khoản Sport Store',
                html: `
                    <h1>Welcome to Sport Store</h1>
                    <p>Your verification code is: ${data}</p>
                `
            };
        case 'register_success': {
            const { fullname, email, customId } = data;
            return {
                subject: 'Chào mừng bạn đến với Sport Store! Xác nhận đăng ký tài khoản',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 2px 8px #0001;">
                        <div style="text-align:center;">
                            <img src='https://www.vjusport.com/vju-logo-main.png' width='160' alt='Sport Store Logo' style='margin-bottom:24px;' />
                            <h2>Chào mừng đến với Sport Store!</h2>
                            <p>Xin chào <b>${fullname}</b>,</p>
                            <p>Tài khoản của bạn đã được tạo thành công.</p>
                        </div>
                        <div style="background:#f0f6ff;padding:16px;border-radius:8px;margin:24px 0;">
                            <h3>Thông tin tài khoản</h3>
                            <p><b>Mã khách hàng:</b> ${customId}</p>
                            <p><b>Email:</b> ${email}</p>
                        </div>
                        <div style="text-align:center;margin:24px 0;">
                            <a href="https://www.vjusport.com/auth/login" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;">Đăng nhập ngay</a>
                        </div>
                        <p style="font-size:13px;color:#666;text-align:center;">Nếu bạn cần hỗ trợ, hãy liên hệ: support@sportstore.com</p>
                        <hr style="margin:24px 0;border:0;border-top:1px solid #eee;" />
                        <p style="font-size:12px;color:#999;text-align:center;">© 2025 Sport Store. Địa chỉ: P. Lưu Hữu Phước, Cầu Diễn, Nam Từ Liêm, Hà Nội</p>
                    </div>
                `
            };
        }
        case 'forgot_password': {
            const { otp, name = 'Khách hàng' } = data;
            return {
                subject: 'Mã OTP đặt lại mật khẩu tại Sport Store',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 2px 8px #0001;">
                        <div style="text-align:center;">
                            <img src='https://www.vjusport.com/vju-logo-main.png' width='160' alt='Sport Store Logo' style='margin-bottom:24px;' />
                            <h2>Yêu cầu đặt lại mật khẩu</h2>
                            <p>Xin chào <b>${name}</b>,</p>
                            <p>Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình đặt lại mật khẩu:</p>
                            <div style="background:#f3f4f6;padding:16px 0;margin:24px 0;border-radius:8px;font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</div>
                            <p style="color:#666;font-size:13px;">Mã này sẽ hết hạn sau 10 phút.</p>
                        </div>
                        <div style="background:#fef2f2;padding:12px;border-radius:8px;margin:24px 0;">
                            <b style="color:#dc2626;">Cảnh báo bảo mật:</b> Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                        </div>
                        <p style="font-size:13px;color:#666;text-align:center;">Cần hỗ trợ? support@sportstore.com</p>
                        <hr style="margin:24px 0;border:0;border-top:1px solid #eee;" />
                        <p style="font-size:12px;color:#999;text-align:center;">© 2025 Sport Store. Địa chỉ: P. Lưu Hữu Phước, Cầu Diễn, Nam Từ Liêm, Hà Nội</p>
                    </div>
                `
            };
        }
        case 'password_changed': {
            const { name = 'Khách hàng', time = new Date().toLocaleString('vi-VN') } = data;
            return {
                subject: 'Mật khẩu của bạn đã được thay đổi thành công',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 2px 8px #0001;">
                        <div style="text-align:center;">
                            <img src='https://www.vjusport.com/vju-logo-main.png' width='160' alt='Sport Store Logo' style='margin-bottom:24px;' />
                            <h2>Mật khẩu đã được thay đổi</h2>
                            <p>Xin chào <b>${name}</b>,</p>
                            <p>Mật khẩu tài khoản Sport Store của bạn đã được thay đổi thành công vào lúc ${time}.</p>
                        </div>
                        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:24px 0;">
                            <b style="color:#16a34a;">Thay đổi mật khẩu thành công!</b>
                        </div>
                        <div style="background:#eff6ff;padding:12px;border-radius:8px;margin:24px 0;">
                            <b style="color:#2563eb;">Lời khuyên bảo mật:</b> Luôn chọn mật khẩu mạnh và không sử dụng lại mật khẩu trên nhiều trang web khác nhau.
                        </div>
                        <div style="text-align:center;margin:24px 0;">
                            <a href="https://www.vjusport.com/auth/login" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;">Đăng nhập ngay</a>
                        </div>
                        <p style="font-size:13px;color:#666;text-align:center;">Nếu bạn không thực hiện thay đổi này, hãy liên hệ: support@sportstore.com</p>
                        <hr style="margin:24px 0;border:0;border-top:1px solid #eee;" />
                        <p style="font-size:12px;color:#999;text-align:center;">© 2025 Sport Store. Địa chỉ: P. Lưu Hữu Phước, Cầu Diễn, Nam Từ Liêm, Hà Nội</p>
                    </div>
                `
            };
        }
        case 'profile_update': {
            const { name = 'Khách hàng', time = new Date().toLocaleString('vi-VN'), changes = [] } = data;
            let changesHtml = '';
            if (Array.isArray(changes) && changes.length > 0) {
                changesHtml = `<table style='width:100%;margin:16px 0;'>${changes.map((c, i) => `<tr style='background:${i%2===0?'#f9fafb':'#fff'};'><td style='padding:8px 12px;color:#666;font-size:14px;'>${c.field}</td><td style='padding:8px 12px;color:#222;font-size:14px;'>${c.value}</td></tr>`).join('')}</table>`;
            } else {
                changesHtml = `<div style='background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;'>Cập nhật thông tin thành công!</div>`;
            }
            return {
                subject: 'Thông tin tài khoản của bạn đã được cập nhật',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 2px 8px #0001;">
                        <div style="text-align:center;">
                            <img src='https://www.vjusport.com/vju-logo-main.png' width='160' alt='Sport Store Logo' style='margin-bottom:24px;' />
                            <h2>Thông tin tài khoản đã được cập nhật</h2>
                            <p>Xin chào <b>${name}</b>,</p>
                            <p>Thông tin tài khoản của bạn tại Sport Store đã được cập nhật thành công vào lúc ${time}.</p>
                        </div>
                        <div style="margin:24px 0;">${changesHtml}</div>
                        <div style="background:#fef9c3;padding:12px;border-radius:8px;margin:24px 0;">
                            <b style="color:#ca8a04;">Lưu ý bảo mật:</b> Nếu bạn không thực hiện thay đổi này, hãy liên hệ ngay với chúng tôi.
                        </div>
                        <div style="text-align:center;margin:24px 0;">
                            <a href="https://www.vjusport.com/user/profile" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;">Xem tài khoản của tôi</a>
                        </div>
                        <p style="font-size:13px;color:#666;text-align:center;">Cần hỗ trợ? support@sportstore.com</p>
                        <hr style="margin:24px 0;border:0;border-top:1px solid #eee;" />
                        <p style="font-size:12px;color:#999;text-align:center;">© 2025 Sport Store. Địa chỉ: P. Lưu Hữu Phước, Cầu Diễn, Nam Từ Liêm, Hà Nội</p>
                    </div>
                `
            };
        }
        case 'profileUpdate': {
            const { otp } = data;
            return {
                subject: 'Xác thực cập nhật thông tin tài khoản',
                html: `
                    <html>
                      <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 24px;">
                        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
                          <h2 style="color: #7c3aed;">Xác thực cập nhật thông tin tài khoản</h2>
                          <p>Xin chào,</p>
                          <p>Bạn vừa yêu cầu cập nhật thông tin tài khoản trên <b>VJU SPORT</b>.</p>
                          <p>Mã xác thực (OTP) của bạn là:</p>
                          <div style="font-size: 2rem; font-weight: bold; color: #ef4444; margin: 16px 0;">${otp}</div>
                          <p>Vui lòng nhập mã này để hoàn tất cập nhật thông tin.</p>
                          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                          <p style="font-size: 0.95rem; color: #888;">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>
                          <p style="font-size: 0.95rem; color: #888;">Trân trọng,<br />Đội ngũ VJU SPORT</p>
                        </div>
                      </body>
                    </html>
                `
            };
        }
        default:
            throw new Error(`Template ${template} not found`);
    }
}