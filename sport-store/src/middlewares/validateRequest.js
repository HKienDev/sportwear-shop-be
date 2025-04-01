import { ERROR_MESSAGES } from '../utils/constants.js';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        // Nếu có lỗi validation, trả về lỗi 400
        return res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION_ERROR,
          errors: error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      // Thay thế request body bằng dữ liệu đã được validate
      req.body = value;
      
      next();
    } catch (error) {
      // Nếu có lỗi khác, trả về lỗi 500
      return res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR,
        errors: [{ message: error.message }]
      });
    }
  };
}; 