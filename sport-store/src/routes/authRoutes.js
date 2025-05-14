import express from 'express';
import { 
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    refreshToken,
    verifyEmail,
    resendVerificationEmail,
    getProfile,
    checkAuth,
    verifyToken,
    updateProfile,
    requestPasswordChange,
    verifyOTPAndChangePassword,
    requestProfileUpdate
} from '../controllers/authController.js';
import { verifyUser } from '../middlewares/authMiddleware.js';
import { validateLogin, validateRegister, validateForgotPassword, validateResetPassword } from '../middlewares/validationMiddleware.js';
import { loginRateLimiter } from '../middlewares/rateLimit.js';

const router = express.Router();

// Public routes
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working!' });
});

// Auth routes
router.post('/login', loginRateLimiter, validateLogin, login);
router.post('/register', validateRegister, register);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/logout', verifyUser, logout);
router.post('/refresh-token', refreshToken);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Đổi mật khẩu với xác thực OTP
router.post('/request-password-change', verifyUser, requestPasswordChange);
router.post('/verify-otp-change-password', verifyUser, verifyOTPAndChangePassword);

// Protected routes
router.get('/profile', verifyUser, getProfile);
router.get('/check', verifyUser, checkAuth);
router.get('/verify-token', verifyUser, verifyToken);

// Cập nhật thông tin profile
router.post('/profile/update-request', verifyUser, requestProfileUpdate);
router.put('/profile/update', verifyUser, updateProfile);

export default router; 