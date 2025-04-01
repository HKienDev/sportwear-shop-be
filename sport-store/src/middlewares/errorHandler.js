import { ERROR_MESSAGES } from '../utils/constants.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`[${req.id}] Error:`, err);

  // Xử lý lỗi validation của Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: Object.values(err.errors).map(error => error.message)
    });
  }

  // Xử lý lỗi duplicate key của MongoDB
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.DUPLICATE_ERROR
    });
  }

  // Xử lý lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.TOKEN_EXPIRED
    });
  }

  // Xử lý lỗi mặc định
  return res.status(500).json({
    success: false,
    message: ERROR_MESSAGES.SERVER_ERROR
  });
}; 