import { z } from 'zod';

// Schema cho upload file
export const uploadFileSchema = z.object({
  file: z.any().refine((file) => file !== undefined, {
    message: 'Vui lòng chọn file để upload'
  }).refine((file) => {
    if (!file) return true;
    const maxSize = 5 * 1024 * 1024; // 5MB
    return file.size <= maxSize;
  }, {
    message: 'File không được vượt quá 5MB'
  }).refine((file) => {
    if (!file) return true;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.mimetype);
  }, {
    message: 'Loại file không được hỗ trợ. Chỉ chấp nhận JPG, PNG, GIF và WEBP'
  })
}); 