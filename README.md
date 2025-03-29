# Sport Store Backend

Backend cho ứng dụng bán đồ thể thao, được xây dựng với Express.js và MongoDB.

## Tính năng

- Xác thực người dùng (JWT)
- Quản lý người dùng (CRUD)
- Gửi email xác thực
- Quản lý sản phẩm
- Quản lý đơn hàng
- Quản lý danh mục
- Quản lý đánh giá
- Quản lý giỏ hàng

## Yêu cầu

- Node.js >= 18
- MongoDB >= 6
- npm hoặc yarn

## Cài đặt

1. Clone repository:

```bash
git clone https://github.com/your-username/sport-store-be.git
cd sport-store-be
```

1. Cài đặt dependencies:

```bash
npm install
```

1. Tạo file `.env` và cập nhật các biến môi trường:

```env
# Server
PORT=4000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sport-store

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Client URL
CLIENT_URL=http://localhost:3000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

1. Khởi động server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Auth

- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh-token` - Làm mới token
- `GET /api/auth/check` - Kiểm tra trạng thái đăng nhập

### Users

- `GET /api/users/profile` - Lấy thông tin người dùng
- `PUT /api/users/profile` - Cập nhật thông tin người dùng
- `PUT /api/users/change-password` - Đổi mật khẩu

### Admin

- `GET /api/users` - Lấy danh sách người dùng
- `GET /api/users/:id` - Lấy thông tin người dùng theo ID
- `PUT /api/users/:id` - Cập nhật thông tin người dùng
- `DELETE /api/users/:id` - Xóa người dùng

## Cấu trúc thư mục

```text
├── src/
│   ├── config/         # Cấu hình
│   ├── controllers/    # Controllers
│   ├── middlewares/    # Middlewares
│   ├── models/         # Models
│   ├── routes/         # Routes
│   └── utils/          # Utilities
├── uploads/            # Thư mục lưu file
├── .env               # Biến môi trường
├── .gitignore        # Git ignore
├── package.json      # Dependencies
├── README.md         # Documentation
└── server.js         # Server entry point
```

## Tác giả

Hoang Kien

## License

ISC
