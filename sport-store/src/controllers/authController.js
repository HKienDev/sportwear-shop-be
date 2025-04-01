import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getRedisClient } from "../config/redis.js";
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
const cacheSet = (key, value, expiry) => {
    const redis = getRedisClient();
    if (!redis) return;
    redis.setEx(key, expiry, JSON.stringify(value));
};

const cacheGet = async (key) => {
    const redis = getRedisClient();
    if (!redis) return null;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
};

const sendAndCacheOTP = async (email, purpose, requestId) => {
    const redis = getRedisClient();
    if (!redis) return null;

    const otp = generateOTP();
    const otpKey = `otp:${purpose}:${email}`;
    await redis.set(otpKey, otp, 'EX', AUTH_CONFIG.OTP_EXPIRY);

    await sendEmail({
        to: email,
        template: purpose,
        data: otp,
        requestId
    });

    return otp;
};

// Helper function để tạo tokens
export const generateTokens = (userId, email) => {
    const accessToken = generateAccessToken(userId, email);
    const refreshToken = generateRefreshToken(userId, email);
    return { accessToken, refreshToken };
};

// Helper function để xác thực OTP
const verifyOTPHelper = async (email, otp, purpose) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            logError(`[verifyOTPHelper] User not found: ${email}`);
            throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const redis = getRedisClient();
        if (!redis) {
            logError(`[verifyOTPHelper] Redis connection not available`);
            throw new Error('Redis connection not available');
        }

        // Kiểm tra OTP từ Redis
        const otpKey = `otp:${purpose}:${email}`;
        const storedOTP = await redis.get(otpKey);
        
        if (!storedOTP) {
            logError(`[verifyOTPHelper] OTP not found for: ${email}`);
            throw new Error(ERROR_MESSAGES.INVALID_OTP);
        }

        if (storedOTP !== otp) {
            logError(`[verifyOTPHelper] Invalid OTP for: ${email}`);
            throw new Error(ERROR_MESSAGES.INVALID_OTP);
        }

        // Xóa OTP sau khi xác thực thành công
        await redis.del(otpKey);
        logInfo(`[verifyOTPHelper] Successfully verified OTP for: ${email}`);

        return user;
    } catch (error) {
        logError(`[verifyOTPHelper] Error: ${error.message}`);
        throw error;
    }
};

// Helper function để kiểm tra token có trong blacklist không
const isTokenBlacklisted = async (token) => {
    const redis = getRedisClient();
    if (!redis) return false;
    const blacklisted = await redis.get(`blacklist:${token}`);
    return !!blacklisted;
};

// Helper function để thêm token vào blacklist
const addTokenToBlacklist = async (token, expiry) => {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(`blacklist:${token}`, '1', 'EX', expiry);
};

// Controllers
export const register = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, password, username, fullname, phone } = req.body;

        if (!email || !password || !username || !fullname || !phone) {
            logError(`[${requestId}] Missing required fields`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS,
                errors: [
                    { field: 'email', message: !email ? 'Email là bắt buộc' : null },
                    { field: 'password', message: !password ? 'Mật khẩu là bắt buộc' : null },
                    { field: 'username', message: !username ? 'Tên đăng nhập là bắt buộc' : null },
                    { field: 'fullname', message: !fullname ? 'Họ tên là bắt buộc' : null },
                    { field: 'phone', message: !phone ? 'Số điện thoại là bắt buộc' : null }
                ].filter(error => error.message)
            });
        }

        const existingUser = await User.findOne({ 
            $or: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            logError(`[${requestId}] User already exists: ${email}`);
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? ERROR_MESSAGES.EMAIL_EXISTS : 'Tên đăng nhập đã tồn tại',
                errors: [
                    { 
                        field: existingUser.email === email ? 'email' : 'username', 
                        message: existingUser.email === email ? ERROR_MESSAGES.EMAIL_EXISTS : 'Tên đăng nhập đã tồn tại' 
                    }
                ]
            });
        }

        // Gửi OTP xác thực
        await sendAndCacheOTP(email, 'register', requestId);

        const hashedPassword = await hashPassword(password);
        const newUser = new User({
            email,
            password: hashedPassword,
            username,
            fullname,
            phone,
            role: "user",
            isVerified: false,
            authStatus: "pending",
            address: { province: "", district: "", ward: "", street: "" },
            dob: null,
            gender: "other",
            membershipLevel: "Hạng Sắt",
            totalSpent: 0,
            orderCount: 0
        });

        const savedUser = await newUser.save();

        logInfo(`[${requestId}] Successfully registered user: ${email}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.USER_CREATED,
            data: {
                id: savedUser._id,
                email: savedUser.email,
                username: savedUser.username,
                fullname: savedUser.fullname,
                phone: savedUser.phone,
                role: savedUser.role,
                isVerified: savedUser.isVerified,
                authStatus: savedUser.authStatus
            }
        });
    } catch (error) {
        logError(`[${requestId}] Registration failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

export const checkAuth = async (req, res) => {
    try {
        // Nếu middleware verifyUser đã chạy thành công, user đã được gán vào req.user
        const user = req.user;
        
        // Trả về thông tin user đã được lọc
        return res.status(200).json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                fullname: user.fullname,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Error in checkAuth:', error);
        return res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        });
    }
};

