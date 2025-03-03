const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const User = require("../models/user");
const env = require("../config/env");
const { sendOtpEmail } = require("../utils/sendEmail");
const bcrypt = require("bcryptjs");

/**
 * Helper: Tạo mã OTP ngẫu nhiên 6 chữ số
 */
const generateOTP = (length = 6) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

/**
 * Helper: Băm mật khẩu
 */
const hashPassword = (password) => bcrypt.hash(password, 10);

/**
 * Helper: Đọc/ghi dữ liệu từ Redis
 */
const cacheSet = (key, value, expiry) => redisClient.setEx(key, expiry, JSON.stringify(value));
const cacheGet = async (key) => {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
};

/**
 * Helper: Gửi OTP qua email và lưu vào Redis
 */
const sendAndCacheOTP = async (email, otpKey, data, expiry = 60) => {
    const otp = generateOTP();
    if (!(await sendOtpEmail(email, otp))) return false;

    await cacheSet(otpKey, { ...data, otp }, expiry);
    return true;
};

// 📌 Đăng ký tài khoản
const register = async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (await User.exists({ email }).select("_id")) {
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

// 📌 Xác thực OTP để kích hoạt tài khoản
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const otpData = await cacheGet(`otp:${email}`);
        if (!otpData) return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn" });

        const { otp: storedOtp, username, hashedPassword } = otpData;
        if (storedOtp !== otp) return res.status(400).json({ message: "OTP không hợp lệ!" });

        if (await User.exists({ email }).select("_id")) return res.status(400).json({ message: "Email đã tồn tại!" });

        const user = new User({ email, username, password: hashedPassword, isVerified: true });
        await user.save();
        await redisClient.del(`otp:${email}`);

        res.status(200).json({ message: "Tài khoản đã được xác thực và tạo thành công!" });
    } catch (error) {
        console.error("[VERIFY OTP] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 📌 Đăng nhập
const login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = await User.findOne({ $or: [{ email }, { username }] });

        if (!user || !user.isVerified) {
            return res.status(400).json({ message: "Tài khoản chưa xác thực hoặc không tồn tại" });
        }

        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: "Email/Tên đăng nhập hoặc mật khẩu không đúng" });
        }

        const accessToken = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "1d" }
        );
        const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

        // 🔥 Cập nhật refreshToken trong DB
        user.refreshToken = refreshToken;
        await user.save();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            path: "/",
        });

        res.status(200).json({
            message: "Đăng nhập thành công",
            accessToken,
            user: {
                _id: user._id,
                username: user.username,
                role: user.role,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        console.error("[LOGIN] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 📌 Đăng xuất
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(401).json({ message: "Không tìm thấy refreshToken" });

        const user = await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });
        if (!user) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });

        res.clearCookie("refreshToken", { httpOnly: true, sameSite: "Strict" });
        res.status(200).json({ message: "Đăng xuất thành công!" });
    } catch (error) {
        console.error("[LOGOUT] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 📌 Quên mật khẩu
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!(await User.exists({ email }))) return res.status(404).json({ message: "Email không tồn tại" });

        if (!(await sendAndCacheOTP(email, `forgot-password:${email}`, {}, 60))) {
            return res.status(500).json({ message: "Gửi OTP thất bại" });
        }

        res.json({success: true, message: "OTP đã được gửi đến email của bạn!" });
    } catch (error) {
        console.error("[FORGOT PASSWORD] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 📌 Xác thực OTP đặt lại mật khẩu
const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const otpData = await redisClient.get(`forgot-password:${email}`);
        if (!otpData) return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn" });

        const { otp: storedOtp } = JSON.parse(otpData);
        if (storedOtp !== otp) return res.status(400).json({ message: "OTP không hợp lệ!" });

        await redisClient.del(`forgot-password:${email}`);
        res.status(200).json({ message: "OTP hợp lệ", resetToken: jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "5m" }) });
    } catch (error) {
        console.error("[VERIFY FORGOT PASSWORD OTP] Lỗi:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 🛠 Hàm kiểm tra username hoặc email đã tồn tại
const checkExistingUser = async (field, value, userId) => {
    const existingUser = await User.findOne({ [field]: value }).lean();
    return existingUser && existingUser._id.toString() !== userId;
};

// 🚀 Đặt lại mật khẩu
const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        const { email } = jwt.verify(resetToken, process.env.JWT_SECRET);
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "Email không tồn tại" });

        user.password = await hashPassword(newPassword);
        user.refreshToken = null; // Xóa refreshToken để buộc user đăng nhập lại
        await user.save();

        res.status(200).json({ message: "Mật khẩu đã được đặt lại thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 🚀 Yêu cầu cập nhật thông tin (OTP)
const requestUpdate = async (req, res) => {
    try {
        const { userId, ...updates } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng." });

        // Kiểm tra username hoặc email đã tồn tại
        for (const field of ["username", "email"]) {
            if (updates[field] && await checkExistingUser(field, updates[field], userId)) {
                return res.status(400).json({ message: `${field === "username" ? "Tên người dùng" : "Email"} đã được sử dụng.` });
            }
        }

        // Xử lý mật khẩu nếu có
        if (updates.password) updates.password = await hashPassword(updates.password);

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "Không phát hiện thay đổi." });
        }

        // Cập nhật thông tin tạm thời & gửi OTP
        user.pendingUpdate = updates;
        user.otp = generateOTP();
        user.otpExpires = Date.now() + 60 * 1000;

        await user.save();
        await sendOtpEmail(user.email, user.otp);

        res.json({ message: "OTP đã được gửi đến email của bạn!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
    }
};

// 🚀 Xác thực OTP & cập nhật thông tin
const updateUser = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại." });

        if (!user.otp || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn." });
        }

        // Kiểm tra username & email trùng lặp
        for (const field of ["username", "email"]) {
            if (user.pendingUpdate[field] && await checkExistingUser(field, user.pendingUpdate[field], userId)) {
                return res.status(409).json({ message: `${field === "username" ? "Tên người dùng" : "Email"} đã được sử dụng.` });
            }
        }

        // Cập nhật user
        Object.assign(user, user.pendingUpdate);
        user.pendingUpdate = {};
        user.otp = user.otpExpires = null;

        // Nếu email thay đổi, yêu cầu xác thực lại
        if (user.email !== req.body.email) {
            user.isVerified = false;
            user.otp = generateOTP();
            user.otpExpires = Date.now() + 60 * 1000;
            await sendOtpEmail(user.email, user.otp);
        }

        await user.save();
        res.status(200).json({ message: "Cập nhật thành công!", user });
    } catch (error) {
        res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
    }
};

