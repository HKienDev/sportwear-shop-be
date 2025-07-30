import { ERROR_MESSAGES } from '../utils/constants.js';

export const validateRequest = (schemas) => {
  return (req, res, next) => {
    try {
      // Validate request body nếu có
      if (schemas.body) {
        const { error, value } = schemas.body.validate(req.body, { abortEarly: false });
        if (error) {
          return res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors: error.details.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        req.body = value;
      }

      // Validate query params nếu có
      if (schemas.query) {
        const { error, value } = schemas.query.validate(req.query, { abortEarly: false });
        if (error) {
          return res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors: error.details.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        req.query = value;
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