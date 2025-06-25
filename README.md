# VJU Sport Store - Backend (Node.js, Express, E-commerce API)

VJU Sport Store Backend là hệ thống API phục vụ cho nền tảng thương mại điện tử VJU Sport Store, cung cấp các dịch vụ quản lý sản phẩm, đơn hàng, người dùng, xác thực, thanh toán, v.v. Dự án được xây dựng với Node.js, Express, MongoDB và nhiều công nghệ hiện đại khác.

---

## 🚀 Demo & API Docs

- **Lưu ý:** Dự án backend chỉ chạy local hoặc deploy server riêng.
---

## 🌟 Tính năng nổi bật

- RESTful API cho toàn bộ nghiệp vụ e-commerce (sản phẩm, đơn hàng, user, admin, ...)
- Xác thực JWT, Google OAuth, phân quyền user/admin
- Quản lý sản phẩm, danh mục, khuyến mãi, đơn hàng, khách hàng
- Tích hợp thanh toán Stripe
- Gửi email xác thực, quên mật khẩu, thông báo đơn hàng
- Hỗ trợ upload ảnh (Cloudinary)
- Realtime notification (Socket.io)
- API chuẩn hóa, validate dữ liệu (Zod/Joi)
- Logging, error handling, bảo mật (helmet, rate limit, ...)
- Dễ dàng mở rộng, tích hợp với frontend

---

## 📈 Trạng thái dự án

- **Phiên bản hiện tại:** v1.0.0 (Beta)
- **Tình trạng:** Đang phát triển, đã hoàn thiện các API chính.
- **Kế hoạch tương lai:**
  - Tích hợp thêm phương thức thanh toán (PayPal, Momo)
  - Cải thiện hiệu suất tìm kiếm với Elasticsearch
  - Thêm tính năng đa ngôn ngữ (i18n)
  - Viết thêm test tự động (unit, integration)
  - Tối ưu bảo mật, logging, monitoring

---

## 🛠️ Công nghệ sử dụng

- **Node.js** `18.x`+
- **Express.js** `4.x`
- **MongoDB** `6.x` (Mongoose ODM)
- **JWT** (Xác thực)
- **Google OAuth2**
- **Stripe** (Thanh toán)
- **Socket.io** (Realtime)
- **Cloudinary** (Upload ảnh)
- **Zod/Joi** (Schema validation)
- **Nodemailer** (Gửi email)
- **Helmet**, **CORS**, **Rate Limit** (Bảo mật)
- **Winston/Morgan** (Logging)
- **dotenv** (Quản lý biến môi trường)
- ... (Xem chi tiết trong `package.json`)

---

## 📦 Cấu trúc thư mục chính

```text
sport-store-be-graduation/
  sport-store/
    src/
      config/           # Cấu hình hệ thống (db, jwt, cloudinary, stripe, ...)
      constants/        # Hằng số dùng chung
      controllers/      # Xử lý logic cho từng route (user, product, order, ...)
      email-templates/  # Giao diện email gửi cho user/admin
      middlewares/      # Middleware (auth, error, validate, ...)
      models/           # Định nghĩa schema Mongoose (user, product, order, ...)
      routes/           # Định nghĩa các route API
      schemas/          # Zod/Joi schemas validate dữ liệu
      scripts/          # Script tiện ích (seed data, migrate, ...)
      services/         # Service layer (gửi email, thanh toán, ...)
      socket/           # Socket.io event handler
      utils/            # Hàm tiện ích, helper
    uploads/            # Ảnh upload tạm thời (nếu có)
    logs/               # Log file (nếu có)
    package.json        # Thông tin dự án, scripts, dependencies
    .env.example        # Mẫu biến môi trường
    README.md           # Tài liệu dự án
    ...
```

---

## ⚡️ Hướng dẫn cài đặt & chạy dự án

### 1. Clone repo:

```bash
git clone https://github.com/HKienDev/sport-store-be-graduation.git
cd sport-store-be-graduation/sport-store
```

### 2. Cài đặt dependencies:

```bash
npm install
```

### 3. Cấu hình biến môi trường (`.env` hoặc `.env.local`):

Tạo file `.env.local` (hoặc copy từ `.env.example`) với nội dung mẫu:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sport-store

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Google OAuth (Bắt buộc cho tính năng đăng nhập Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

> **Lưu ý:** 
> - Không commit file `.env.local` lên git!
> - Để sử dụng Google OAuth, bạn cần tạo project trên Google Cloud Console và lấy Client ID, Client Secret
> - Cấu hình Authorized redirect URIs trong Google Cloud Console: `http://localhost:4000/api/auth/google/callback`

### 4. Chạy dev:

```