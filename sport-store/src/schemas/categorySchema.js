import { z } from 'zod';

// Schema cho tạo category
export const createCategorySchema = z.object({
  name: z.string().min(1, { message: 'Tên danh mục là bắt buộc' }),
  description: z.string().optional(),
  slug: z.string().min(1, { message: 'Slug là bắt buộc' }),
  parent: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.array(z.string()).optional()
});

// Schema cho cập nhật category
export const updateCategorySchema = z.object({
  name: z.string().min(1, { message: 'Tên danh mục là bắt buộc' }).optional(),
  description: z.string().optional(),
  slug: z.string().min(1, { message: 'Slug là bắt buộc' }).optional(),
  parent: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.array(z.string()).optional()
});

// Schema cho tìm kiếm danh mục
export const searchCategorySchema = z.object({
  keyword: z.string().optional(),
  parent: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sort: z.enum(['name', 'order', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
}); 