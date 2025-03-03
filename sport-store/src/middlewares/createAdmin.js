const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

// Thông tin kết nối MongoDB
const DB_URI = "mongodb://localhost:27017/sport-store"; 

// Tạo tài khoản admin
async function createAdmin() {
  try {
    // Kết nối tới MongoDB
    await mongoose.connect(DB_URI);

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
      username: "adminVjuSport",
      role: "admin",
      isActive: true,
      isVerified: true, // Tài khoản này sẽ được xác thực sẵn
      permissions: ["full_access"], // Gán quyền full cho admin
    });

    // Lưu tài khoản admin vào cơ sở dữ liệu
    await newAdmin.save();
    console.log("Tạo tài khoản admin thành công!");

    // Đóng kết nối MongoDB
    mongoose.connection.close();
  } catch (error) {
    console.error("Lỗi khi tạo tài khoản admin:", error);
  }
}

// Gọi hàm tạo admin
createAdmin();