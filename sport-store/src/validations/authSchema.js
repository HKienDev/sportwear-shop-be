import { z } from 'zod';

// Schema cho đăng ký
export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự')
});

// Schema cho đăng nhập
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu')
});

// Schema cho quên mật khẩu
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ')
});

// Schema cho đặt lại mật khẩu
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});

// Schema cho đổi mật khẩu
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
});

// Schema cho cập nhật thông tin người dùng
export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Số điện thoại không hợp lệ').optional(),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự').optional()
});

// Schema cho xác thực OTP
export const verifyOTPSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  otp: z.string().length(6, 'Mã OTP phải có 6 ký tự')
});

// Schema cho gửi lại OTP
export const resendOTPSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  purpose: z.enum(['register', 'reset-password'], {
    errorMap: () => ({ message: 'Mục đích không hợp lệ' })
  })
}); 