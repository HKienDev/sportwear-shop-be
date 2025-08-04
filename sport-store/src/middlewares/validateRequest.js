import { ERROR_MESSAGES } from '../utils/constants.js';

export const validateRequest = (schemas) => {
  return (req, res, next) => {
    try {
      // Validate request body nếu có
      if (schemas.body) {
        let result;
        // Kiểm tra xem schema có phải là Zod hay Joi
        if (schemas.body.safeParse) {
          // Zod schema
          result = schemas.body.safeParse(req.body);
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
        } else {
          // Joi schema
          result = schemas.body.validate(req.body);
          if (result.error) {
            return res.status(400).json({
              success: false,
              message: ERROR_MESSAGES.VALIDATION_ERROR,
              errors: result.error.details.map(err => ({
                field: err.path.join('.'),
                message: err.message
              }))
            });
          }
          req.body = result.value;
        }
      }

      // Validate query params nếu có
      if (schemas.query) {
        let result;
        // Kiểm tra xem schema có phải là Zod hay Joi
        if (schemas.query.safeParse) {
          // Zod schema
          result = schemas.query.safeParse(req.query);
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
        } else {
          // Joi schema
          result = schemas.query.validate(req.query);
          if (result.error) {
            return res.status(400).json({
              success: false,
              message: ERROR_MESSAGES.VALIDATION_ERROR,
              errors: result.error.details.map(err => ({
                field: err.path.join('.'),
                message: err.message
              }))
            });
          }
          req.query = result.value;
        }
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