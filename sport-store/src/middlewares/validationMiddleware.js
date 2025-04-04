import { validateRequest } from './validateRequest.js';
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../schemas/authSchema.js';

// Export các middleware validation
export const validateLogin = validateRequest(loginSchema);
export const validateRegister = validateRequest(registerSchema);
export const validateForgotPassword = validateRequest(forgotPasswordSchema);
export const validateResetPassword = validateRequest(resetPasswordSchema); 