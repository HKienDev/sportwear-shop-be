import bcrypt from "bcryptjs";
import { logError } from "./logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES } from "./constants.js";

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const formatUserResponse = (user) => ({
    id: user._id,
    email: user.email,
    username: user.username,
    fullname: user.fullname || "",
    role: user.role,
    isActive: user.isActive,
    authStatus: user.authStatus,
    isVerified: user.isVerified,
    phone: user.phone || "",
    avatar: user.avatar || "",
    address: user.address || {},
    dob: user.dob,
    gender: user.gender,
    membershipLevel: user.membershipLevel || "Hạng Sắt",
    totalSpent: user.totalSpent || 0,
    orderCount: user.orderCount || 0,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});

export const handleError = (error, requestId) => {
    logError(`[${requestId}] Error:: ${error.message}`);
    logError(`Stack trace: ${error.stack}`);

    if (error.name === 'ValidationError') {
        return {
            success: false,
            message: ERROR_MESSAGES.VALIDATION_ERROR,
            errors: Object.values(error.errors).map(err => err.message)
        };
    }

    if (error.code === 11000) {
        return {
            success: false,
            message: ERROR_MESSAGES.DUPLICATE_KEY
        };
    }

    return {
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
    };
};

export const generateOTP = (length = 6) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
    const cookieOptions = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: '/',
        domain: env.NODE_ENV === "production" 
            ? ".sport-store-fe-graduation.vercel.app" 
            : "localhost"
    };

    // Set access token cookie
    res.cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set user cookie for frontend
    res.cookie("user", JSON.stringify({
        isAuthenticated: true,
        timestamp: Date.now()
    }), {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

// Thêm hàm mới để xóa cookies
export const clearAuthCookies = (res) => {
    const cookieOptions = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: '/',
        domain: env.NODE_ENV === "production" 
            ? ".sport-store-fe-graduation.vercel.app" 
            : "localhost"
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.clearCookie("user", cookieOptions);
}; 