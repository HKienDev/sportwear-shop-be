import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadImage = async (req, res) => {
  try {
    console.log('Upload request received:', {
      file: req.file,
      headers: req.headers,
      body: req.body
    });
    
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ 
        success: false,
        error: 'Không có file được upload' 
      });
    }

    console.log('File received:', {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Kiểm tra thư mục uploads
    const uploadDir = path.join(__dirname, '../../uploads/');
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating uploads directory:', uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Upload lên Cloudinary
    console.log('Uploading to Cloudinary...');
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'sport-store/products',
      use_filename: true,
      unique_filename: true,
    });

    console.log('Cloudinary upload result:', result);

    // Xóa file tạm sau khi upload
    try {
      fs.unlinkSync(req.file.path);
      console.log('Temporary file deleted:', req.file.path);
    } catch (unlinkError) {
      console.error('Error deleting temp file:', unlinkError);
      // Không throw error vì upload đã thành công
    }

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Upload error details:', {
      message: error.message,
      stack: error.stack,
      details: error
    });

    // Xóa file tạm nếu có lỗi
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up temporary file after error');
      } catch (unlinkError) {
        console.error('Error deleting temp file after upload error:', unlinkError);
      }
    }

    res.status(500).json({ 
      success: false,
      error: 'Lỗi khi upload ảnh',
      details: error.message 
    });
  }
}; 