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
    verifyOTPSchema,
    resendOTPSchema
} from '../validations/authSchema.js';
import { auth } from '../middlewares/auth.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter cho refresh token
const refreshTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Quá nhiều yêu cầu refresh token. Vui lòng thử lại sau.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: true // Skip successful requests in rate limiting
});

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Auth routes
router.post("/register", validateRequest(registerSchema), authController.register);
router.post("/login", validateRequest(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh-token", refreshTokenLimiter, authController.refreshToken);
router.post("/forgot-password", validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validateRequest(resetPasswordSchema), authController.resetPassword);
router.post("/verify-otp", validateRequest(verifyOTPSchema), authController.verifyOTP);
router.post("/resend-otp", validateRequest(resendOTPSchema), authController.resendOTP);

// Google Auth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// Protected routes
router.get("/profile", auth, authController.getProfile);
router.put("/profile", auth, validateRequest(updateProfileSchema), authController.updateProfile);
router.put("/change-password", auth, validateRequest(changePasswordSchema), authController.changePassword);

// Kiểm tra route hoạt động
router.get("/", (req, res) => {
    res.json({ message: "Route xác thực đang hoạt động!" });
});

// Xác thực OTP để kích hoạt tài khoản
router.post("/verify-account", authController.verifyOTP);

// Gửi OTP để xác thực trước khi thay đổi thông tin bảo mật
router.post("/request-update", verifyUser, authController.requestUpdate); // ✅ Thêm `verifyUser`

// Xác thực OTP và cập nhật thông tin bảo mật (email, username, password)
router.put("/update-user", verifyUser, authController.updateUser); // ✅ Thêm `verifyUser`

// Lấy thông tin user từ token
router.get("/profile", verifyUser, async (req, res) => {
  try {
      // Tìm user trong database
      const user = await User.findById(req.user.userId).select("-password -refreshToken");
      
      if (!user) {
          return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      res.json({ message: "User Profile", user });
  } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// Xác thực token
router.post("/verify-token", authController.verifyToken);

// Check auth status
router.get("/check", verifyRefreshTokenMiddleware, authController.checkAuth);

// Get current user
router.get("/me", verifyUser, authController.checkAuth);

export default router;