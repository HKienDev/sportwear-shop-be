import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function () { return !this.googleId; } },
  fullname: { type: String, default: "" },
  username: { type: String, required: function () { return !this.googleId; } }, 
  phone: { type: String, default: "" },
  avatar: { type: String, default: "" }, 
  role: { type: String, default: "user" },
  isActive: { type: Boolean, default: true },

  refreshToken: { type: String },

  // Trạng thái xác thực tài khoản
  isVerified: { type: Boolean, default: false },

  // OTP xác thực
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },

  // Reset mật khẩu
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },

  // Địa chỉ
  address: {
      province: { type: String, default: "" },
      district: { type: String, default: "" },
      ward: { type: String, default: "" },
      street: { type: String, default: "" }
  },

  // Thông tin cá nhân
  dob: { type: Date, default: null }, 
  gender: { type: String, enum: ["male", "female", "other"], default: "other" }, 

  // Hạng thành viên & tiến độ mua hàng
  membershipLevel: { 
      type: String, 
      enum: ["Hạng Sắt", "Hạng Bạc", "Hạng Vàng", "Hạng Bạch Kim", "Hạng Kim Cương"], 
      default: "Hạng Sắt" 
  }, 
  totalSpent: { type: Number, default: 0 }, 

  // Lưu tạm dữ liệu cập nhật
  pendingUpdate: { type: Object, default: {} },

  orderCount: { type: Number, default: 0 }
});

// Mã hóa mật khẩu trước khi lưu
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.password.startsWith("$2b$10$")) {
      return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// So sánh mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;