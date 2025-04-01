import { z } from 'zod';

// Schema cho tạo danh mục mới
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Tên danh mục phải có ít nhất 2 ký tự'),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự'),
  slug: z.string().min(2, 'Slug phải có ít nhất 2 ký tự'),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true)
});

// Schema cho cập nhật danh mục
export const updateCategorySchema = z.object({
  name: z.string().min(2, 'Tên danh mục phải có ít nhất 2 ký tự').optional(),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự').optional(),
  slug: z.string().min(2, 'Slug phải có ít nhất 2 ký tự').optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional()
});

// Schema cho tìm kiếm danh mục
export const searchCategorySchema = z.object({
  keyword: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
}); 