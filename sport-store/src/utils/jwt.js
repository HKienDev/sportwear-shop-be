import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES } from './constants.js';
import env from '../config/env.js';

// Tạo access token
export const generateAccessToken = (userId, email) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { userId, email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

// Tạo refresh token
export const generateRefreshToken = (userId, email) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { userId, email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
};

// Verify access token
export const verifyAccessToken = (token) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token đã hết hạn');
    }
    throw new Error('Token không hợp lệ');
  }
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Tạo token cho reset password
export const generateResetPasswordToken = (userId) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Verify token reset password
export const verifyResetPasswordToken = (token) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return {
      valid: true,
      expired: false,
      payload: decoded
    };
  } catch (error) {
    return {
      valid: false,
      expired: error.name === 'TokenExpiredError',
      payload: null
    };
  }
}; 