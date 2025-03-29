import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.js";

const updatePassword = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect("mongodb://localhost:27017/sport-store");
    console.log("✅ Đã kết nối MongoDB");

    // Tìm user
    const user = await User.findOne({ email: "adminVjuSport@gmail.com" });
    if (!user) {
      console.log("❌ Không tìm thấy user");
      return;
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash("adminVjuSport", 10);
    user.password = hashedPassword;
    await user.save();

    console.log("✅ Đã cập nhật mật khẩu thành công");
  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    // Đóng kết nối
    await mongoose.disconnect();
    console.log("✅ Đã đóng kết nối MongoDB");
  }
};

updatePassword(); 