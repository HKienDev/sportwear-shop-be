import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import dotenv from "dotenv";

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
      email: "adminVjuSport@gmail.com",
      password: hashedPassword,
      fullname: "Admin System",
      phone: "0123456789",
      role: "admin",
      isActive: true,
      isVerified: true,
      authStatus: "verified"
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