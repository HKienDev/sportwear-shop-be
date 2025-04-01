import multer from 'multer';
import path from 'path';
import { logError, logInfo } from '../utils/logger.js';
import env from '../config/env.js';

// Constants
const UPLOAD_CONFIG = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    UPLOAD_DIR: 'uploads/'
};

const ERROR_MESSAGES = {
    INVALID_FILE_TYPE: 'Không phải file ảnh! Chỉ chấp nhận: JPG, PNG, GIF, WEBP',
    FILE_TOO_LARGE: `File quá lớn! Kích thước tối đa: ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    UPLOAD_ERROR: 'Lỗi khi upload file'
};

// Helper functions
const generateUniqueFilename = (originalname) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    return uniqueSuffix + path.extname(originalname);
};

const validateFileType = (mimetype) => {
    return UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mimetype);
};

// Cấu hình storage cho multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_CONFIG.UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const filename = generateUniqueFilename(file.originalname);
        logInfo(`[Upload] Generating filename: ${filename}`);
        cb(null, filename);
    }
});

// Kiểm tra file type
const fileFilter = (req, file, cb) => {
    const requestId = req.id || 'unknown';
    
    try {
        if (!validateFileType(file.mimetype)) {
            logError(`[${requestId}] Invalid file type: ${file.mimetype}`);
            cb(new Error(ERROR_MESSAGES.INVALID_FILE_TYPE), false);
            return;
        }

        logInfo(`[${requestId}] File type validated: ${file.mimetype}`);
        cb(null, true);
    } catch (error) {
        logError(`[${requestId}] Error in fileFilter:`, error);
        cb(error, false);
    }
};

// Middleware xử lý lỗi upload
const handleUploadError = (error, req, res, next) => {
    const requestId = req.id || 'unknown';
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            logError(`[${requestId}] File too large: ${error.message}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.FILE_TOO_LARGE
            });
        }
    }

    logError(`[${requestId}] Upload error:`, error);
    return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.UPLOAD_ERROR
    });
};

// Cấu hình multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE
    }
});

// Middleware kiểm tra thư mục upload tồn tại
const ensureUploadDir = (req, res, next) => {
    const fs = require('fs');
    if (!fs.existsSync(UPLOAD_CONFIG.UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_CONFIG.UPLOAD_DIR, { recursive: true });
    }
    next();
};

export { upload, handleUploadError, ensureUploadDir }; 