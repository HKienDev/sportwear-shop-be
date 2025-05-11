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
        error: env.NODE_ENV === "development" ? error.message : undefined
    };
};

// Controllers
export const uploadImage = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Upload request received:`, {
            file: req.file,
            headers: req.headers,
            body: req.body
        });
        
        if (!req.file) {
            logError(`[${requestId}] No file received`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_FILE
            });
        }

        logInfo(`[${requestId}] File received:`, {
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        // Đảm bảo thư mục uploads tồn tại
        ensureUploadDir();

        // Upload lên Cloudinary
        logInfo(`[${requestId}] Uploading to Cloudinary...`);
        const result = await cloudinary.uploader.upload(req.file.path, CLOUDINARY_CONFIG);

        logInfo(`[${requestId}] Cloudinary upload result:`, result);

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
        logError(`[${requestId}] Upload error details:`, {
            message: error.message,
            stack: error.stack,
            details: error
        });

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
        logInfo(`[${requestId}] Avatar upload request received:`, {
            file: req.file,
            headers: req.headers,
            body: req.body
        });
        
        if (!req.file) {
            logError(`[${requestId}] No file received`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_FILE
            });
        }

        logInfo(`[${requestId}] File received:`, {
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        // Đảm bảo thư mục uploads tồn tại
        ensureUploadDir();

        // Upload lên Cloudinary với folder riêng cho avatar
        logInfo(`[${requestId}] Uploading to Cloudinary...`);
        const result = await cloudinary.uploader.upload(req.file.path, {
            ...CLOUDINARY_CONFIG,
            folder: 'sport-store/avatars'
        });

        logInfo(`[${requestId}] Cloudinary upload result:`, result);

        // Xóa file tạm sau khi upload thành công
        deleteTempFile(req.file.path, requestId);

        res.json({
            success: true,
            message: SUCCESS_MESSAGES.AVATAR_UPLOAD_SUCCESS,
            data: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });
    } catch (error) {
        logError(`[${requestId}] Upload error details:`, {
            message: error.message,
            stack: error.stack,
            details: error
        });
        res.status(500).json(handleError(error, requestId));
    }
};

export const uploadProductImage = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Product image upload request received:`, {
            file: req.file,
            headers: req.headers,
            body: req.body
        });
        
        if (!req.file) {
            logError(`[${requestId}] No file received`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_FILE
            });
        }

        logInfo(`[${requestId}] File received:`, {
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        // Đảm bảo thư mục uploads tồn tại
        ensureUploadDir();

        // Upload lên Cloudinary với folder riêng cho sản phẩm
        logInfo(`[${requestId}] Uploading to Cloudinary...`);
        const result = await cloudinary.uploader.upload(req.file.path, {
            ...CLOUDINARY_CONFIG,
            folder: 'sport-store/products'
        });

        logInfo(`[${requestId}] Cloudinary upload result:`, result);

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
        logError(`[${requestId}] Upload error details:`, {
            message: error.message,
            stack: error.stack,
            details: error
        });
        res.status(500).json(handleError(error, requestId));
    }
}; 