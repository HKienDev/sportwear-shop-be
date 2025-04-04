import { z } from 'zod';

// Schema cho tạo product
export const createProductSchema = z.object({
  name: z.string().min(1, { message: 'Tên sản phẩm là bắt buộc' }),
  description: z.string().min(1, { message: 'Mô tả sản phẩm là bắt buộc' }),
  price: z.number().min(0, { message: 'Giá sản phẩm phải lớn hơn hoặc bằng 0' }),
  discount: z.number().min(0, { message: 'Giảm giá phải lớn hơn hoặc bằng 0' }).max(100, { message: 'Giảm giá không được vượt quá 100%' }).optional(),
  category: z.string().min(1, { message: 'Danh mục sản phẩm là bắt buộc' }),
  brand: z.string().min(1, { message: 'Thương hiệu sản phẩm là bắt buộc' }),
  stock: z.number().int().min(0, { message: 'Số lượng tồn kho phải lớn hơn hoặc bằng 0' }),
  images: z.array(z.string()).min(1, { message: 'Sản phẩm phải có ít nhất một hình ảnh' }),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(true),
  isBestSeller: z.boolean().default(false),
  isOnSale: z.boolean().default(false),
  attributes: z.record(z.string(), z.any()).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  sku: z.string().min(1, { message: 'Mã SKU là bắt buộc' }),
  barcode: z.string().optional(),
  weight: z.number().min(0, { message: 'Trọng lượng phải lớn hơn hoặc bằng 0' }).optional(),
  dimensions: z.object({
    length: z.number().min(0, { message: 'Chiều dài phải lớn hơn hoặc bằng 0' }).optional(),
    width: z.number().min(0, { message: 'Chiều rộng phải lớn hơn hoặc bằng 0' }).optional(),
    height: z.number().min(0, { message: 'Chiều cao phải lớn hơn hoặc bằng 0' }).optional()
  }).optional()
});

// Schema cho cập nhật product
export const updateProductSchema = z.object({
  name: z.string().min(1, { message: 'Tên sản phẩm là bắt buộc' }).optional(),
  description: z.string().min(1, { message: 'Mô tả sản phẩm là bắt buộc' }).optional(),
  price: z.number().min(0, { message: 'Giá sản phẩm phải lớn hơn hoặc bằng 0' }).optional(),
  discount: z.number().min(0, { message: 'Giảm giá phải lớn hơn hoặc bằng 0' }).max(100, { message: 'Giảm giá không được vượt quá 100%' }).optional(),
  category: z.string().min(1, { message: 'Danh mục sản phẩm là bắt buộc' }).optional(),
  brand: z.string().min(1, { message: 'Thương hiệu sản phẩm là bắt buộc' }).optional(),
  stock: z.number().int().min(0, { message: 'Số lượng tồn kho phải lớn hơn hoặc bằng 0' }).optional(),
  images: z.array(z.string()).min(1, { message: 'Sản phẩm phải có ít nhất một hình ảnh' }).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isOnSale: z.boolean().optional(),
  attributes: z.record(z.string(), z.any()).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  sku: z.string().min(1, { message: 'Mã SKU là bắt buộc' }).optional(),
  barcode: z.string().optional(),
  weight: z.number().min(0, { message: 'Trọng lượng phải lớn hơn hoặc bằng 0' }).optional(),
  dimensions: z.object({
    length: z.number().min(0, { message: 'Chiều dài phải lớn hơn hoặc bằng 0' }).optional(),
    width: z.number().min(0, { message: 'Chiều rộng phải lớn hơn hoặc bằng 0' }).optional(),
    height: z.number().min(0, { message: 'Chiều cao phải lớn hơn hoặc bằng 0' }).optional()
  }).optional()
});

// Schema cho tìm kiếm sản phẩm
export const searchProductSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  sort: z.enum(['name', 'price', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
}); 