// 🚀 Đăng nhập bằng Google
const googleAuth = async (req, res) => {
    try {
        if (!req.user) return res.status(400).json({ message: "Không nhận được dữ liệu từ Google!" });

        const { id, displayName, photos, email } = req.user;
        if (!email) return res.status(400).json({ message: "Không thể lấy email từ Google!" });

        let user = await User.findOne({ email });

        if (user) {
            if (!user.googleId) user.googleId = id;
        } else {
            user = new User({ googleId: id, name: displayName, email, avatar: photos?.[0]?.value, isVerified: true });
        }

        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
        res.status(500).json({ message: "Lỗi xác thực Google!", error: error.message });
    }
};

// 🚀 Xác thực token
const verifyToken = (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false, message: "Token không được cung cấp" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ valid: true, decoded });
    } catch (error) {
        const errorMessage = error.name === "TokenExpiredError" ? "Token hết hạn" : "Token không hợp lệ";
        res.status(401).json({ valid: false, message: errorMessage });
    }
};

// 🚀 Refresh Token (tránh TH Access Token hết hạn thì user bị logout đột xuất)
const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        console.log("[DEBUG] Refresh Token từ Cookie:", refreshToken); // debug
        if (!refreshToken) return res.status(403).json({ message: "Không có Refresh Token" });

        const user = await User.findOne({ refreshToken }).lean();
        console.log("[DEBUG] User từ DB:", user); // debug
        if (!user) return res.status(403).json({ message: "Refresh Token không hợp lệ" });

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const newAccessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });

        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(401).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn" });
    }
};

// Xuất các hàm
module.exports = { 
    register, 
    verifyOTP, 
    login,
    logout, 
    forgotPassword,
    verifyForgotPasswordOTP, 
    resetPassword, 
    requestUpdate, 
    updateUser, 
    googleAuth,
    verifyToken,
    refreshToken
};