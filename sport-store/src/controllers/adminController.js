import User from '../models/user.js';
import { ERROR_MESSAGES } from '../utils/constants.js';
import mongoose from 'mongoose';

// Lấy danh sách tất cả users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Lấy thông tin chi tiết của một user
export const getUserById = async (req, res, next) => {
  try {
    console.log('Searching for user with ID:', req.params.id);
    
    // Kiểm tra xem ID có phải là ObjectId hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid ObjectId format:', req.params.id);
      return res.status(400).json({ 
        success: false,
        message: "ID không hợp lệ!",
        path: `/api/users/${req.params.id}`
      });
    }
    
    // Thử tìm user bằng ID
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      console.log('User not found by ID:', req.params.id);
      return res.status(404).json({ 
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND_ERROR,
        path: `/api/users/${req.params.id}`
      });
    }
    
    console.log('User found:', user._id);
    res.status(200).json({
      success: true,
      data: user,
      path: `/api/users/${req.params.id}`
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    next(error);
  }
};

// Lấy user theo số điện thoại
export const getUserByPhone = async (req, res, next) => {
  try {
    const user = await User.findOne({ phone: req.params.phone }).select('-password');
    if (!user) {
      return res.status(404).json({ message: ERROR_MESSAGES.NOT_FOUND_ERROR });
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Cập nhật thông tin user
export const updateUser = async (req, res, next) => {
  try {
    const { username, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: ERROR_MESSAGES.NOT_FOUND_ERROR });
    }

    user.username = username || user.username;
    user.email = email || user.email;
    user.role = role || user.role;
    user.isActive = isActive !== undefined ? isActive : user.isActive;

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// Xóa user
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: ERROR_MESSAGES.NOT_FOUND_ERROR });
    }
    await user.deleteOne();
    res.status(200).json({ message: 'Xóa user thành công' });
  } catch (error) {
    next(error);
  }
};

// Khóa/Mở khóa tài khoản user
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: ERROR_MESSAGES.NOT_FOUND_ERROR });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({ 
      message: user.isActive ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công',
      user 
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật số lượng đơn hàng cho tất cả users
export const updateAllUsersOrderCount = async (req, res, next) => {
  try {
    await User.updateMany({}, { $set: { orderCount: 0 } });
    res.status(200).json({ message: 'Cập nhật số lượng đơn hàng thành công' });
  } catch (error) {
    next(error);
  }
};

// Cập nhật tổng chi tiêu của user
export const updateUserTotalSpent = async (req, res, next) => {
  try {
    const { totalSpent } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: ERROR_MESSAGES.NOT_FOUND_ERROR });
    }

    user.totalSpent = totalSpent;
    await user.save();
    
    res.status(200).json({ message: 'Cập nhật tổng chi tiêu thành công', user });
  } catch (error) {
    next(error);
  }
};

// Reset mật khẩu user
export const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: ERROR_MESSAGES.NOT_FOUND_ERROR });
    }

    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ message: 'Reset mật khẩu thành công' });
  } catch (error) {
    next(error);
  }
}; 