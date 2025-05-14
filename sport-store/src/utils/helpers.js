import bcrypt from "bcryptjs";
import { logError } from "./logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES } from "./constants.js";

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const formatUserResponse = (user) => ({
    _id: user._id,
    email: user.email,
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

export const setAuthCookies = (res, accessToken, refreshToken, userData) => {
    const cookieOptions = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: '/'
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

    // Set user cookie for frontend with full user data
    if (userData && typeof userData === 'object') {
        const userCookieData = {
            _id: userData._id,
            email: userData.email,
            role: userData.role,
            isActive: userData.isActive,
            isVerified: userData.isVerified,
            authStatus: userData.authStatus,
            fullname: userData.fullname,
            phone: userData.phone,
            avatar: userData.avatar,
            gender: userData.gender,
            dob: userData.dob,
            address: userData.address,
            membershipLevel: userData.membershipLevel,
            points: userData.points,
            isAuthenticated: true,
            timestamp: Date.now()
        };

        // Validate required fields
        if (!userCookieData._id || !userCookieData.email || !userCookieData.role) {
            throw new Error('Missing required user data fields');
        }

        // Set user cookie with proper encoding
        res.cookie("user", encodeURIComponent(JSON.stringify(userCookieData)), {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
    }
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