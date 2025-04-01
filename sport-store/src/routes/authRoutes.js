import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import User from "../models/user.js";
import * as authController from "../controllers/authController.js";
import { verifyUser, verifyAdmin, verifyRefreshTokenMiddleware } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    registerSchema, 
    loginSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema, 
    changePasswordSchema, 
    updateProfileSchema,
    updateProfileRequestSchema
} from '../validations/authSchema.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter cho refresh token và các route nhạy cảm
const refreshTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5, // giới hạn 5 request mỗi IP trong khoảng thời gian
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

const sensitiveRouteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 3, // giới hạn 3 request mỗi IP trong 1 giờ
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Authentication routes
router.post("/register", validateRequest(registerSchema), authController.register);
router.post("/login", validateRequest(loginSchema), authController.login);
router.post("/logout", verifyUser, authController.logout);
router.post("/refresh-token", refreshTokenLimiter, authController.refreshToken);

// Password management routes
router.post("/forgot-password", validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validateRequest(resetPasswordSchema), authController.resetPassword);

// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// Protected user profile routes
router.get("/profile", verifyUser, authController.getProfile);

// Kiểm tra trạng thái đăng nhập
router.get("/check", verifyUser, authController.checkAuth);

// Xác thực token
router.post("/verify-token", verifyUser, authController.verifyToken);

// Cập nhật thông tin cá nhân (yêu cầu OTP)
router.post("/profile/update-request", verifyUser, validateRequest(updateProfileRequestSchema), authController.requestProfileUpdate);

// Xác nhận cập nhật thông tin với OTP
router.put("/profile/update", verifyUser, validateRequest(updateProfileSchema), authController.updateProfile);

// Security update routes
router.post("/request-update", verifyUser, sensitiveRouteLimiter, authController.requestUpdate);

// Health check route
router.get("/", (req, res) => {
    res.json({ message: "Auth service is running!" });
});

export default router;