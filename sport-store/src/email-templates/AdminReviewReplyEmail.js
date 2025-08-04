const AdminReviewReplyEmail = (userName, productName, reviewTitle, adminReply, adminName) => {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Phản hồi từ Admin về đánh giá của bạn</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: #ffffff;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e9ecef;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .title {
                color: #2c3e50;
                font-size: 20px;
                margin-bottom: 5px;
            }
            .subtitle {
                color: #6c757d;
                font-size: 14px;
            }
            .content {
                margin-bottom: 30px;
            }
            .greeting {
                font-size: 16px;
                margin-bottom: 20px;
                color: #2c3e50;
            }
            .review-section {
                background-color: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .review-title {
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .product-name {
                color: #6c757d;
                font-size: 14px;
                margin-bottom: 15px;
            }
            .admin-reply {
                background-color: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .admin-reply-title {
                font-weight: bold;
                color: #1976d2;
                margin-bottom: 10px;
                font-size: 14px;
            }
            .admin-reply-content {
                color: #2c3e50;
                line-height: 1.5;
            }
            .admin-name {
                color: #6c757d;
                font-size: 12px;
                margin-top: 10px;
                font-style: italic;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                color: #6c757d;
                font-size: 12px;
            }
            .button {
                display: inline-block;
                background-color: #007bff;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }
            .button:hover {
                background-color: #0056b3;
            }
            .highlight {
                color: #007bff;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏪 SportWear Shop</div>
                <div class="title">Phản hồi từ Admin</div>
                <div class="subtitle">Chúng tôi đã trả lời đánh giá của bạn</div>
            </div>

            <div class="content">
                <div class="greeting">
                    Xin chào <span class="highlight">${userName}</span>,
                </div>

                <p>
                    Admin đã trả lời đánh giá của bạn về sản phẩm. Dưới đây là chi tiết:
                </p>

                <div class="review-section">
                    <div class="review-title">Đánh giá của bạn:</div>
                    <div class="product-name">Sản phẩm: ${productName}</div>
                    <div class="review-title">"${reviewTitle}"</div>
                </div>

                <div class="admin-reply">
                    <div class="admin-reply-title">💬 Phản hồi từ Admin:</div>
                    <div class="admin-reply-content">
                        ${adminReply}
                    </div>
                    <div class="admin-name">
                        - ${adminName}
                    </div>
                </div>

                <p>
                    Cảm ơn bạn đã dành thời gian đánh giá sản phẩm của chúng tôi. 
                    Chúng tôi luôn mong muốn cải thiện dịch vụ để phục vụ bạn tốt hơn.
                </p>

                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/profile" class="button">
                        Xem tài khoản của tôi
                    </a>
                </div>
            </div>

            <div class="footer">
                <p>
                    Email này được gửi tự động từ hệ thống SportWear Shop.<br>
                    Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.
                </p>
                <p>
                    © 2024 SportWear Shop. Tất cả quyền được bảo lưu.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export default AdminReviewReplyEmail; 