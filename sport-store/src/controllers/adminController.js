import User from "../models/User.js";
import { ERROR_MESSAGES } from '../utils/constants.js';
import { logError, logInfo } from '../utils/logger.js';

// Helper function để tìm user theo customId
const findUserByCustomId = async (customId) => {
  if (!customId) {
    return null;
  }

  let user;
  
  // Nếu customId có format VJUSPORTUSER-XXXXX, tìm user theo _id
  if (customId.startsWith('VJUSPORTUSER-')) {
    const shortId = customId.replace('VJUSPORTUSER-', '');
    // Convert ObjectId to string for regex matching
    user = await User.findOne({
      $expr: {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: `^${shortId}`
        }
      }
    });
  } else {
    // Tìm user dựa vào customId field trong database
    user = await User.findOne({ customId: customId });
  }
  
  return user;
};

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
    const customId = req.params.customId;
    
    logInfo(`Updating user with customId: ${customId}`);
    
    if (!customId) {
      logError('Custom ID is missing');
      return res.status(400).json({ 
        success: false,
        message: "ID không tồn tại.",
        path: req.url
      });
    }

    const user = await findUserByCustomId(customId);
    
    if (!user) {
      logError(`User not found with customId: ${customId}`);
      return res.status(404).json({ 
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND_ERROR,
        path: req.url
      });
    }

    // Cập nhật các trường được gửi từ frontend
    const updateFields = req.body;
    
    // Cập nhật từng trường nếu có
    if (updateFields.fullname !== undefined) user.fullname = updateFields.fullname;
    if (updateFields.phone !== undefined) user.phone = updateFields.phone;
    if (updateFields.email !== undefined) user.email = updateFields.email;
    if (updateFields.role !== undefined) user.role = updateFields.role;
    if (updateFields.isActive !== undefined) user.isActive = updateFields.isActive;
    if (updateFields.address !== undefined) user.address = updateFields.address;
    if (updateFields.dob !== undefined) user.dob = updateFields.dob;
    if (updateFields.gender !== undefined) user.gender = updateFields.gender;
    if (updateFields.membershipLevel !== undefined) user.membershipLevel = updateFields.membershipLevel;
    if (updateFields.totalSpent !== undefined) user.totalSpent = updateFields.totalSpent;

    const updatedUser = await user.save();
    
    logInfo(`User updated successfully: ${customId}`);
    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin khách hàng thành công',
      data: updatedUser,
      path: req.url
    });
  } catch (error) {
    logError('Error in updateUser', error);
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

    const user = await findUserByCustomId(customId);

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
    const customId = req.params.customId;
    
    if (!customId) {
      return res.status(400).json({ 
        success: false,
        message: "ID không tồn tại."
      });
    }

    const user = await findUserByCustomId(customId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND_ERROR 
      });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.status(200).json({ 
      success: true,
      message: user.isActive ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công',
      data: user 
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

    let user;
    
    // Nếu customId có format VJUSPORTUSER-XXXXX, tìm user theo _id
    if (customId.startsWith('VJUSPORTUSER-')) {
      const shortId = customId.replace('VJUSPORTUSER-', '');
      user = await User.findOne({
        _id: { $regex: `^${shortId}` }
      });
    } else {
      // Tìm user dựa vào customId field trong database
      user = await User.findOne({ customId: customId });
    }
    
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