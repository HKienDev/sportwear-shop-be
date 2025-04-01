import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES } from '../utils/constants.js';
import User from '../models/user.js';
import env from '../config/env.js';
import { logInfo, logError } from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { verifyAccessTokenMiddleware } from './authMiddleware.js';

// Helper functions
const extractToken = (req) => {
    // Kiểm tra token từ cookie trước
    const accessToken = req.cookies?.accessToken;
    if (accessToken) return accessToken;

    // Nếu không có token trong cookie, kiểm tra header
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return null;
};

const findAndVerifyUser = async (userId) => {
    const user = await User.findById(userId).select("-password");
    if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    if (!user.isActive) {
        throw new Error(ERROR_MESSAGES.ACCOUNT_LOCKED);
    }
    return user;
};

// Middleware kiểm tra role
export const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.UNAUTHORIZED
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập'
            });
        }

        next();
    };
};

export const auth = verifyAccessTokenMiddleware; 