const mongoose = require("mongoose");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

// Lấy danh sách tất cả người dùng (ẩn password)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v -password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
};

// Lấy thông tin người dùng theo ID
exports.getUserById = async (req, res) => {
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

// Tạo một người dùng mới (chỉ admin có quyền tạo tài khoản đã xác thực)
exports.createUser = async (req, res) => {
    let { email, password, username, isAdminCreate } = req.body;
  
    // Kiểm tra xem người gửi yêu cầu có phải là admin nếu muốn tạo tài khoản đã xác thực
    if (isAdminCreate && req.user.role !== "admin") {
      return res.status(403).json({ message: "Chỉ admin mới có quyền tạo tài khoản đã xác thực sẵn." });
    }
  
    if (!email || !password || !username) {
      return res.status(400).json({ message: "Thiếu các trường bắt buộc (email, password, username)." });
    }
  
    try {
      // Kiểm tra email đã tồn tại chưa
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email đã được sử dụng." });
      }
  
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Tạo user mới với giá trị mặc định
      const newUser = new User({
        email,
        password: hashedPassword,
        username,
        role: "user", // Mặc định role là user
        isVerified: isAdminCreate ? true : false, // Chỉ admin mới tạo tài khoản xác thực sẵn
        createdAt: Date.now(),
        address: {
          province: "",
          district: "",
          ward: "",
          street: "",
        },
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

// Cập nhật thông tin người dùng theo ID (chỉ admin có thể cập nhật tất cả thông tin)
exports.updateUserByAdmin = async (req, res) => {
    try {
      console.log("Kiểm tra ID nhận được:", req.params.id);
  
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
          street: address.street || ""
        };
      }
  
      console.log("Trường cập nhật:", updateFields);
  
      const updatedUser = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true })
        .select("-__v -password");
  
      if (!updatedUser) {
        console.log("Không tìm thấy user với ID:", req.params.id);
        return res.status(404).json({ message: "Không tìm thấy người dùng." });
      }
  
      console.log("User đã cập nhật thành công:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Lỗi cập nhật user:", error);
      res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
    }
  };


// Xóa người dùng theo ID (chỉ admin có quyền xóa người dùng)
exports.deleteUser = async (req, res) => {
  try {
    // Kiểm tra nếu không phải admin
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

// Admin tạo admin:
exports.createNewAdmin = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Chỉ admin hiện tại mới có quyền tạo admin khác
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền tạo admin mới." });
    }

    if (!email || !password || !username) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng." });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo admin mới
    const newAdmin = new User({
      email,
      password: hashedPassword,
      username,
      role: "admin",
      isActive: true,
      isVerified: true, // Mặc định admin được xác thực sẵn
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