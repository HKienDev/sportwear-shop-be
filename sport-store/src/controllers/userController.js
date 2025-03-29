import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Order from "../models/order.js";
import jwt from "jsonwebtoken";

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
export const register = async (req, res) => {
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

// Cập nhật totalSpent của user
export const updateUserTotalSpent = async (req, res) => {
  try {
    const { userId, totalSpent, orderId } = req.body;

    console.log("🔄 [Controller] Đang cập nhật totalSpent cho user:", userId);
    console.log("💰 [Controller] Tổng tiền đơn hàng:", totalSpent);
    console.log("📦 [Controller] ID đơn hàng:", orderId);

    // Kiểm tra userId có hợp lệ không
    if (!userId) {
      console.error("❌ [Controller] ID người dùng không tồn tại");
      return res.status(400).json({ 
        success: false,
        message: "ID người dùng không tồn tại" 
      });
    }

    // Kiểm tra userId có phải là MongoDB ObjectId hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ [Controller] ID người dùng không hợp lệ:", userId);
      return res.status(400).json({ 
        success: false,
        message: "ID người dùng không hợp lệ" 
      });
    }

    // Kiểm tra totalSpent có hợp lệ không
    if (!totalSpent || totalSpent <= 0) {
      console.error("❌ [Controller] Tổng tiền đơn hàng không hợp lệ:", totalSpent);
      return res.status(400).json({ 
        success: false,
        message: "Tổng tiền đơn hàng không hợp lệ" 
      });
    }

    // Kiểm tra orderId có hợp lệ không
    if (!orderId) {
      console.error("❌ [Controller] ID đơn hàng không tồn tại");
      return res.status(400).json({ 
        success: false,
        message: "ID đơn hàng không tồn tại" 
      });
    }

    // Kiểm tra orderId có phải là MongoDB ObjectId hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.error("❌ [Controller] ID đơn hàng không hợp lệ:", orderId);
      return res.status(400).json({ 
        success: false,
        message: "ID đơn hàng không hợp lệ" 
      });
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      console.error("❌ [Controller] Không tìm thấy người dùng với ID:", userId);
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy người dùng" 
      });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      console.error("❌ [Controller] Không tìm thấy đơn hàng với ID:", orderId);
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy đơn hàng" 
      });
    }

    // Kiểm tra xem đơn hàng đã được tính vào totalSpent chưa
    if (order.isTotalSpentUpdated) {
      console.log("ℹ️ [Controller] Đơn hàng đã được tính vào totalSpent");
      return res.status(200).json({ 
        success: true,
        message: "Đơn hàng đã được tính vào totalSpent" 
      });
    }

    // Cập nhật totalSpent của user
    user.totalSpent = (user.totalSpent || 0) + totalSpent;

    // Cập nhật hạng thành viên dựa trên totalSpent
    if (user.totalSpent >= 10000000) {
      user.membershipLevel = "Hạng Kim Cương";
    } else if (user.totalSpent >= 5000000) {
      user.membershipLevel = "Hạng Bạch Kim";
    } else if (user.totalSpent >= 2000000) {
      user.membershipLevel = "Hạng Vàng";
    } else if (user.totalSpent >= 500000) {
      user.membershipLevel = "Hạng Bạc";
    } else {
      user.membershipLevel = "Hạng Sắt";
    }

    // Lưu thay đổi
    await user.save();

    // Đánh dấu đơn hàng đã được tính vào totalSpent
    order.isTotalSpentUpdated = true;
    await order.save();

    console.log("✅ [Controller] Cập nhật totalSpent thành công");
    res.status(200).json({ 
      success: true,
      message: "Cập nhật totalSpent thành công",
      user: {
        _id: user._id,
        totalSpent: user.totalSpent,
        membershipLevel: user.membershipLevel
      }
    });
  } catch (error) {
    console.error("❌ [Controller] Lỗi khi cập nhật totalSpent:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi khi cập nhật totalSpent",
      error: error.message 
    });
  }
};

// Admin reset password cho user
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Kiểm tra quyền admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này." 
      });
    }

    // Kiểm tra mật khẩu mới
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự"
      });
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Cập nhật mật khẩu trong database
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
      user: updatedUser
    });

  } catch (error) {
    console.error("❌ [Controller] Lỗi khi đặt lại mật khẩu:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đặt lại mật khẩu"
    });
  }
};

// Đổi mật khẩu
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Kiểm tra dữ liệu đầu vào
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới"
      });
    }

    // Tìm user trong database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác"
      });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu mới
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công"
    });
  } catch (error) {
    console.error("❌ [Controller] Lỗi đổi mật khẩu:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Đăng nhập
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ email và mật khẩu"
      });
    }

    // Tìm user trong database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác"
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác"
      });
    }

    // Kiểm tra trạng thái tài khoản
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị khóa"
      });
    }

    // Tạo access token
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Tạo refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Lưu refresh token vào database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token vào cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Trả về thông tin user và access token
    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          address: user.address,
          dob: user.dob,
          gender: user.gender
        },
        accessToken
      }
    });
  } catch (error) {
    console.error("❌ [Controller] Lỗi đăng nhập:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Đăng xuất
export const logout = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Xóa refresh token trong database
    await User.findByIdAndUpdate(userId, { refreshToken: null });

    // Xóa refresh token trong cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0
    });

    return res.status(200).json({
      success: true,
      message: "Đăng xuất thành công"
    });
  } catch (error) {
    console.error("❌ [Controller] Lỗi đăng xuất:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy refresh token"
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Tìm user trong database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    // Kiểm tra refresh token có khớp với token trong database không
    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token không hợp lệ"
      });
    }

    // Tạo access token mới
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Tạo refresh token mới
    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Lưu refresh token mới vào database
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set refresh token mới vào cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Trả về access token mới
    return res.status(200).json({
      success: true,
      message: "Refresh token thành công",
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error("❌ [Controller] Lỗi refresh token:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// Cập nhật thông tin user đang đăng nhập
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullname, username, phone, avatar, address, dob, gender } = req.body;

    // Tìm user trong database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    // Cập nhật thông tin
    if (fullname) user.fullname = fullname;
    if (username) user.username = username;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;

    if (address) {
      user.address = {
        province: address.province || "",
        district: address.district || "",
        ward: address.ward || "",
        street: address.street || ""
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          fullname: user.fullname,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          address: user.address,
          dob: user.dob,
          gender: user.gender
        }
      }
    });
  } catch (error) {
    console.error("❌ [Controller] Lỗi cập nhật thông tin:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};