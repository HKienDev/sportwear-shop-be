import { ERROR_MESSAGES } from '../utils/constants.js';
import { logError } from '../utils/logger.js';

export const errorHandler = (err, req, res) => {
  const requestId = req.id || 'unknown';
  logError(`[${requestId}] Error:`, err);

  // Xử lý lỗi validation của Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: Object.values(err.errors).map(error => error.message),
      path: req.url
    });
  }

  // Xử lý lỗi duplicate key của MongoDB
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.DUPLICATE_ERROR,
      path: req.url
    });
  }

  // Xử lý lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN,
      path: req.url
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.TOKEN_EXPIRED,
      path: req.url
    });
  }

  // Xử lý lỗi CastError của Mongoose (ObjectId không hợp lệ)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `ID không hợp lệ: ${err.value}`,
      path: req.url
    });
  }

  // Xử lý lỗi mặc định
  return res.status(500).json({
    success: false,
    message: ERROR_MESSAGES.SERVER_ERROR,
    path: req.url
  });
}; 