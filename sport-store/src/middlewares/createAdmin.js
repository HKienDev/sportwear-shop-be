import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import dotenv from "dotenv";
import rateLimit from 'express-rate-limit';

// Load biến môi trường
dotenv.config();

// Tạo tài khoản admin
async function createAdmin() {
  try {
    // Kết nối tới MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/sport-store");

    // Kiểm tra xem đã có tài khoản admin chưa
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Đã có tài khoản admin trong cơ sở dữ liệu.");
      return;
    }

    // Mã hóa mật khẩu cho tài khoản admin
    const hashedPassword = await bcrypt.hash("adminVjuSport", 10);

    // Tạo tài khoản admin mới
    const newAdmin = new User({
      email: "adminvjusport@gmail.com",
      password: hashedPassword,
      username: "adminvjusport",
      role: "admin",
      isActive: true,
      isVerified: true,
      permissions: ["full_access"],
      firstName: "Admin",
      lastName: "System",
      phoneNumber: "0123456789",
      address: "System Address",
      avatar: "default-avatar.png",
      gender: "male",
      dateOfBirth: new Date("1990-01-01"),
      lastLogin: new Date(),
      loginAttempts: 0,
      lockUntil: null,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      verificationToken: null,
      verificationTokenExpires: null,
      otp: null,
      otpExpires: null,
      googleId: null,
      facebookId: null
    });

    // Lưu tài khoản admin vào cơ sở dữ liệu
    await newAdmin.save();
    console.log("Tạo tài khoản admin thành công!");

    // Đóng kết nối MongoDB
    await mongoose.connection.close();
  } catch (error) {
    console.error("Lỗi khi tạo tài khoản admin:", error);
  }
}

// Gọi hàm tạo admin
createAdmin();

const refreshTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Quá nhiều yêu cầu refresh token. Vui lòng thử lại sau.'
});

// Áp dụng cho route refresh token
router.post('/refresh-token', refreshTokenLimiter, refreshToken);

localStorage.setItem('user', JSON.stringify(response.data.data.user));

document.cookie = `user=${JSON.stringify(userData)}; path=/;`;

console.log('Auth check response:', response);

if (response.success && response.data?.user?.role === "admin") {
  console.log("✅ Admin được phép truy cập");
  setIsLoading(false);
}