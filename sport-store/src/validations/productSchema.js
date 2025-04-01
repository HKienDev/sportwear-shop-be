import { z } from 'zod';

// Schema cho tạo sản phẩm mới
export const createProductSchema = z.object({
  name: z.string().min(3, 'Tên sản phẩm phải có ít nhất 3 ký tự'),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự'),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0'),
  stock: z.number().int().min(0, 'Số lượng phải là số nguyên và lớn hơn hoặc bằng 0'),
  category: z.string().min(1, 'Vui lòng chọn danh mục'),
  brand: z.string().min(1, 'Vui lòng nhập thương hiệu'),
  images: z.array(z.string().url('URL hình ảnh không hợp lệ')).min(1, 'Vui lòng thêm ít nhất 1 hình ảnh'),
  specifications: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().default(true)
});

// Schema cho cập nhật sản phẩm
export const updateProductSchema = z.object({
  name: z.string().min(3, 'Tên sản phẩm phải có ít nhất 3 ký tự').optional(),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự').optional(),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0').optional(),
  stock: z.number().int().min(0, 'Số lượng phải là số nguyên và lớn hơn hoặc bằng 0').optional(),
  category: z.string().min(1, 'Vui lòng chọn danh mục').optional(),
  brand: z.string().min(1, 'Vui lòng nhập thương hiệu').optional(),
  images: z.array(z.string().url('URL hình ảnh không hợp lệ')).min(1, 'Vui lòng thêm ít nhất 1 hình ảnh').optional(),
  specifications: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional()
});

// Schema cho cập nhật số lượng sản phẩm
export const updateStockSchema = z.object({
  stock: z.number().int().min(0, 'Số lượng phải là số nguyên và lớn hơn hoặc bằng 0')
});

// Schema cho tìm kiếm sản phẩm
export const searchProductSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  sortBy: z.enum(['price', 'name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
}); 