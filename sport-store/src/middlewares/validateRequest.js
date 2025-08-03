import { ERROR_MESSAGES } from '../utils/constants.js';

export const validateRequest = (schemas) => {
  return (req, res, next) => {
    try {
      // Validate request body nếu có
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors: result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        req.body = result.data;
      }

      // Validate query params nếu có
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors: result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        req.query = result.data;
      }

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