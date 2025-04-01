import { z } from 'zod';

// Schema cho upload file
export const uploadFileSchema = z.object({
  file: z.any()
    .refine((file) => file?.size <= 5 * 1024 * 1024, 'File không được lớn hơn 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file?.mimetype),
      'Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc WebP'
    )
});

// Schema cho upload nhiều file
export const uploadFilesSchema = z.object({
  files: z.array(z.any())
    .min(1, 'Vui lòng chọn ít nhất 1 file')
    .max(10, 'Không được upload quá 10 file cùng lúc')
    .refine(
      (files) => files.every(file => file?.size <= 5 * 1024 * 1024),
      'Mỗi file không được lớn hơn 5MB'
    )
    .refine(
      (files) => files.every(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file?.mimetype)),
      'Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc WebP'
    )
});

// Schema cho xóa file
export const deleteFileSchema = z.object({
  url: z.string().url('URL không hợp lệ')
});

// Schema cho cập nhật thông tin file
export const updateFileSchema = z.object({
  url: z.string().url('URL không hợp lệ'),
  newName: z.string().min(1, 'Tên file không được để trống').optional(),
  folder: z.string().min(1, 'Tên thư mục không được để trống').optional()
}); 