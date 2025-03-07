import jwt from "jsonwebtoken";
import User from "../models/user.js"; // ✅ Thêm .js vào đường dẫn import

// 📌 Hàm chung để lấy và xác thực Access Token
const verifyAccessToken = async (req) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {  // ✅ Dùng optional chaining để tránh lỗi
            throw new Error("Thiếu Access Token");
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) throw new Error("Người dùng không tồn tại");
        if (!user.isActive) throw new Error("Tài khoản của bạn đã bị khóa");

        return user;
    } catch (error) {
        throw new Error(error.message || "Token không hợp lệ hoặc đã hết hạn");
    }
};

// ✅ Middleware xác thực user đăng nhập
export const verifyUser = async (req, res, next) => {
    try {
        req.user = await verifyAccessToken(req);
        next();
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

// ✅ Middleware xác thực admin
export const verifyAdmin = async (req, res, next) => {
    try {
        const user = await verifyAccessToken(req);
        if (user.role !== "admin") throw new Error("Bạn không có quyền admin");
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

// ✅ Middleware kiểm tra Refresh Token
export const verifyRefreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken; // ✅ Kiểm tra cookies an toàn hơn
        if (!refreshToken) {
            return res.status(403).json({ message: "Không có Refresh Token, vui lòng đăng nhập lại" });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ message: "Refresh Token không hợp lệ hoặc đã bị thu hồi" });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn" });
    }
};