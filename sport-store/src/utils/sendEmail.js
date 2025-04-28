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
    newOrder: (order) => {
        // Format địa chỉ giao hàng
        const address = order.shippingAddress.address;
        const shippingAddress = `${address.street}, ${address.ward.name}, ${address.district.name}, ${address.province.name}`;
        
        // Format danh sách sản phẩm
        const itemsList = order.items.map(item => `
            <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.3s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                <td style="padding: 20px; vertical-align: top;">
                    <div style="display: flex; align-items: start; gap: 16px;">
                        <div style="width: 80px; height: 80px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background-color: #f5f5f5; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
                            <img src="${item.product.mainImage}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #1a202c; font-size: 15px; margin-bottom: 4px; line-height: 1.4;">${item.name}</div>
                            <div style="color: #64748b; font-size: 13px;">SKU: ${item.sku}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 20px; text-align: center; vertical-align: middle; color: #1a202c; font-weight: 500;">
                    ${item.quantity}
                </td>
                <td style="padding: 20px; text-align: right; vertical-align: middle; color: #1a202c; font-weight: 500;">
                    ${item.price.toLocaleString('vi-VN')}đ
                </td>
                <td style="padding: 20px; text-align: right; vertical-align: middle; color: #1a202c; font-weight: 600;">
                    ${(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </td>
            </tr>
        `).join('');
    
        return {
            subject: "Xác nhận đơn hàng mới Sport Store",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Xác nhận đơn hàng mới</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                        
                        @media screen and (max-width: 650px) {
                            .container {
                                padding: 15px !important;
                                width: 100% !important;
                            }
                            .card {
                                padding: 20px !important;
                                margin-bottom: 16px !important;
                                border-radius: 10px !important;
                            }
                            .grid-2 {
                                grid-template-columns: 1fr !important;
                                gap: 16px !important;
                            }
                            .header-title {
                                font-size: 22px !important;
                            }
                            .product-image {
                                width: 60px !important;
                                height: 60px !important;
                            }
                            .product-name {
                                font-size: 14px !important;
                            }
                            .table-responsive {
                                display: block !important;
                                width: 100% !important;
                                overflow-x: auto !important;
                                -webkit-overflow-scrolling: touch !important;
                            }
                            .hide-on-mobile {
                                display: none !important;
                            }
                            .text-center-mobile {
                                text-align: center !important;
                            }
                            .support-item {
                                justify-content: center !important;
                            }
                            .px-mobile-sm {
                                padding-left: 12px !important;
                                padding-right: 12px !important;
                            }
                        }
                        @media screen and (max-width: 480px) {
                            .header-title {
                                font-size: 20px !important;
                            }
                            .card-title {
                                font-size: 16px !important;
                            }
                            .product-image {
                                width: 50px !important;
                                height: 50px !important;
                            }
                        }
                    </style>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f4f6f8; line-height: 1.5; color: #334155;">
                    <div class="container" style="max-width: 650px; margin: 40px auto; padding: 0 20px;">
                        <!-- Header -->
                        <div class="card" style="background-color: #ffffff; border-radius: 16px; padding: 40px 30px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; border-top: 4px solid #0ea5e9;">
                            <div style="margin-bottom: 28px;">
                                <img src="/Users/hoangkien/Documents/4.Source-Đo-An-Tot-Nghiep[BCSE2021]/sport-store-fe-graduation/sport-store/public/Logo_vju.png" alt="Sport Store Logo" style="max-width: 160px; height: auto;">
                            </div>
                            <h1 class="header-title" style="color: #0f172a; margin: 0 0 14px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Xác nhận đơn hàng mới</h1>
                            <p style="color: #64748b; margin: 0; font-size: 16px; line-height: 1.6;">Cảm ơn bạn đã đặt hàng tại <span style="font-weight: 600; color: #334155;">Sport Store</span></p>
                            
                            <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 30px; text-align: left;">
                                <div style="margin-bottom: 8px;">
                                    <p style="color: #64748b; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Mã đơn hàng</p>
                                    <p style="color: #0f172a; margin: 0; font-weight: 600; font-size: 16px;">#${order.shortId}</p>
                                </div>
                                <div>
                                    <p style="color: #64748b; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Ngày đặt hàng</p>
                                    <p style="color: #0f172a; margin: 0; font-weight: 500;">${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>
                        </div>
    
                        <!-- Order Info & Shipping Info -->
                        <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                            <!-- Order Info -->
                            <div class="card" style="background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <h2 class="card-title" style="color: #0f172a; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Thông tin đơn hàng</h2>
                                <div style="background-color: #f8fafc; border-radius: 12px; padding: 22px;">
                                    <div style="margin-bottom: 18px;">
                                        <p style="color: #64748b; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Phương thức thanh toán</p>
                                        <p style="color: #0f172a; margin: 0; font-weight: 500;">${order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Thanh toán online'}</p>
                                    </div>
                                    <div>
                                        <p style="color: #64748b; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Trạng thái thanh toán</p>
                                        <div style="display: inline-block; padding: 6px 10px; background-color: ${order.paymentStatus === 'pending' ? '#fef3c7' : '#dcfce7'}; border-radius: 50px; margin-top: 4px;">
                                            <p style="margin: 0; font-weight: 500; font-size: 13px; color: ${order.paymentStatus === 'pending' ? '#92400e' : '#166534'};">
                                                ${order.paymentStatus === 'pending' ? 'Chờ thanh toán' : 'Đã thanh toán'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
    
                            <!-- Shipping Info -->
                            <div class="card" style="background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <h2 class="card-title" style="color: #0f172a; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Thông tin giao hàng</h2>
                                <div style="background-color: #f8fafc; border-radius: 12px; padding: 22px;">
                                    <div style="margin-bottom: 18px;">
                                        <p style="color: #64748b; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Người nhận</p>
                                        <p style="color: #0f172a; margin: 0; font-weight: 600;">${order.shippingAddress.fullName}</p>
                                    </div>
                                    <div style="margin-bottom: 18px;">
                                        <p style="color: #64748b; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Số điện thoại</p>
                                        <p style="color: #0f172a; margin: 0; font-weight: 500;">${order.shippingAddress.phone}</p>
                                    </div>
                                    <div>
                                        <p style="color: #64748b; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Địa chỉ</p>
                                        <p style="color: #0f172a; margin: 0; font-weight: 500; line-height: 1.5;">${shippingAddress}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
    
                        <!-- Order Items -->
                        <div class="card" style="background-color: #ffffff; border-radius: 16px; padding: 30px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                            <h2 class="card-title" style="color: #0f172a; margin: 0 0 24px 0; font-size: 18px; font-weight: 700; border-left: 4px solid #0ea5e9; padding-left: 12px;">Chi tiết đơn hàng</h2>
                            <div class="table-responsive" style="margin: 0 -12px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #f1f5f9;">
                                            <th style="padding: 16px; text-align: left; color: #475569; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0;">Sản phẩm</th>
                                            <th class="hide-on-mobile" style="padding: 16px; text-align: center; color: #475569; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; width: 100px;">Số lượng</th>
                                            <th class="hide-on-mobile" style="padding: 16px; text-align: right; color: #475569; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; width: 120px;">Đơn giá</th>
                                            <th style="padding: 16px; text-align: right; color: #475569; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; width: 120px;">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsList}
                                    </tbody>
                                </table>
                            </div>
                        </div>
    
                        <!-- Order Summary -->
                        <div class="card" style="background-color: #ffffff; border-radius: 16px; padding: 30px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                            <h2 class="card-title" style="color: #0f172a; margin: 0 0 24px 0; font-size: 18px; font-weight: 700; border-left: 4px solid #10b981; padding-left: 12px;">Tổng thanh toán</h2>
                            <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b; font-size: 15px;">Tổng tiền hàng:</span>
                                    <span style="color: #0f172a; font-weight: 500; font-size: 15px;">     ${order.subtotal.toLocaleString('vi-VN')}đ</span>
                                </div>
                                ${order.directDiscount > 0 ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b; font-size: 15px;">Giảm giá trực tiếp:</span>
                                    <span style="color: #ef4444; font-weight: 500; font-size: 15px;">     -${order.directDiscount.toLocaleString('vi-VN')}đ</span>
                                </div>
                                ` : ''}
                                ${order.couponDiscount > 0 ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b; font-size: 15px;">Mã giảm giá:</span>
                                    <span style="color: #ef4444; font-weight: 500; font-size: 15px;">     -${order.couponDiscount.toLocaleString('vi-VN')}đ</span>
                                </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b; font-size: 15px;">Phí vận chuyển:</span>
                                    <span style="color: #0f172a; font-weight: 500; font-size: 15px;">     ${order.shippingFee.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 24px; padding: 16px 0; border-top: 2px solid #10b981;">
                                    <span style="color: #0f172a; font-weight: 700; font-size: 16px;">Tổng thanh toán:</span>
                                    <span style="color: #10b981; font-weight: 800; font-size: 22px;">     ${order.totalPrice.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
    
                        <!-- CTA -->
                        <div style="text-align: center; margin-bottom: 24px;">
                            <a href="#" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.2);">Theo dõi đơn hàng</a>
                        </div>
    
                        <!-- Footer -->
                        <div class="card" style="background-color: #ffffff; border-radius: 16px; padding: 30px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                                <p style="color: #0f172a; margin: 0 0 16px 0; font-weight: 600; font-size: 16px;">Hỗ trợ khách hàng</p>
                                <div class="support-item" style="display: flex; align-items: center; margin-bottom: 14px; justify-content: center;">
                                    <div style="width: 32px; height: 32px; background-color: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                                        <svg style="width: 16px; height: 16px; color: #0ea5e9;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                        </svg>
                                    </div>
                                    <a href="mailto:support@sportstore.com" style="color: #0ea5e9; margin: 0; font-size: 15px; font-weight: 500; text-decoration: none;">support@sportstore.com</a>
                                </div>
                                <div class="support-item" style="display: flex; align-items: center; justify-content: center;">
                                    <div style="width: 32px; height: 32px; background-color: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                                        <svg style="width: 16px; height: 16px; color: #0ea5e9;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 5.5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5.5z"/>
                                        </svg>
                                    </div>
                                    <a href="tel:0362195258" style="color: #0ea5e9; margin: 0; font-size: 15px; font-weight: 500; text-decoration: none;">0362195258</a>
                                </div>
                            </div>
                            <div style="text-align: center;">
                                <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">Trân trọng,</p>
                                <p style="color: #0f172a; margin: 0; font-size: 16px; font-weight: 600;">Đội ngũ Sport Store</p>
                                <div style="margin-top: 20px;">
                                    <div style="display: flex; gap: 16px; justify-content: center;">
                                        <a href="#" style="color: #94a3b8; text-decoration: none;">
                                            <div style="width: 36px; height: 36px; background-color: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                                </svg>
                                            </div>
                                        </a>
                                        <a href="#" style="color: #94a3b8; text-decoration: none;">
                                            <div style="width: 36px; height: 36px; background-color: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                                                </svg>
                                            </div>
                                        </a>
                                        <a href="#" style="color: #94a3b8; text-decoration: none;">
                                            <div style="width: 36px; height: 36px; background-color: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                                </svg>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 0 20px 30px;">
                            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0;">© 2025 Sport Store. Tất cả các quyền được bảo lưu.</p>
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    },

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