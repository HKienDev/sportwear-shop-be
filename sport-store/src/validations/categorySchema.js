import Joi from 'joi';

// Schema cho tạo danh mục mới
export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    'string.empty': 'Tên danh mục không được để trống',
    'string.min': 'Tên danh mục phải có ít nhất 2 ký tự',
    'any.required': 'Tên danh mục là bắt buộc'
  }),
  description: Joi.string().allow('', null).max(500).messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự'
  }),
  image: Joi.string().required().messages({
    'string.empty': 'Vui lòng chọn ảnh cho danh mục',
    'any.required': 'Ảnh danh mục là bắt buộc'
  }),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false)
}).strict();

// Schema cho cập nhật danh mục
export const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).messages({
    'string.empty': 'Tên danh mục không được để trống',
    'string.min': 'Tên danh mục phải có ít nhất 2 ký tự'
  }),
  description: Joi.string().allow('', null).max(500).messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự'
  }),
  image: Joi.string().messages({
    'string.empty': 'Vui lòng chọn ảnh cho danh mục'
  }),
  isActive: Joi.boolean(),
  isFeatured: Joi.boolean()
}).strict();

// Schema cho tìm kiếm danh mục
export const searchCategorySchema = Joi.object({
  query: Joi.string().allow('', null),
  categoryId: Joi.string().pattern(/^VJUSPORTCAT\d{4}$/).messages({
    'string.pattern.base': 'ID danh mục không hợp lệ'
  }),
  isActive: Joi.boolean(),
  isFeatured: Joi.boolean(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100)
}).strict(); 