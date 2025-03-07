import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis.js";
import User from "../models/user.js";
import env from "../config/env.js";
import { sendOtpEmail } from "../utils/sendEmail.js";

// Tạo mã OTP ngẫu nhiên 6 chữ số
const generateOTP = (length = 6) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

// Băm mật khẩu
const hashPassword = (password) => bcrypt.hash(password, 10);

// Đọc/ghi dữ liệu từ Redis
const cacheSet = (key, value, expiry) => redisClient.setEx(key, expiry, JSON.stringify(value));
const cacheGet = async (key) => {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
};

// Gửi OTP qua email và lưu vào Redis
const sendAndCacheOTP = async (email, otpKey, data, expiry = 60) => {
    const otp = generateOTP();
    if (!(await sendOtpEmail(email, otp))) return false;

    await cacheSet(otpKey, { ...data, otp }, expiry);
    return true;
};

// Đăng ký tài khoản
export const register = async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (await User.exists({ email })) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }

        const hashedPassword = await hashPassword(password);
        if (!(await sendAndCacheOTP(email, `otp:${email}`, { username, hashedPassword }))) {
            return res.status(500).json({ message: "Gửi OTP thất bại. Vui lòng thử lại!" });
        }

        res.status(201).json({ message: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận OTP." });
    } catch (error) {
        console.error("[REGISTER] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Xác thực OTP để kích hoạt tài khoản
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const otpData = await cacheGet(`otp:${email}`);
        if (!otpData) return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn" });

        const { otp: storedOtp, username, hashedPassword } = otpData;
        if (storedOtp !== otp) return res.status(400).json({ message: "OTP không chính xác!" });

        if (await User.exists({ email })) return res.status(400).json({ message: "Email đã tồn tại!" });

        const user = new User({ email, username, password: hashedPassword, isVerified: true });
        await user.save();
        await redisClient.del(`otp:${email}`);

        res.status(200).json({ message: "Tài khoản đã được xác thực và tạo thành công!" });
    } catch (error) {
        console.error("[VERIFY OTP] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Đăng nhập
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.status(401).json({ message: "Tài khoản không tồn tại" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Mật khẩu không chính xác" });

        const accessToken = jwt.sign({ userId: user._id, role: user.role }, env.ACCESS_TOKEN_SECRET, { expiresIn: "30m" });

        const refreshToken = jwt.sign({ userId: user._id }, env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Strict",
        });

        res.status(200).json({
            message: "Đăng nhập thành công",
            accessToken,
            user: { _id: user._id, username: user.username, role: user.role, isActive: user.isActive },
        });
    } catch (error) {
        console.error("[LOGIN] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Đăng xuất
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(401).json({ message: "Không tìm thấy Refresh Token" });

        const user = await User.findOne({ refreshToken });
        if (!user) return res.status(403).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn" });

        user.refreshToken = null;
        await user.save();

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "Strict",
        });

        res.status(200).json({ message: "Đăng xuất thành công!" });
    } catch (error) {
        console.error("[LOGOUT] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Quên mật khẩu
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!(await User.exists({ email }))) return res.status(404).json({ message: "Email không tồn tại" });

        if (!(await sendAndCacheOTP(email, `forgot-password:${email}`, {}, 60))) {
            return res.status(500).json({ message: "Gửi OTP thất bại" });
        }

        res.json({ success: true, message: "OTP đã được gửi đến email của bạn!" });
    } catch (error) {
        console.error("[FORGOT PASSWORD] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Xác minh OTP để đặt lại mật khẩu
export const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Kiểm tra đầu vào
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
        }

        // Kiểm tra xem email có yêu cầu quên mật khẩu không
        const cachedData = await redisClient.get(`forgot-password:${email}`);
        if (!cachedData) return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn" });

        let storedOtp;
        try {
            storedOtp = JSON.parse(cachedData).otp;
        } catch (error) {
            return res.status(500).json({ message: "Lỗi khi xử lý OTP" });
        }

        // Kiểm tra OTP hợp lệ không
        if (String(storedOtp) !== String(otp)) {
            return res.status(400).json({ message: "OTP không chính xác" });
        }

        // Kiểm tra user tồn tại không
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

        // Băm mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Xóa OTP khỏi Redis
        await redisClient.del(`forgot-password:${email}`);

        res.status(200).json({ message: "Mật khẩu đã được đặt lại thành công!" });
    } catch (error) {
        console.error("[VERIFY FORGOT PASSWORD] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Xác thực token
export const verifyToken = (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false, message: "Token không được cung cấp" });

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        res.status(200).json({ valid: true, decoded });
    } catch (error) {
        const errorMessage = error.name === "TokenExpiredError" ? "Token hết hạn" : "Token không hợp lệ";
        res.status(401).json({ valid: false, message: errorMessage });
    }
};

// Hàm tạo Access Token mới từ Refresh Token
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(401).json({ message: "Không có Refresh Token" });

        const user = await User.findOne({ refreshToken });
        if (!user) return res.status(403).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn" });

        const newAccessToken = jwt.sign(
            { userId: user._id, role: user.role },
            env.ACCESS_TOKEN_SECRET,
            { expiresIn: "30m" }
        );

        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        console.error("[REFRESH TOKEN] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Gửi yêu cầu cập nhật thông tin (Gửi OTP về email)
export const requestUpdate = async (req, res) => {
    try {
        const { authorization } = req.headers;
        const { userId, email, ...updateData } = req.body;

        if (!authorization) return res.status(401).json({ message: "Không có access token" });

        // Xác thực Access Token
        const token = authorization.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
        } catch (error) {
            return res.status(401).json({ message: "Access token không hợp lệ hoặc đã hết hạn" });
        }

        // Kiểm tra userId hợp lệ
        if (decoded.userId !== userId) return res.status(403).json({ message: "Không có quyền cập nhật thông tin người khác" });

        // Kiểm tra email có tồn tại không
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

        // Sinh mã OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 chữ số

        // Gửi email OTP
        const emailSent = await sendOtpEmail(user.email, otp);
        if (!emailSent) return res.status(500).json({ message: "Gửi OTP thất bại" });

        // Lưu dữ liệu cập nhật vào Redis (60 giây)
        await redisClient.setEx(`update-user:${user.email}`, 60, JSON.stringify({ otp, updateData }));

        res.status(200).json({ message: "OTP đã được gửi. Vui lòng kiểm tra email để xác nhận!" });
    } catch (error) {
        console.error("[REQUEST UPDATE] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// Xác thực OTP & cập nhật thông tin người dùng
export const updateUser = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Lấy dữ liệu từ Redis
        const cachedData = await redisClient.get(`update-user:${email}`);
        if (!cachedData) return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn" });

        const { otp: storedOtp, updateData } = JSON.parse(cachedData);

        // Kiểm tra OTP
        if (storedOtp !== otp) return res.status(400).json({ message: "OTP không chính xác" });

        // Cập nhật thông tin vào database
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const user = await User.findOneAndUpdate({ email }, updateData, { new: true });
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

        // Xóa OTP khỏi Redis
        await redisClient.del(`update-user:${email}`);

        res.status(200).json({ message: "Cập nhật thông tin thành công!", user });
    } catch (error) {
        console.error("[UPDATE USER] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

