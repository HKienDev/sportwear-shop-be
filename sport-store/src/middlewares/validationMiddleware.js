import { validateRequest } from './validateRequest.js';
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../schemas/authSchema.js';
import { logError } from '../utils/logger.js';

// Export các middleware validation
export const validateLogin = validateRequest(loginSchema);
export const validateRegister = validateRequest(registerSchema);
export const validateForgotPassword = validateRequest(forgotPasswordSchema);
export const validateResetPassword = validateRequest(resetPasswordSchema);

export const validateQueryParams = (schema) => {
    return (req, res, next) => {
        try {
            const query = req.query;
            const validatedQuery = {};

            // Validate và chuyển đổi kiểu dữ liệu
            for (const [key, config] of Object.entries(schema)) {
                const value = query[key];
                
                // Nếu không có giá trị và có default, sử dụng giá trị default
                if (value === undefined && config.default !== undefined) {
                    validatedQuery[key] = config.default;
                    continue;
                }

                // Nếu không có giá trị và bắt buộc, throw error
                if (value === undefined && config.required) {
                    throw new Error(`Missing required parameter: ${key}`);
                }

                // Nếu có giá trị, validate kiểu dữ liệu
                if (value !== undefined) {
                    // Chuyển đổi kiểu dữ liệu
                    let convertedValue;
                    switch (config.type) {
                        case 'number':
                            convertedValue = Number(value);
                            if (isNaN(convertedValue)) {
                                throw new Error(`Invalid number for parameter: ${key}`);
                            }
                            break;
                        case 'boolean':
                            convertedValue = value === 'true';
                            break;
                        case 'string':
                            convertedValue = String(value);
                            break;
                        default:
                            convertedValue = value;
                    }

                    // Validate min/max cho number
                    if (config.type === 'number') {
                        if (config.min !== undefined && convertedValue < config.min) {
                            throw new Error(`Parameter ${key} must be greater than or equal to ${config.min}`);
                        }
                        if (config.max !== undefined && convertedValue > config.max) {
                            throw new Error(`Parameter ${key} must be less than or equal to ${config.max}`);
                        }
                    }

                    // Validate min/max length cho string
                    if (config.type === 'string') {
                        if (config.minLength !== undefined && convertedValue.length < config.minLength) {
                            throw new Error(`Parameter ${key} must be at least ${config.minLength} characters`);
                        }
                        if (config.maxLength !== undefined && convertedValue.length > config.maxLength) {
                            throw new Error(`Parameter ${key} must be at most ${config.maxLength} characters`);
                        }
                    }

                    validatedQuery[key] = convertedValue;
                }
            }

            // Gán query đã validate vào request
            req.query = validatedQuery;
            next();
        } catch (error) {
            logError(`Validation error: ${error.message}`);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };
}; 