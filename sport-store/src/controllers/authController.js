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

        const hashedPassword = await hashPassword(password);
        const newUser = new User({
            email,
            password: hashedPassword,
            username,
            fullname,
            phone,
            role: "user",
            isVerified: true,
            authStatus: "verified",
            address: { province: "", district: "", ward: "", street: "" },
            dob: null,
            gender: "other",
            membershipLevel: "Hạng Sắt",
            totalSpent: 0,
            orderCount: 0
        });

        const savedUser = await newUser.save();

        try {
            // Gửi email thông báo đăng ký thành công
            await sendEmail({
                to: savedUser.email,
                template: 'register_success',
                data: {
                    fullname: savedUser.fullname,
                    email: savedUser.email,
                    username: savedUser.username,
                    phone: savedUser.phone
                },
                requestId
            });
            logInfo(`[${requestId}] Successfully sent registration email to: ${savedUser.email}`);
        } catch (emailError) {
            logError(`[${requestId}] Failed to send registration email: ${emailError.message}`);
            // Không trả về lỗi cho client nếu gửi email thất bại
        }

        logInfo(`[${requestId}] Successfully registered user: ${savedUser.email}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.USER_CREATED,
            data: {
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
    const requestId = req.id || 'unknown';
    
    try {
        logInfo(`[${requestId}] Processing auth check request`);
        
        const user = req.user;
        
        if (!user) {
            logError(`[${requestId}] No user found in request`);
            return res.status(401).json({
                success: false,
                message: ERROR_MESSAGES.UNAUTHORIZED
            });
        }

        // Kiểm tra cache
        const redis = getRedisClient();
        if (redis) {
            const cacheKey = `user:${user._id}`;
            const cachedUser = await redis.get(cacheKey);
            
            if (cachedUser) {
                logInfo(`[${requestId}] Returning cached user data for: ${user._id}`);
                return res.json({
                    success: true,
                    data: JSON.parse(cachedUser),
                    cached: true
                });
            }
        }

        // Format user data
        const userData = {
            _id: user._id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            address: user.address,
            avatar: user.avatar,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        // Cache user data
        if (redis) {
            const cacheKey = `user:${user._id}`;
            await redis.set(cacheKey, JSON.stringify(userData), 'EX', 300); // Cache 5 phút
        }

        logInfo(`[${requestId}] Successfully processed auth check for user: ${user._id}`);
        return res.json({
            success: true,
            data: userData,
            cached: false
        });
    } catch (error) {
        logError(`[${requestId}] Check auth error: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
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
        setAuthCookies(res, accessToken, refreshToken, {
            _id: user._id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            isVerified: user.isVerified,
            authStatus: user.authStatus,
            username: user.username,
            fullname: user.fullname,
            phone: user.phone,
            avatar: user.avatar,
            gender: user.gender,
            dob: user.dob,
            address: user.address,
            membershipLevel: user.membershipLevel,
            points: user.points
        });

        // Log success
        logInfo(`[${requestId}] Successfully logged in user: ${email}`);

        // Trả về thông tin user và access token
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            data: {
                accessToken,
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    isVerified: user.isVerified,
                    authStatus: user.authStatus,
                    username: user.username,
                    fullname: user.fullname,
                    phone: user.phone,
                    avatar: user.avatar,
                    gender: user.gender,
                    dob: user.dob,
                    address: user.address,
                    membershipLevel: user.membershipLevel,
                    points: user.points
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
        const userId = req.user?._id;
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
        
        // Xóa refresh token của user nếu có userId
        if (userId) {
            await User.findByIdAndUpdate(userId, { 
                $unset: { refreshToken: 1 }
            });
        }

        try {
            // Thử verify token để lấy thời gian hết hạn
            const decoded = jwt.verify(token, env.JWT_SECRET);
            const timeToExpire = decoded.exp - Math.floor(Date.now() / 1000);
            
            // Thêm token vào blacklist với thời gian hết hạn
            await addTokenToBlacklist(token, timeToExpire);
            
            logInfo(`[${requestId}] Token added to blacklist with expiry: ${timeToExpire}s`);
        } catch (error) {
            // Nếu token hết hạn, vẫn thêm vào blacklist
            if (error.name === 'TokenExpiredError') {
                logInfo(`[${requestId}] Token expired, adding to blacklist`);
                await addTokenToBlacklist(token, 24 * 60 * 60); // Thêm vào blacklist 24h
            } else {
                throw error;
            }
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

        logInfo(`[${requestId}] Successfully logged out user: ${userId || 'unknown'}`);
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
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            logError(`[${requestId}] Refresh token is required`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED
            });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            logError(`[${requestId}] User not found: ${decoded.userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Generate new tokens
        const accessToken = generateAccessToken(user._id, user.email);
        const newRefreshToken = generateRefreshToken(user._id, user.email);

        // Update user's refresh token
        user.refreshToken = newRefreshToken;
        await user.save();

        // Get Redis client
        const redis = getRedisClient();
        if (!redis) {
            throw new Error('Redis connection not available');
        }

        // Cache user data
        await redis.set(
            `user:${user._id}`,
            JSON.stringify(user),
            'EX',
            env.REDIS_CACHE_TTL
        );

        logInfo(`[${requestId}] Successfully refreshed token for user: ${user._id}`);
        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar
                }
            }
        });
    } catch (error) {
        logError(`[${requestId}] Error refreshing token: ${error.message}`);
        res.status(401).json({
            success: false,
            message: ERROR_MESSAGES.INVALID_REFRESH_TOKEN
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
        const { otp, newPassword } = req.body;

        // Log request body để debug
        logInfo(`[${requestId}] Reset password request body:`, req.body);

        // Kiểm tra các trường bắt buộc
        if (!otp || !newPassword) {
            logError(`[${requestId}] Missing required fields`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS,
                errors: [
                    { field: 'otp', message: !otp ? 'Mã OTP là bắt buộc' : null },
                    { field: 'newPassword', message: !newPassword ? 'Mật khẩu mới là bắt buộc' : null }
                ].filter(error => error.message)
            });
        }

        // Lấy email từ Redis dựa vào OTP
        const redis = getRedisClient();
        if (!redis) {
            throw new Error('Redis connection not available');
        }

        // Tìm email dựa vào OTP
        const keys = await redis.keys('otp:forgotPassword:*');
        let userEmail = null;
        
        for (const key of keys) {
            const storedOTP = await redis.get(key);
            if (storedOTP === otp) {
                userEmail = key.split(':')[2];
                break;
            }
        }

        if (!userEmail) {
            logError(`[${requestId}] Invalid OTP`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_OTP
            });
        }

        // Xác thực OTP
        const user = await verifyOTPHelper(userEmail, otp, 'forgotPassword');

        // Kiểm tra trạng thái tài khoản
        if (!user.isActive) {
            logError(`[${requestId}] Account inactive: ${userEmail}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_INACTIVE
            });
        }

        if (user.isBlocked) {
            logError(`[${requestId}] Account blocked: ${userEmail}`);
            return res.status(403).json({
                success: false,
                message: ERROR_MESSAGES.ACCOUNT_BLOCKED
            });
        }

        // Đặt lại mật khẩu
        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;
        await user.save();

        logInfo(`[${requestId}] Successfully reset password for user: ${userEmail}`);
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
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }
        res.status(200).json({
            success: true,
            data: formatUserResponse(user)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR
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
        const userId = req.user._id;
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

// Cập nhật thông tin profile
export const updateProfile = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { otp } = req.body;
        const userId = req.user._id;

        if (!otp) {
            logError(`[${requestId}] Missing OTP`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS,
                errors: [{ field: 'otp', message: 'Mã OTP là bắt buộc' }]
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            logError(`[${requestId}] User not found: ${userId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Xác thực OTP
        await verifyOTPHelper(user.email, otp, 'profileUpdate');

        // Lấy thông tin cập nhật từ Redis
        const redis = getRedisClient();
        if (!redis) {
            throw new Error('Redis connection not available');
        }

        const updateKey = `profile_update:${user.email}`;
        const updateDataStr = await redis.get(updateKey);
        
        if (!updateDataStr) {
            logError(`[${requestId}] Update data not found for user: ${userId}`);
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy thông tin cập nhật. Vui lòng thử lại.'
            });
        }

        const updateData = JSON.parse(updateDataStr);

        // Cập nhật thông tin user
        Object.assign(user, updateData);
        await user.save();

        // Xóa dữ liệu cập nhật khỏi Redis
        await redis.del(updateKey);

        logInfo(`[${requestId}] Successfully updated profile for user: ${userId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PROFILE_UPDATED,
            data: formatUserResponse(user)
        });
    } catch (error) {
        logError(`[${requestId}] Profile update failed: ${error.message}`);
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

        // Lỗi server
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
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

// Gửi lại email xác thực
export const resendVerificationEmail = async (req, res) => {
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

        if (user.isVerified) {
            logError(`[${requestId}] User already verified: ${email}`);
            return res.status(400).json({
                success: false,
                message: 'Tài khoản đã được xác thực'
            });
        }

        // Gửi OTP xác thực
        await sendAndCacheOTP(email, 'verify', requestId);

        logInfo(`[${requestId}] Successfully resent verification email to: ${email}`);
        res.json({
            success: true,
            message: 'Đã gửi lại email xác thực'
        });
    } catch (error) {
        logError(`[${requestId}] Failed to resend verification email: ${error.message}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

// Xác thực email
export const verifyEmail = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            logError(`[${requestId}] Missing required fields`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.MISSING_FIELDS,
                errors: [
                    { field: 'email', message: !email ? 'Email là bắt buộc' : null },
                    { field: 'otp', message: !otp ? 'Mã OTP là bắt buộc' : null }
                ].filter(error => error.message)
            });
        }

        // Xác thực OTP
        const user = await verifyOTPHelper(email, otp, 'verify');

        // Cập nhật trạng thái xác thực
        user.isVerified = true;
        user.authStatus = 'verified';
        await user.save();

        logInfo(`[${requestId}] Successfully verified email for user: ${email}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
            data: {
                id: user._id,
                email: user.email,
                isVerified: user.isVerified,
                authStatus: user.authStatus
            }
        });
    } catch (error) {
        logError(`[${requestId}] Email verification failed: ${error.message}`);
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

export const requestPasswordChange = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            logError(`[${requestId}] User not found: ${req.user._id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Gửi OTP xác thực đổi mật khẩu
        await sendAndCacheOTP(user.email, 'changePassword', requestId);

        logInfo(`[${requestId}] Sent OTP for password change to: ${user.email}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.OTP_SENT
        });
    } catch (error) {
        logError(`[${requestId}] Password change request failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

export const verifyOTPAndChangePassword = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { otp, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            logError(`[${requestId}] User not found: ${req.user._id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.USER_NOT_FOUND
            });
        }

        // Kiểm tra mật khẩu hiện tại
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            logError(`[${requestId}] Invalid current password for user: ${user.email}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_PASSWORD
            });
        }

        // Xác thực OTP
        await verifyOTPHelper(user.email, otp, 'changePassword');

        // Kiểm tra mật khẩu mới có khác mật khẩu cũ không
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            logError(`[${requestId}] New password must be different from current password`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.PASSWORDS_MUST_DIFFER
            });
        }

        // Cập nhật mật khẩu mới
        user.password = await hashPassword(newPassword);
        await user.save();

        logInfo(`[${requestId}] Successfully changed password for user: ${user.email}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PASSWORD_CHANGED_WITH_OTP
        });
    } catch (error) {
        logError(`[${requestId}] Password change failed: ${error.message}`);
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

        // Lỗi server
        res.status(500).json({
            success: false,
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};