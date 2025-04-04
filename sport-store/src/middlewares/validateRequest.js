import { ERROR_MESSAGES } from '../utils/constants.js';

export const validateRequest = (schemas) => {
  return (req, res, next) => {
    try {
      // Validate request body nếu có
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors: bodyResult.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        req.body = bodyResult.data;
      }

      // Validate query params nếu có
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors: queryResult.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        req.query = queryResult.data;
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