export const login = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, password } = req.body;

        // Tìm user theo email
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            logError(`[${requestId}] User not found: ${email}`);
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_CREDENTIALS,
                errors: [
                    { field: 'email', message: 'Email hoặc mật khẩu không chính xác' }
                ]
            });
        }

        // Kiểm tra mật khẩu
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            logError(`[${requestId}] Invalid password for user: ${email}`);
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_CREDENTIALS,
                errors: [
                    { field: 'password', message: 'Email hoặc mật khẩu không chính xác' }
                ]
            });
        }

        // Kiểm tra trạng thái tài khoản
        if (!user.isActive) {
            logError(`[${requestId}] Account is inactive: ${email}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_INACTIVE,
                errors: [
                    { message: 'Tài khoản đã bị khóa' }
                ]
            });
        }

        // Kiểm tra trạng thái xác thực
        if (user.authStatus === 'pending') {
            logError(`[${requestId}] Account not verified: ${email}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_NOT_VERIFIED,
                errors: [
                    { message: 'Tài khoản chưa được xác thực' }
                ]
            });
        }

        if (user.authStatus === 'blocked') {
            logError(`[${requestId}] Account is blocked: ${email}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_BLOCKED,
                errors: [
                    { message: 'Tài khoản đã bị chặn' }
                ]
            });
        }

        // Cập nhật thông tin đăng nhập
        await user.updateLastLogin();

        // Tạo tokens
        const { accessToken, refreshToken } = generateTokens(user._id, user.email);

        // Lưu refresh token vào database
        user.refreshToken = refreshToken;
        await user.save();

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        // Log success
        logInfo(`[${requestId}] Successfully logged in user: ${email}`);

        // Trả về thông tin user và access token
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            data: {
                accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    fullname: user.fullname,
                    phone: user.phone,
                    role: user.role,
                    isVerified: user.isVerified,
                    authStatus: user.authStatus
                }
            }
        });
    } catch (error) {
        logError(`[${requestId}] Login failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            errors: [
                { message: error.message }
            ]
        });
    }
};

