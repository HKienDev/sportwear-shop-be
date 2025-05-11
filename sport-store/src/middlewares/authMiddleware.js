import { logInfo, logError } from "../utils/logger.js";
import { ERROR_MESSAGES } from "../utils/constants.js";
import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { getRedisClient } from '../config/redis.js';
import User from "../models/user.js";

// Helper functions
const extractToken = (req) => {
    // Kiểm tra token từ cookie trước
    const accessToken = req.cookies?.accessToken;
    if (accessToken) return accessToken;

    // Nếu không có token trong cookie, kiểm tra header
    const authHeader = req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }

    return null;
};

const isTokenBlacklisted = async (token) => {
    const redis = getRedisClient();
    if (!redis) return false;
    const blacklisted = await redis.get(`blacklist:${token}`);
    return !!blacklisted;
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

// Hàm chung để lấy và xác thực Access Token
export const verifyAccessTokenMiddleware = async (req, res, next) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Processing access token verification`);

        const token = extractToken(req);
        if (!token) {
            logError(`[${requestId}] ${ERROR_MESSAGES.NO_TOKEN}`);
            return res.status(401).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_TOKEN 
            });
        }

        // Kiểm tra token có trong blacklist không
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
            logError(`[${requestId}] Token is blacklisted`);
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.UNAUTHORIZED,
                errors: [{ message: 'Token đã bị vô hiệu hóa' }]
            });
        }

        const decoded = await verifyAccessToken(token);
        const user = await findAndVerifyUser(decoded.userId);
        req.user = user;
        next();
    } catch (error) {
        logError(`[${requestId}] Token verification failed: ${error.message}`);
        return res.status(401).json({
            success: false,
            message: ERROR_MESSAGES.UNAUTHORIZED,
            errors: [{ message: error.message }]
        });
    }
};

// Middleware xác thực user đăng nhập
export const verifyUser = async (req, res, next) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Processing user verification`);

        const token = extractToken(req);
        if (!token) {
            logError(`[${requestId}] ${ERROR_MESSAGES.NO_TOKEN}`);
            return res.status(401).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_TOKEN 
            });
        }

        const decoded = await verifyAccessToken(token);
        const user = await findAndVerifyUser(decoded.userId);

        logInfo(`[${requestId}] User verified successfully: ${user._id}`);
        req.user = user;
        next();
    } catch (error) {
        logError(`[${requestId}] User verification failed`, error);
        return res.status(401).json({ 
            success: false,
            message: ERROR_MESSAGES.UNAUTHORIZED,
            errors: [{ message: error.message }]
        });
    }
};

// Middleware xác thực admin
export const verifyAdmin = async (req, res, next) => {
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Processing admin verification`);

        const token = extractToken(req);
        if (!token) {
            logError(`[${requestId}] ${ERROR_MESSAGES.INVALID_TOKEN_FORMAT}`);
            return res.status(401).json({ 
                success: false,
                message: ERROR_MESSAGES.INVALID_TOKEN_FORMAT 
            });
        }

        const decoded = await verifyAccessToken(token);
        const user = await findAndVerifyUser(decoded.userId);

        if (user.role !== 'admin') {
            logError(`[${requestId}] User ${user._id} is not an admin`);
            return res.status(403).json({ 
                success: false,
                message: ERROR_MESSAGES.NOT_ADMIN 
            });
        }

        logInfo(`[${requestId}] Admin verified successfully: ${user._id}`);
        req.user = user;
        next();
    } catch (error) {
        logError(`[${requestId}] Admin verification failed`, error);
        res.status(401).json({ 
            success: false,
            message: error.message 
        });
    }
};

// Middleware xác thực Refresh Token
export const verifyRefreshTokenMiddleware = async (req, res, next) => {
    const requestId = req.id || 'unknown';
    
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            logError(`[${requestId}] ${ERROR_MESSAGES.NO_REFRESH_TOKEN}`);
            return res.status(401).json({ 
                success: false,
                message: ERROR_MESSAGES.NO_REFRESH_TOKEN 
            });
        }

        const decoded = await verifyRefreshToken(refreshToken);
        const user = await findAndVerifyUser(decoded.userId);
        
        logInfo(`[${requestId}] Refresh token verified successfully: ${user._id}`);
        req.user = user;
        next();
    } catch (error) {
        logError(`[${requestId}] Refresh token verification failed`, error);
        res.status(401).json({ 
            success: false,
            message: error.name === "TokenExpiredError" 
                ? ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED 
                : ERROR_MESSAGES.INVALID_TOKEN 
        });
    }
};