import { z } from 'zod';

// Schema cho đăng ký
export const registerSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }).min(1, { message: 'Email là bắt buộc' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }).min(1, { message: 'Mật khẩu là bắt buộc' }),
  fullname: z.string().min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' }).min(1, { message: 'Họ tên là bắt buộc' }),
  phone: z.string().regex(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' }).min(1, { message: 'Số điện thoại là bắt buộc' })
});

// Schema cho đăng nhập
export const loginSchema = z.object({
  email: z.string()
    .email({ message: 'Email không hợp lệ' })
    .min(1, { message: 'Email là bắt buộc' }),
  password: z.string()
    .min(1, { message: 'Mật khẩu là bắt buộc' })
});

// Schema cho quên mật khẩu
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }).min(1, { message: 'Email là bắt buộc' })
});

// Schema cho đặt lại mật khẩu
export const resetPasswordSchema = z.object({
  otp: z.string().min(1, { message: 'Mã OTP là bắt buộc' }),
  newPassword: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }).min(1, { message: 'Mật khẩu mới là bắt buộc' })
});

// Schema cho xác thực email
export const verifyEmailSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }).min(1, { message: 'Email là bắt buộc' }),
  otp: z.string().min(1, { message: 'Mã OTP là bắt buộc' })
});

// Schema cho gửi lại email xác thực
export const resendVerificationEmailSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }).min(1, { message: 'Email là bắt buộc' })
});

// Schema cho cập nhật profile
export const updateProfileSchema = z.object({
  fullname: z.string().min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' }).optional(),
  phone: z.string().regex(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' }).optional(),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Giới tính không hợp lệ' }) }).optional(),
  dob: z.string().optional(),
  address: z.string().optional()
});

// Schema cho yêu cầu đổi mật khẩu
export const requestPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Mật khẩu hiện tại là bắt buộc' })
});

// Schema cho xác thực OTP và đổi mật khẩu
export const verifyOTPAndChangePasswordSchema = z.object({
  otp: z.string().min(1, { message: 'Mã OTP là bắt buộc' }),
  newPassword: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }).min(1, { message: 'Mật khẩu mới là bắt buộc' })
});

// Schema cho yêu cầu cập nhật profile
export const requestProfileUpdateSchema = z.object({
  fullname: z.string().min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' }).optional(),
  phone: z.string().regex(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' }).optional(),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Giới tính không hợp lệ' }) }).optional(),
  dob: z.string().optional(),
  address: z.string().optional()
}); 