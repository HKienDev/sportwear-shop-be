import { ERROR_MESSAGES } from '../utils/constants.js';
import { verifyAccessTokenMiddleware } from './authMiddleware.js';

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