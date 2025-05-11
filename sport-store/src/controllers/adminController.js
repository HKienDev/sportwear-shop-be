import User from "../models/user.js";
import { ERROR_MESSAGES } from '../utils/constants.js';

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
    const customId = req.params.customId;
    console.log('Searching for user with customId:', customId);
    
    if (!customId) {
      console.log('Custom ID is missing');
      return res.status(400).json({ 
        success: false,
        message: "ID không tồn tại.",
        path: req.url
      });
    }

    // Tìm user dựa vào customId (VJUSPORTUSER-XXXXX)
    const user = await User.findOne({ 
      customId: customId
    }).select('-password');
    
    if (!user) {
      console.log('User not found with customId:', customId);
      return res.status(404).json({ 
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND_ERROR,
        path: req.url
      });
    }
    
    console.log('User found:', user._id);
    res.status(200).json({
      success: true,
      data: user,
      path: req.url
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
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND_ERROR,
        data: {
          exists: false
        }
      });
    }
    res.status(200).json({
      success: true,
      data: {
        exists: true,
        user
      }
    });
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
    const customId = req.params.customId;
    
    console.log('Deleting user with customId:', customId);
    
    if (!customId) {
      console.log('Custom ID is missing');
      return res.status(400).json({ 
        success: false,
        message: "ID không tồn tại.",
        path: req.url
      });
    }

    // Tìm user dựa vào customId (VJUSPORTUSER-XXXXX)
    const user = await User.findOne({ 
      customId: customId
    });

    if (!user) {
      console.log('User not found with customId:', customId);
      return res.status(404).json({ 
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND_ERROR,
        path: req.url
      });
    }

    await user.deleteOne();
    
    console.log('User deleted successfully:', customId);
    res.status(200).json({ 
      success: true,
      message: 'Xóa user thành công',
      path: req.url
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
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
    const { password } = req.body;
    const customId = req.params.customId;
    
    console.log('Resetting password for user with customId:', customId);
    
    if (!customId) {
      console.log('Custom ID is missing');
      return res.status(400).json({ 
        success: false,
        message: "ID không tồn tại.",
        path: req.url
      });
    }

    // Tìm user dựa vào customId (VJUSPORTUSER-XXXXX)
    const user = await User.findOne({ 
      customId: customId
    });
    
    if (!user) {
      console.log('User not found with customId:', customId);
      return res.status(404).json({ 
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND_ERROR,
        path: req.url
      });
    }

    user.password = password;
    await user.save();
    
    console.log('Password reset successful for user:', user._id);
    res.status(200).json({ 
      success: true,
      message: 'Reset mật khẩu thành công',
      path: req.url
    });
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    next(error);
  }
}; 