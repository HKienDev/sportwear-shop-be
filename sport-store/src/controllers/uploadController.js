import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from "../utils/logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const CLOUDINARY_CONFIG = {
    folder: 'sport-store/products',
    use_filename: true,
    unique_filename: true
};

const UPLOAD_DIR = path.join(__dirname, '../../uploads/');

// Helper functions
const ensureUploadDir = () => {
    if (!fs.existsSync(UPLOAD_DIR)) {
        logInfo('Creating uploads directory:', UPLOAD_DIR);
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
};

const deleteTempFile = (filePath, requestId) => {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            logInfo(`[${requestId}] Temporary file deleted:`, filePath);
        } catch (error) {
            logError(`[${requestId}] Error deleting temp file:`, error);
            // Không throw error vì upload đã thành công
        }
    }
};

const handleError = (error, requestId) => {
    logError(`[${requestId}] Error:`, error);
    return {
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR,
        error: env.isDevelopment ? error.message : undefined
    };
};

// Controllers
export const uploadImage = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        if (!req.file) {
            logError(`[${requestId}] No file received`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_FILE
            });
        }

        // Đảm bảo thư mục uploads tồn tại
        ensureUploadDir();

        // Upload lên Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, CLOUDINARY_CONFIG);

        // Xóa file tạm sau khi upload thành công
        deleteTempFile(req.file.path, requestId);

        res.json({
            success: true,
            data: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });
    } catch (error) {
        logError(`[${requestId}] Upload error:`, error);

        // Xóa file tạm nếu có lỗi
        if (req.file) {
            deleteTempFile(req.file.path, requestId);
        }

        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const uploadAvatar = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        if (!req.file) {
            logError(`[${requestId}] No file received`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_FILE
            });
        }

        // Đảm bảo thư mục uploads tồn tại
        ensureUploadDir();

        // Upload lên Cloudinary với folder riêng cho avatar
        const result = await cloudinary.uploader.upload(req.file.path, {
            ...CLOUDINARY_CONFIG,
            folder: 'sport-store/avatars'
        });

        // Xóa file tạm sau khi upload thành công
        deleteTempFile(req.file.path, requestId);

        res.json({
            success: true,
            data: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });
    } catch (error) {
        logError(`[${requestId}] Avatar upload error:`, error);

        // Xóa file tạm nếu có lỗi
        if (req.file) {
            deleteTempFile(req.file.path, requestId);
        }

        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const uploadProductImage = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        if (!req.file) {
            logError(`[${requestId}] No file received`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_FILE
            });
        }

        // Đảm bảo thư mục uploads tồn tại
        ensureUploadDir();

        // Upload lên Cloudinary với folder riêng cho sản phẩm
        const result = await cloudinary.uploader.upload(req.file.path, {
            ...CLOUDINARY_CONFIG,
            folder: 'sport-store/products'
        });

        // Xóa file tạm sau khi upload thành công
        deleteTempFile(req.file.path, requestId);

        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_IMAGE_UPLOAD_SUCCESS,
            data: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });
    } catch (error) {
        logError(`[${requestId}] Product image upload error:`, error);
        res.status(500).json(handleError(error, requestId));
    }
}; 

// Upload file chung
export const uploadFile = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Không có file được upload'
            });
        }

        const filePath = req.file.path;
        
        // Upload lên Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'uploads',
            resource_type: 'auto'
        });

        // Xóa file tạm
        fs.unlink(filePath, (err) => {
            if (err) {
                logError(`[${requestId}] Error deleting temp file:`, err);
            }
        });

        return res.json({
            success: true,
            message: 'Upload thành công',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                size: result.bytes
            }
        });

    } catch (error) {
        logError(`[${requestId}] Error in uploadFile:`, error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi upload file'
        });
    }
}; 