export const logout = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const userId = req.user._id;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.UNAUTHORIZED,
                errors: [{ message: 'Token không tồn tại' }]
            });
        }

        // Kiểm tra xem token đã bị blacklist chưa
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.UNAUTHORIZED,
                errors: [{ message: 'Token đã bị vô hiệu hóa' }]
            });
        }
        
        // Xóa refresh token của user
        await User.findByIdAndUpdate(userId, { 
            $unset: { refreshToken: 1 }
        });

        // Thêm token vào blacklist với thời gian hết hạn bằng với thời gian còn lại của token
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const timeToExpire = decoded.exp - Math.floor(Date.now() / 1000);
        if (timeToExpire > 0) {
            await addTokenToBlacklist(token, timeToExpire);
        }

        // Xóa cookies
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        logInfo(`[${requestId}] Successfully logged out user: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.LOGOUT_SUCCESS
        });
    } catch (error) {
        logError(`[${requestId}] Logout failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            errors: [
                { message: error.message }
            ]
        });
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

        if (!email) {
            logError(`[${requestId}] Missing email field`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS,
                errors: [{ field: 'email', message: 'Email là bắt buộc' }]
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

        // Gửi OTP đặt lại mật khẩu
        await sendAndCacheOTP(email, 'forgotPassword', requestId);

        logInfo(`[${requestId}] Password reset OTP sent to: ${email}`);
        res.status(200).json({
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_RESET_OTP_SENT
        });
    } catch (error) {
        logError(`[${requestId}] Password reset request failed: ${error.message}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

export const resetPassword = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, otp, newPassword } = req.body;

        // Log request body để debug
        logInfo(`[${requestId}] Reset password request body:`, req.body);

        // Kiểm tra các trường bắt buộc
        if (!email || !otp || !newPassword) {
            logError(`[${requestId}] Missing required fields`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS,
                errors: [
                    { field: 'email', message: !email ? 'Email là bắt buộc' : null },
                    { field: 'otp', message: !otp ? 'Mã OTP là bắt buộc' : null },
                    { field: 'newPassword', message: !newPassword ? 'Mật khẩu mới là bắt buộc' : null }
                ].filter(error => error.message)
            });
        }

        // Xác thực OTP
        const user = await verifyOTPHelper(email, otp, 'reset');

        // Kiểm tra trạng thái tài khoản
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

        // Đặt lại mật khẩu
        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;
        await user.save();

        logInfo(`[${requestId}] Successfully reset password for user: ${email}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_RESET
        });
    } catch (error) {
        logError(`[${requestId}] Password reset failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        
        // Xử lý các lỗi cụ thể
        if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }
        
        if (error.message === ERROR_MESSAGES.INVALID_OTP) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_OTP
            });
        }
        
        if (error.message === 'Redis connection not available') {
            return res.status(503).json({
                success: false,
                message: 'Service temporarily unavailable. Please try again later.'
            });
        }

        // Lỗi server
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            errors: [
                { message: error.message }
            ]
        });
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

export const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ message: ERROR_MESSAGES.INVALID_REQUEST });
        }

        // Lấy thông tin user từ Google
        const googleUser = await getGoogleUser(code);
        if (!googleUser) {
            return res.status(400).json({ message: ERROR_MESSAGES.INVALID_GOOGLE_TOKEN });
        }

        // Kiểm tra email đã tồn tại chưa
        let user = await User.findOne({ email: googleUser.email });
        
        if (!user) {
            // Tạo user mới nếu chưa tồn tại
            user = await User.create({
                email: googleUser.email,
                fullName: googleUser.name,
                avatar: googleUser.picture,
                isVerified: true,
                googleId: googleUser.id
            });
        }

        // Tạo tokens
        const { accessToken, refreshToken } = generateTokens(user._id, user.email);

        // Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        // Redirect về frontend
        res.redirect(`${env.FRONTEND_URL}/auth/success`);
    } catch (error) {
        logError('Google callback error:', error);
        res.redirect(`${env.FRONTEND_URL}/auth/error`);
    }
};

export const getProfile = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const user = await User.findById(req.user._id).select('-password -refreshToken');
        if (!user) {
            logError(`[${requestId}] User not found: ${req.user._id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Successfully retrieved profile for user: ${user._id}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.USER_PROFILE,
            data: {
                id: user._id,
                email: user.email,
                username: user.username,
                fullname: user.fullname,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
                authStatus: user.authStatus,
                address: user.address,
                dob: user.dob,
                gender: user.gender,
                avatar: user.avatar,
                membershipLevel: user.membershipLevel,
                totalSpent: user.totalSpent,
                orderCount: user.orderCount
            }
        });
    } catch (error) {
        logError(`[${requestId}] Failed to get profile: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            errors: [
                { message: error.message }
            ]
        });
    }
};

export const verifyToken = async (req, res) => {
    try {
        // Nếu middleware verifyUser đã chạy thành công, token hợp lệ
        return res.status(200).json({
            success: true,
            message: SUCCESS_MESSAGES.TOKEN_VALID
        });
    } catch (error) {
        console.error('Error in verifyToken:', error);
        return res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
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
        await sendAndCacheOTP(email, 'update', requestId);

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

// Yêu cầu cập nhật thông tin cá nhân
export const requestProfileUpdate = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const userId = req.user.id;
        const { email, phone, fullname, address, dob, gender } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            logError(`[${requestId}] User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Gửi OTP xác nhận cập nhật thông tin
        await sendAndCacheOTP(user.email, 'profileUpdate', requestId);

        // Lưu thông tin cập nhật vào Redis
        const updateData = {
            email,
            phone,
            fullname,
            address,
            dob,
            gender
        };

        const redis = getRedisClient();
        if (!redis) {
            throw new Error('Redis connection not available');
        }

        const updateKey = `profile_update:${user.email}`;
        await redis.set(updateKey, JSON.stringify(updateData), 'EX', AUTH_CONFIG.OTP_EXPIRY);

        logInfo(`[${requestId}] Profile update OTP sent to user: ${userId}`);
        res.status(200).json({
            success: true,
            message: SUCCESS_MESSAGES.PROFILE_UPDATE_OTP_SENT
        });
    } catch (error) {
        logError(`[${requestId}] Profile update request failed: ${error.message}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

// Cập nhật thông tin cá nhân với OTP
export const updateProfile = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const userId = req.user._id;
        const { otp, updateData } = req.body;

        // Log request body để debug
        logInfo(`[${requestId}] Update profile request body:`, req.body);

        // Kiểm tra các trường bắt buộc
        if (!otp || !updateData) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS,
                errors: [
                    { field: 'otp', message: !otp ? 'Mã OTP là bắt buộc' : null },
                    { field: 'updateData', message: !updateData ? 'Dữ liệu cập nhật là bắt buộc' : null }
                ].filter(error => error.message)
            });
        }

        // Kiểm tra OTP
        const redis = getRedisClient();
        if (!redis) {
            throw new Error('Redis connection failed');
        }

        const otpKey = `otp:profileUpdate:${req.user.email}`;
        const storedOTP = await redis.get(otpKey);
        
        if (!storedOTP) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_OTP,
                errors: [
                    { field: 'otp', message: 'OTP không hợp lệ hoặc đã hết hạn' }
                ]
            });
        }

        // Kiểm tra OTP có khớp không
        if (otp !== storedOTP) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_OTP,
                errors: [
                    { field: 'otp', message: 'OTP không chính xác' }
                ]
            });
        }

        // Lấy dữ liệu cập nhật từ Redis
        const updateKey = `profile_update:${req.user.email}`;
        const storedUpdateData = await redis.get(updateKey);
        
        if (!storedUpdateData) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_REQUEST,
                errors: [
                    { message: 'Không tìm thấy yêu cầu cập nhật thông tin' }
                ]
            });
        }

        const parsedStoredData = JSON.parse(storedUpdateData);

        // Kiểm tra dữ liệu cập nhật có khớp với dữ liệu đã lưu không
        if (JSON.stringify(updateData) !== JSON.stringify(parsedStoredData)) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_REQUEST,
                errors: [
                    { message: 'Dữ liệu cập nhật không khớp với yêu cầu ban đầu' }
                ]
            });
        }

        // Cập nhật thông tin user
        const user = await User.findById(userId);
        if (!user) {
            throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Cập nhật các trường được phép
        if (updateData.email) user.email = updateData.email;
        if (updateData.phone) user.phone = updateData.phone;
        if (updateData.fullname) user.fullname = updateData.fullname;
        if (updateData.address) user.address = updateData.address;
        if (updateData.dob) user.dob = updateData.dob;
        if (updateData.gender) user.gender = updateData.gender;

        await user.save();

        // Xóa OTP và dữ liệu cập nhật khỏi Redis
        await redis.del(otpKey);
        await redis.del(updateKey);

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
        logError(`[${requestId}] Profile update failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            errors: [
                { message: error.message }
            ]
        });
    }
};

export const changePassword = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId).select('+password');
        if (!user) {
            logError(`[${requestId}] User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Kiểm tra mật khẩu hiện tại
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            logError(`[${requestId}] Invalid current password for user: ${userId}`);
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_PASSWORD,
                errors: [
                    { field: 'currentPassword', message: 'Mật khẩu hiện tại không chính xác' }
                ]
            });
        }

        // Cập nhật mật khẩu mới
        user.password = await hashPassword(newPassword);
        await user.save();

        logInfo(`[${requestId}] Password changed for user: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_CHANGED
        });
    } catch (error) {
        logError(`[${requestId}] Password change failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            errors: [
                { message: error.message }
            ]
        });
    }
};