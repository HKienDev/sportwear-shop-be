import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Order from "../models/order.js";

// Lấy danh sách tất cả người dùng (ẩn password)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-__v -password")
      .lean()
      .exec();

    // Đặt isActive thành false cho tất cả user
    const modifiedUsers = users.map(user => ({
      ...user,
      isActive: false
    }));

    res.json(modifiedUsers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

// Lấy thông tin user đang đăng nhập
export const getUserProfile = async (req, res) => {
  try {
      console.log("🔹 [Controller] Nhận request GET /profile từ user:", req.user);

      const user = await User.findById(req.user.userId).select("-password -refreshToken");
      if (!user) {
          console.error("❌ [Controller] Không tìm thấy người dùng");
          return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      console.log("✅ [Controller] Trả về thông tin user:", user);
      res.status(200).json(user);
  } catch (error) {
      console.error("❌ [Controller] Lỗi server:", error.message);
      res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy thông tin user theo ID (admin)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-__v -password").lean();
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

// Tạo người dùng mới
export const createUser = async (req, res) => {
  let { email, password, username, isAdminCreate } = req.body;

  if (isAdminCreate && req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ admin mới có quyền tạo tài khoản." });
  }

  if (!email || !password || !username) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      role: "user",
      isVerified: isAdminCreate ? true : false,
      createdAt: Date.now(),
      address: { province: "", district: "", ward: "", street: "" },
      dob: null,
      gender: "other",
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      _id: savedUser._id,
      email: savedUser.email,
      username: savedUser.username,
      role: savedUser.role,
      isVerified: savedUser.isVerified,
      createdAt: savedUser.createdAt,
      address: savedUser.address,
      dob: savedUser.dob,
      gender: savedUser.gender,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

// Cập nhật thông tin user theo ID (admin)
export const updateUserByAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID không hợp lệ!" });
    }

    let { password, fullname, username, phone, avatar, role, address, dob, gender, isActive } = req.body;
    const updateFields = {};

    if (fullname) updateFields.fullname = fullname;
    if (username) updateFields.username = username;
    if (phone) updateFields.phone = phone;
    if (avatar) updateFields.avatar = avatar;
    if (role) updateFields.role = role;
    if (dob) updateFields.dob = dob;
    if (gender) updateFields.gender = gender;
    if (typeof isActive === "boolean") updateFields.isActive = isActive;

    if (password) {
      updateFields.password = await bcrypt.hash(password, 10);
    }

    if (address) {
      updateFields.address = {
        province: address.province || "",
        district: address.district || "",
        ward: address.ward || "",
        street: address.street || "",
      };
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true }).select("-__v -password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

// Xóa user theo ID (admin)
export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền xóa người dùng." });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    res.json({ message: "Xóa người dùng thành công." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

// Admin tạo admin mới
export const createNewAdmin = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền tạo admin mới." });
    }

    if (!email || !password || !username) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new User({
      email,
      password: hashedPassword,
      username,
      role: "admin",
      isActive: true,
      isVerified: true,
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Tạo tài khoản admin thành công!",
      admin: {
        _id: newAdmin._id,
        email: newAdmin.email,
        username: newAdmin.username,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

// Lấy thông tin user theo số điện thoại
export const getUserByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ 
        success: false,
        message: "Số điện thoại không được để trống" 
      });
    }

    // Tìm user theo số điện thoại
    const user = await User.findOne({ phone })
      .select('_id username email phone')
      .lean();

    if (!user) {
      return res.status(200).json({ 
        success: false,
        message: "Không tìm thấy người dùng với số điện thoại này",
        exists: false 
      });
    }

    // Trả về thông tin user nếu tồn tại
    res.json({
      success: true, 
      exists: true,
      message: "Tìm thấy người dùng",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error("❌ [Controller] Lỗi khi tìm user theo số điện thoại:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi máy chủ khi tìm kiếm người dùng",
      error: error.message 
    });
  }
};

// Cập nhật orderCount cho tất cả user
export const updateAllUsersOrderCount = async (req, res) => {
  try {
    const users = await User.find({});
    
    for (const user of users) {
      // Đếm số đơn hàng không bị hủy của user
      const orderCount = await Order.countDocuments({
        user: user._id,
        status: { $ne: "cancelled" }
      });

      // Cập nhật orderCount cho user
      await User.findByIdAndUpdate(user._id, { orderCount });
    }

    res.json({
      success: true,
      message: "Đã cập nhật orderCount cho tất cả user"
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật orderCount:", error);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật orderCount",
      error: error.message
    });
  }
};