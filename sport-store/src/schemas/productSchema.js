import { z } from 'zod';

// Hàm tiền xử lý để chuyển đổi chuỗi thành số
const preprocessNumber = (val) => {
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? val : parsed;
  }
  return val;
};

// Schema cho kích thước sản phẩm
const productSizeSchema = z.object({
  size: z.string().min(1, 'Kích thước không được để trống'),
  isAvailable: z.boolean().optional().default(true)
});

// Schema cho thông số kỹ thuật
const specificationsSchema = z.object({
  material: z.string().optional(),
  weight: z.string().optional(),
  stretch: z.string().optional(),
  absorbency: z.string().optional(),
  warranty: z.string().optional(),
  origin: z.string().optional(),
  fabricTechnology: z.string().optional(),
  careInstructions: z.string().optional()
}).optional();

// Schema cho tạo sản phẩm mới
export const createProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  description: z.string().min(1, 'Mô tả sản phẩm không được để trống'),
  originalPrice: z.preprocess(
    preprocessNumber, 
    z.number().min(0.01, 'Giá gốc phải lớn hơn 0')
  ),
  salePrice: z.preprocess(
    preprocessNumber, 
    z.number().min(0, 'Giá bán không được âm')
  ).optional(),
  stock: z.preprocess(
    preprocessNumber, 
    z.number().min(0, 'Số lượng tồn kho không được âm')
  ),
  categoryId: z.string().min(1, 'Danh mục sản phẩm không được để trống'),
  brand: z.string().min(1, 'Thương hiệu không được để trống'),
  mainImage: z.string().min(1, 'Ảnh chính không được để trống'),
  subImages: z.array(z.string()).optional(),
  colors: z.array(z.string().min(1, 'Màu sắc không được để trống')).optional(),
  sizes: z.union([
    z.array(z.string().min(1, 'Kích thước không được để trống')),
    z.array(productSizeSchema)
  ]).optional(),
  tags: z.array(z.string().min(1, 'Tag không được để trống')).optional(),
  specifications: specificationsSchema,
  isActive: z.boolean().optional(),
  slug: z.string().optional()
}).refine(
  (data) => {
    // Nếu có salePrice, kiểm tra xem nó có nhỏ hơn hoặc bằng originalPrice không
    if (data.salePrice !== undefined) {
      return data.salePrice <= data.originalPrice;
    }
    return true;
  },
  {
    message: "Giá bán không được lớn hơn giá gốc",
    path: ["salePrice"]
  }
);

// Schema cho cập nhật sản phẩm
export const updateProductSchema = z.object({
  name: z.string().min(1, { message: 'Tên sản phẩm là bắt buộc' }).optional(),
  description: z.string().min(1, { message: 'Mô tả sản phẩm là bắt buộc' }).optional(),
  originalPrice: z.preprocess(preprocessNumber, z.number().min(0.01, { message: 'Giá gốc phải lớn hơn 0' })).optional(),
  salePrice: z.preprocess(preprocessNumber, z.number().min(0, { message: 'Giá bán không được âm' })).optional(),
  stock: z.preprocess(preprocessNumber, z.number().min(0, { message: 'Số lượng tồn kho không được âm' })).optional(),
  categoryId: z.string().min(1, { message: 'Danh mục sản phẩm là bắt buộc' }).optional(),
  brand: z.string().min(1, { message: 'Thương hiệu là bắt buộc' }).optional(),
  mainImage: z.string().min(1, { message: 'Ảnh chính là bắt buộc' }).optional(),
  subImages: z.array(z.string()).optional(),
  colors: z.array(z.string().min(1, 'Màu sắc không được để trống')).optional(),
  sizes: z.union([
    z.array(z.string().min(1, 'Kích thước không được để trống')),
    z.array(productSizeSchema)
  ]).optional(),
  tags: z.array(z.string().min(1, 'Tag không được để trống')).optional(),
  specifications: specificationsSchema,
  isActive: z.boolean().optional(),
  slug: z.string().optional(),
  sku: z.string().optional()
}).refine(
  (data) => {
    // Nếu có salePrice và originalPrice, kiểm tra xem salePrice có nhỏ hơn hoặc bằng originalPrice không
    if (data.salePrice !== undefined && data.originalPrice !== undefined) {
      return data.salePrice <= data.originalPrice;
    }
    return true;
  },
  {
    message: "Giá bán không được lớn hơn giá gốc",
    path: ["salePrice"]
  }
);

// Schema cho tìm kiếm sản phẩm
export const searchProductSchema = z.object({
  keyword: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.preprocess(preprocessNumber, z.number().optional()),
  maxPrice: z.preprocess(preprocessNumber, z.number().optional()),
  sort: z.string().optional(),
  order: z.string().optional(),
  page: z.preprocess(preprocessNumber, z.number().optional()),
  limit: z.preprocess(preprocessNumber, z.number().optional())
});

// Schema cho cập nhật trạng thái sản phẩm
export const productStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'Trạng thái hoạt động là bắt buộc' })
});

// Schema cho cập nhật trạng thái size
export const updateSizeStatusSchema = z.object({
  size: z.string().min(1, { message: 'Kích thước là bắt buộc' }),
  isAvailable: z.boolean({ message: 'Trạng thái phải là boolean' })
}); 