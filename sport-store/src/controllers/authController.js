import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { redisClient } from "../config/redis.js";
import User from "../models/user.js";
import env from "../config/env.js";
import { sendEmail } from "../utils/sendEmail.js";
import { logInfo, logError } from "../utils/logger.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, TOKEN_CONFIG, AUTH_CONFIG } from "../utils/constants.js";
import { hashPassword, formatUserResponse, handleError, generateOTP, setAuthCookies } from "../utils/helpers.js";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendEmail as sendEmailUtil } from '../utils/email.js';
import { oauth2Client, getGoogleAuthURL, getGoogleUser, verifyGoogleToken } from '../config/google.js';

// Helper functions
const cacheSet = (key, value, expiry) => redisClient.setEx(key, expiry, JSON.stringify(value));

const cacheGet = async (key) => {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
};

const sendAndCacheOTP = async (email, purpose) => {
    const otp = generateOTP();
    const otpKey = `otp:${purpose}:${email}`;
    await redisClient.set(otpKey, otp, 'EX', AUTH_CONFIG.OTP_EXPIRY);

    const subject = purpose === 'register' ? 'Xác thực tài khoản' : 'Đặt lại mật khẩu';
    const html = `
        <h1>Xác thực tài khoản</h1>
        <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
        <p>Mã này sẽ hết hạn sau ${AUTH_CONFIG.OTP_EXPIRY} giây.</p>
    `;

    await sendEmail(email, subject, html);
    return otp;
};

const generateTokens = (userId, email) => {
    if (!env.JWT_SECRET) {
        throw new Error('JWT secret is not configured');
    }

    const accessToken = generateAccessToken(userId, email);
    const refreshToken = generateRefreshToken(userId, email);

    return { accessToken, refreshToken };
};

