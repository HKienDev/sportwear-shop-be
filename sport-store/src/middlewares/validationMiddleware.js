import Joi from 'joi';
import { validateRequest } from './validateRequest.js';

// Validation schema cho login
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
        'string.empty': 'Email không được để trống'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Mật khẩu phải có ít nhất {#limit} ký tự',
        'any.required': 'Mật khẩu là bắt buộc',
        'string.empty': 'Mật khẩu không được để trống'
    })
});

// Validation schema cho register
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
        'string.empty': 'Email không được để trống'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Mật khẩu phải có ít nhất {#limit} ký tự',
        'any.required': 'Mật khẩu là bắt buộc',
        'string.empty': 'Mật khẩu không được để trống'
    }),
    username: Joi.string().min(3).required().messages({
        'string.min': 'Tên đăng nhập phải có ít nhất {#limit} ký tự',
        'any.required': 'Tên đăng nhập là bắt buộc',
        'string.empty': 'Tên đăng nhập không được để trống'
    }),
    fullname: Joi.string().required().messages({
        'any.required': 'Họ tên là bắt buộc',
        'string.empty': 'Họ tên không được để trống'
    }),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
        'string.pattern.base': 'Số điện thoại không hợp lệ',
        'any.required': 'Số điện thoại là bắt buộc',
        'string.empty': 'Số điện thoại không được để trống'
    })
});

// Validation schema cho forgot password
const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
        'string.empty': 'Email không được để trống'
    })
});

// Validation schema cho reset password
const resetPasswordSchema = Joi.object({
    otp: Joi.string().required().messages({
        'any.required': 'Mã OTP là bắt buộc',
        'string.empty': 'Mã OTP không được để trống'
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'Mật khẩu phải có ít nhất {#limit} ký tự',
        'any.required': 'Mật khẩu mới là bắt buộc',
        'string.empty': 'Mật khẩu mới không được để trống'
    })
});

// Export các middleware validation
export const validateLogin = validateRequest(loginSchema);
export const validateRegister = validateRequest(registerSchema);
export const validateForgotPassword = validateRequest(forgotPasswordSchema);
export const validateResetPassword = validateRequest(resetPasswordSchema); 