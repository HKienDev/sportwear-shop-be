import { ERROR_MESSAGES } from '../utils/constants.js';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body
      const validatedData = schema.parse(req.body);
      
      // Thay thế request body bằng dữ liệu đã được validate
      req.body = validatedData;
      
      next();
    } catch (error) {
      // Nếu có lỗi validation, trả về lỗi 400
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
  };
}; 