// Controllers
export const register = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, password, username, googleId, googleEmail } = req.body;

        if (!email || !password || !username) {
            logError(`[${requestId}] Missing required fields`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            logError(`[${requestId}] Email already exists: ${email}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.EMAIL_EXISTS
            });
        }

        const hashedPassword = await hashPassword(password);
        const newUser = new User({
            email,
            password: hashedPassword,
            username,
            role: "user",
            isVerified: googleId ? true : false,
            authStatus: googleId ? "verified" : "pending",
            googleId: googleId || null,
            googleEmail: googleEmail || null,
            address: { province: "", district: "", ward: "", street: "" },
            dob: null,
            gender: "other",
            membershipLevel: "Hạng Sắt",
            totalSpent: 0,
            orderCount: 0
        });

        const savedUser = await newUser.save();

        if (!googleId) {
            await sendAndCacheOTP(email, 'register');
        }

        logInfo(`[${requestId}] Successfully registered user: ${email}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.USER_CREATED,
            data: {
                id: savedUser._id,
                email: savedUser.email,
                username: savedUser.username,
                isVerified: savedUser.isVerified
            }
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const verifyOTP = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, otp } = req.body;
        const otpKey = `otp:verify:${email}`;
        const storedOTP = await redisClient.get(otpKey);
        
        if (!storedOTP) {
            logError(`[${requestId}] Invalid or expired OTP for: ${email}`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.OTP_INVALID 
            });
        }

        if (storedOTP !== otp) {
            logError(`[${requestId}] Incorrect OTP for: ${email}`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.OTP_INCORRECT 
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            logError(`[${requestId}] User not found: ${email}`);
            return res.status(404).json({ 
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND 
            });
        }

        user.isVerified = true;
        user.authStatus = "verified";
        await user.save();

        await redisClient.del(otpKey);

        logInfo(`[${requestId}] Account verified: ${email}`);
        res.json({ 
            success: true,
            message: SUCCESS_MESSAGES.VERIFY_SUCCESS 
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const checkAuth = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        if (!req.user) {
            logError(`[${requestId}] User not found in request`);
            return res.status(401).json({ 
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND 
            });
        }

        logInfo(`[${requestId}] Auth check successful for user: ${req.user._id}`);
        res.json({
            success: true,
            user: formatUserResponse(req.user)
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const login = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, password, googleId, googleEmail } = req.body;

        if (!email || (!password && !googleId)) {
            logError(`[${requestId}] Missing required fields`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS
            });
        }

        let user = await User.findOne({ email });
        if (!user) {
            if (googleId) {
                // Nếu đăng nhập bằng Google và user chưa tồn tại, tạo mới
                return register(req, res);
            }
            logError(`[${requestId}] User not found: ${email}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        if (!user.isActive) {
            logError(`[${requestId}] Account inactive: ${email}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_INACTIVE
            });
        }

        if (user.isBlocked) {
            logError(`[${requestId}] Account blocked: ${email}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_BLOCKED
            });
        }

        if (!googleId) {
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                logError(`[${requestId}] Invalid password for user: ${email}`);
                return res.status(401).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_CREDENTIALS
                });
            }
        }

        if (!user.isVerified) {
            logError(`[${requestId}] Account not verified: ${email}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_NOT_VERIFIED
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id, user.email);

        // Update user's last login
        user.lastLoginAt = new Date();
        await user.save();

        // Set cookies
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return success response
        return res.status(200).json({
            success: true,
            message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            data: {
                user: formatUserResponse(user),
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        return handleError(error, requestId);
    }
};

export const logout = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (user) {
            user.refreshToken = null;
            await user.save();
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 0
        });

        logInfo(`[${requestId}] Successfully logged out user: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.LOGOUT_SUCCESS
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const refreshToken = async (req, res) => {
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

        // Verify refresh token
        const decoded = await verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            logError(`[${requestId}] User not found: ${decoded.userId}`);
            return res.status(401).json({ 
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND 
            });
        }

        // Generate new access token
        const accessToken = generateAccessToken(user._id, user.email);

        // Set new access token cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        logInfo(`[${requestId}] Token refreshed successfully for user: ${user._id}`);
        return res.status(200).json({
            success: true,
            message: SUCCESS_MESSAGES.TOKEN_REFRESHED,
            data: {
                accessToken,
                user: formatUserResponse(user)
            }
        });
    } catch (error) {
        logError(`[${requestId}] Token refresh failed`, error);
        return res.status(401).json({ 
            success: false,
            message: error.name === "TokenExpiredError" 
                ? ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED 
                : ERROR_MESSAGES.INVALID_TOKEN 
        });
    }
};

export const forgotPassword = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            logError(`[${requestId}] User not found: ${email}`);
            return res.status(404).json({ 
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND 
            });
        }

        const resetToken = user.generateResetToken();
        await user.save();

        const resetUrl = `${env.FRONTEND_URL}/reset-password/${resetToken}`;
        const html = `
            <h1>Đặt lại mật khẩu</h1>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng click vào link bên dưới để đặt lại mật khẩu:</p>
            <a href="${resetUrl}">Đặt lại mật khẩu</a>
            <p>Link này sẽ hết hạn sau 30 phút.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        `;

        await sendEmail(email, 'Đặt lại mật khẩu', html);

        logInfo(`[${requestId}] Password reset email sent to: ${email}`);
        res.json({ 
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT 
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const resetPassword = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { token, password } = req.body;
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            logError(`[${requestId}] Invalid or expired reset token`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.INVALID_RESET_TOKEN 
            });
        }

        user.password = await hashPassword(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        logInfo(`[${requestId}] Password reset successful for: ${user.email}`);
        res.json({ 
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS 
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const googleAuth = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { token } = req.body;
        if (!token) {
            logError(`[${requestId}] No Google token provided`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.GOOGLE_AUTH_FAILED
            });
        }

        // Verify Google token
        const ticket = await verifyGoogleToken(token);
        const payload = ticket.getPayload();
        
        // Find or create user
        let user = await User.findOne({ email: payload.email });
        if (!user) {
            user = await User.create({
                email: payload.email,
                fullname: payload.name,
                avatar: payload.picture,
                isVerified: true,
                authStatus: "verified",
                googleId: payload.sub,
                googleEmail: payload.email
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id, user.email);
        user.refreshToken = refreshToken;
        await user.save();

        // Set cookies
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY * 1000
        });

        logInfo(`[${requestId}] Successfully authenticated with Google: ${user.email}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            data: {
                accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    fullname: user.fullname,
                    avatar: user.avatar,
                    role: user.role,
                    isVerified: user.isVerified
                }
            }
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
        }
        res.json({
            message: SUCCESS_MESSAGES.USER_PROFILE,
            user
        });
    } catch (error) {
        res.status(500).json({ message: ERROR_MESSAGES.SERVER_ERROR });
    }
};

export const resendOTP = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email } = req.body;
        
        // Kiểm tra xem email có tồn tại trong hệ thống không
        const user = await User.findOne({ email });
        if (!user) {
            logError(`[${requestId}] User not found: ${email}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Gửi OTP mới
        await sendAndCacheOTP(email, 'verify');

        logInfo(`[${requestId}] Successfully resent OTP to: ${email}`);
        res.status(200).json({
            success: true,
            message: SUCCESS_MESSAGES.OTP_SENT
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const googleCallback = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { code } = req.query;
        if (!code) {
            logError(`[${requestId}] No code provided for Google callback`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.GOOGLE_AUTH_FAILED
            });
        }

        // Lấy thông tin user từ Google
        const googleUser = await getGoogleUser(code);
        if (!googleUser) {
            logError(`[${requestId}] Failed to get Google user info`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.GOOGLE_AUTH_FAILED
            });
        }

        // Tìm hoặc tạo user
        let user = await User.findOne({ email: googleUser.email });
        if (!user) {
            user = await User.create({
                email: googleUser.email,
                fullname: googleUser.name,
                avatar: googleUser.picture,
                isVerified: true,
                authStatus: "verified",
                googleId: googleUser.id,
                googleEmail: googleUser.email
            });
        }

        // Tạo tokens
        const { accessToken, refreshToken } = generateTokens(user._id, user.email);
        user.refreshToken = refreshToken;
        await user.save();

        // Set cookies
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY * 1000
        });

        logInfo(`[${requestId}] Successfully authenticated with Google: ${user.email}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            data: {
                accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    fullname: user.fullname,
                    avatar: user.avatar,
                    role: user.role,
                    isVerified: user.isVerified
                }
            }
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateProfile = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { fullName, phone, address, dob, gender } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            logError(`[${requestId}] User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Cập nhật thông tin
        if (fullName) user.fullname = fullName;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (dob) user.dob = dob;
        if (gender) user.gender = gender;

        await user.save();

        logInfo(`[${requestId}] Profile updated for user: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PROFILE_UPDATED,
            data: {
                id: user._id,
                email: user.email,
                fullname: user.fullname,
                phone: user.phone,
                address: user.address,
                dob: user.dob,
                gender: user.gender,
                avatar: user.avatar,
                role: user.role,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const changePassword = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            logError(`[${requestId}] User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Kiểm tra mật khẩu hiện tại
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            logError(`[${requestId}] Invalid current password for user: ${userId}`);
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_CURRENT_PASSWORD
            });
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        await user.save();

        logInfo(`[${requestId}] Password changed for user: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_CHANGED
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const verifyToken = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { token } = req.body;
        if (!token) {
            logError(`[${requestId}] No token provided`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.NO_TOKEN
            });
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -refreshToken');
        
        if (!user) {
            logError(`[${requestId}] User not found for token`);
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Token verified for user: ${user._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.TOKEN_VALID,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    isVerified: user.isVerified
                }
            }
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(401).json({
            success: false,
            message: ERROR_MESSAGES.INVALID_TOKEN
        });
    }
};

export const requestUpdate = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            logError(`[${requestId}] User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Gửi OTP để xác thực
        await sendAndCacheOTP(email, 'update');

        logInfo(`[${requestId}] Update request sent for user: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.OTP_SENT
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateUser = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, username, password, otp } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            logError(`[${requestId}] User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Kiểm tra OTP
        const otpKey = `otp:update:${email}`;
        const storedOTP = await redisClient.get(otpKey);
        
        if (!storedOTP) {
            logError(`[${requestId}] Invalid or expired OTP for: ${email}`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.OTP_INVALID 
            });
        }

        if (storedOTP !== otp) {
            logError(`[${requestId}] Incorrect OTP for: ${email}`);
            return res.status(400).json({ 
                success: false,
                message: ERROR_MESSAGES.OTP_INCORRECT 
            });
        }

        // Cập nhật thông tin
        if (email) user.email = email;
        if (username) user.username = username;
        if (password) user.password = await hashPassword(password);

        await user.save();
        await redisClient.del(otpKey);

        logInfo(`[${requestId}] User updated: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.USER_UPDATED,
            data: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};