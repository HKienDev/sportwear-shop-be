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
        cb(null, true);
    } catch (error) {
        logError(`[${requestId}] Error in file filter: ${error.message}`);
        cb(error, false);
    }
};

// Tạo middleware upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE
    }
});

// Middleware upload single file
const uploadSingle = (fieldName) => {
    return (req, res, next) => {
        const requestId = req.id || 'unknown';
        
        upload.single(fieldName)(req, res, (err) => {
            if (err) {
                logError(`[${requestId}] Upload error: ${err.message}`);
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: ERROR_MESSAGES.FILE_TOO_LARGE
                    });
                }
                
                if (err.message === ERROR_MESSAGES.INVALID_FILE_TYPE) {
                    return res.status(400).json({
                        success: false,
                        message: ERROR_MESSAGES.INVALID_FILE_TYPE
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: ERROR_MESSAGES.UPLOAD_ERROR
                });
            }
            
            next();
        });
    };
};

// Middleware upload multiple files
const uploadMultiple = (fieldName, maxCount) => {
    return (req, res, next) => {
        const requestId = req.id || 'unknown';
        
        upload.array(fieldName, maxCount)(req, res, (err) => {
            if (err) {
                logError(`[${requestId}] Upload error: ${err.message}`);
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: ERROR_MESSAGES.FILE_TOO_LARGE
                    });
                }
                
                if (err.message === ERROR_MESSAGES.INVALID_FILE_TYPE) {
                    return res.status(400).json({
                        success: false,
                        message: ERROR_MESSAGES.INVALID_FILE_TYPE
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: ERROR_MESSAGES.UPLOAD_ERROR
                });
            }
            
            next();
        });
    };
};

// Middleware kiểm tra thư mục upload tồn tại
const ensureUploadDir = (req, res, next) => {
    const fs = require('fs');
    if (!fs.existsSync(UPLOAD_CONFIG.UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_CONFIG.UPLOAD_DIR, { recursive: true });
    }
    next();
};

export { upload, uploadSingle, uploadMultiple, ensureUploadDir }; 