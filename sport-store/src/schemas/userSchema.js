import { z } from 'zod';

// Schema cho tạo người dùng
export const createUserSchema = z.object({
  email: z.string()
    .email({ message: 'Email không hợp lệ' })
    .min(1, { message: 'Email là bắt buộc' }),
  password: z.string()
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'
    }),
  username: z.string()
    .min(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
    .max(50, { message: 'Tên đăng nhập không được vượt quá 50 ký tự' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới' }),
  fullname: z.string()
    .min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
    .max(100, { message: 'Họ tên không được vượt quá 100 ký tự' }),
  phone: z.string()
    .regex(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' })
    .optional(),
  role: z.enum(['user', 'admin'], { errorMap: () => ({ message: 'Vai trò không hợp lệ' }) }).default('user'),
  isActive: z.boolean().default(true),
  address: z.string()
    .min(5, { message: 'Địa chỉ phải có ít nhất 5 ký tự' })
    .max(200, { message: 'Địa chỉ không được vượt quá 200 ký tự' })
    .optional(),
  avatar: z.string().optional()
});

// Schema cho cập nhật người dùng
export const updateUserSchema = z.object({
  email: z.string()
    .email({ message: 'Email không hợp lệ' })
    .min(1, { message: 'Email là bắt buộc' })
    .optional(),
  username: z.string()
    .min(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
    .max(50, { message: 'Tên đăng nhập không được vượt quá 50 ký tự' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới' })
    .optional(),
  fullname: z.string()
    .min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
    .max(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
    .optional(),
  phone: z.string()
    .regex(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' })
    .optional(),
  role: z.enum(['user', 'admin'], { errorMap: () => ({ message: 'Vai trò không hợp lệ' }) }).optional(),
  isActive: z.boolean().optional(),
  address: z.object({
    province: z.string().optional(),
    district: z.string().optional(),
    ward: z.string().optional(),
    street: z.string().optional()
  }).optional(),
  dob: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  membershipLevel: z.string().optional(),
  totalSpent: z.number().optional(),
  avatar: z.string().optional()
});

// Schema cho tìm kiếm người dùng
export const searchUserSchema = z.object({
  keyword: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  sort: z.enum(['email', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

// Schema cho reset mật khẩu
export const resetUserPasswordSchema = z.object({
  password: z.string()
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'
    }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
});

// Schema cho đổi mật khẩu
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Mật khẩu hiện tại là bắt buộc' }),
  newPassword: z.string()
    .min(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'
    }),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Mật khẩu mới xác nhận không khớp',
  path: ['confirmNewPassword']
});

// Schema cho cập nhật thông tin cá nhân
export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
    .max(50, { message: 'Tên đăng nhập không được vượt quá 50 ký tự' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới' })
    .optional(),
  fullname: z.string()
    .min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
    .max(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
    .optional(),
  phone: z.string()
    .regex(/^[0-9]{10}$/, { message: 'Số điện thoại không hợp lệ' })
    .optional(),
  address: z.string()
    .min(5, { message: 'Địa chỉ phải có ít nhất 5 ký tự' })
    .max(200, { message: 'Địa chỉ không được vượt quá 200 ký tự' })
    .optional(),
  avatar: z.string().optional()
}); 