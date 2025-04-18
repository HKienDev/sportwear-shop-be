import { z } from 'zod';

// Schema cho tạo mã giảm giá
export const createCouponSchema = z.object({
  code: z.string()
    .min(3, { message: 'Mã giảm giá phải có ít nhất 3 ký tự' })
    .max(20, { message: 'Mã giảm giá không được vượt quá 20 ký tự' })
    .regex(/^[A-Z0-9]+$/, { message: 'Mã giảm giá chỉ được chứa chữ cái in hoa và số' })
    .optional(),
  type: z.enum(['percentage', 'fixed'], { errorMap: () => ({ message: 'Loại giảm giá không hợp lệ' }) }),
  value: z.number().min(1, { message: 'Giá trị giảm giá phải lớn hơn 0' }),
  minimumPurchaseAmount: z.number().min(0, { message: 'Giá trị đơn hàng tối thiểu không thể âm' }),
  startDate: z.string().datetime({ message: 'Ngày bắt đầu không hợp lệ' }),
  endDate: z.string().datetime({ message: 'Ngày kết thúc không hợp lệ' }),
  usageLimit: z.number().int().min(1, { message: 'Giới hạn sử dụng phải lớn hơn 0' }),
  userLimit: z.number().int().min(1, { message: 'Giới hạn sử dụng cho mỗi người dùng phải lớn hơn 0' }),
  isActive: z.boolean().default(true),
  description: z.string().max(500, { message: 'Mô tả không được vượt quá 500 ký tự' }).optional(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional()
}).refine((data) => {
  if (data.type === 'percentage' && data.value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Giá trị giảm giá theo phần trăm không được vượt quá 100%',
  path: ['value']
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return startDate <= endDate;
}, {
  message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
  path: ['endDate']
});

// Schema cho cập nhật mã giảm giá
export const updateCouponSchema = z.object({
  code: z.string()
    .min(3, { message: 'Mã giảm giá phải có ít nhất 3 ký tự' })
    .max(20, { message: 'Mã giảm giá không được vượt quá 20 ký tự' })
    .regex(/^[A-Z0-9]+$/, { message: 'Mã giảm giá chỉ được chứa chữ cái in hoa và số' })
    .optional(),
  type: z.enum(['percentage', 'fixed'], { errorMap: () => ({ message: 'Loại giảm giá không hợp lệ' }) }).optional(),
  value: z.number().min(1, { message: 'Giá trị giảm giá phải lớn hơn 0' }).optional(),
  minimumPurchaseAmount: z.number().min(0, { message: 'Giá trị đơn hàng tối thiểu không thể âm' }).optional(),
  startDate: z.string().datetime({ message: 'Ngày bắt đầu không hợp lệ' }).optional(),
  endDate: z.string().datetime({ message: 'Ngày kết thúc không hợp lệ' }).optional(),
  usageLimit: z.number().int().min(1, { message: 'Giới hạn sử dụng phải lớn hơn 0' }).optional(),
  userLimit: z.number().int().min(1, { message: 'Giới hạn sử dụng cho mỗi người dùng phải lớn hơn 0' }).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500, { message: 'Mô tả không được vượt quá 500 ký tự' }).optional(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional()
}).refine((data) => {
  if (data.type === 'percentage' && data.value && data.value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Giá trị giảm giá theo phần trăm không được vượt quá 100%',
  path: ['value']
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return startDate < endDate;
  }
  return true;
}, {
  message: 'Ngày kết thúc phải sau ngày bắt đầu',
  path: ['endDate']
});

// Schema cho tìm kiếm mã giảm giá
export const searchCouponSchema = z.object({
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sort: z.enum(['code', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional().transform(val => val === '' ? undefined : val),
  status: z.string().optional()
}); 