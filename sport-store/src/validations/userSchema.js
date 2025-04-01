import { z } from 'zod';

// Schema cho tạo user mới (admin)
export const createUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Role không hợp lệ' })
  })
});

// Schema cho cập nhật user (admin)
export const updateUserSchema = z.object({
  email: z.string().email('Email không hợp lệ').optional(),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Số điện thoại không hợp lệ').optional(),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự').optional(),
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Role không hợp lệ' })
  }).optional(),
  isActive: z.boolean().optional()
});

// Schema cho cập nhật profile (user)
export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Số điện thoại không hợp lệ').optional(),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự').optional()
});

// Schema cho đổi mật khẩu (user)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
});

// Schema cho reset mật khẩu (admin)
export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
}); 