import { z } from 'zod';

// Schema cho item trong cart
const cartItemSchema = z.object({
  product: z.string().min(1, { message: 'ID sản phẩm là bắt buộc' }),
  quantity: z.number().int().min(1, { message: 'Số lượng phải lớn hơn 0' }),
  attributes: z.record(z.string(), z.any()).optional()
});

// Schema cho tạo cart
export const createCartSchema = z.object({
  user: z.string().min(1, { message: 'ID người dùng là bắt buộc' }),
  items: z.array(cartItemSchema).min(1, { message: 'Giỏ hàng phải có ít nhất một sản phẩm' }),
  coupon: z.string().optional()
});

// Schema cho cập nhật cart
export const updateCartSchema = z.object({
  items: z.array(cartItemSchema).min(1, { message: 'Giỏ hàng phải có ít nhất một sản phẩm' }).optional(),
  coupon: z.string().optional()
});

// Schema cho thêm item vào cart
export const addToCartSchema = z.object({
  product: z.string().min(1, { message: 'ID sản phẩm là bắt buộc' }),
  quantity: z.number().int().min(1, { message: 'Số lượng phải lớn hơn 0' }),
  attributes: z.record(z.string(), z.any()).optional()
});

// Schema cho cập nhật số lượng item trong cart
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, { message: 'Số lượng phải lớn hơn 0' }),
  attributes: z.record(z.string(), z.any()).optional()
}); 