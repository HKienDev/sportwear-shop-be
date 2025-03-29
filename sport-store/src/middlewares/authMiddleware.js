import jwt from "jsonwebtoken";
import User from "../models/user.js";
import env from "../config/env.js";

// Hàm chung để lấy và xác thực Access Token
export const verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    console.log("🔹 [Middleware] Authorization Header:", authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Thiếu hoặc sai định dạng Access Token");
    }

    const token = authHeader.split(" ")[1];
    console.log("🔹 [Middleware] Access Token nhận được:", token);

    // Xác thực Token
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
    console.log("✅ [Middleware] Token decoded thành công:", decoded);

    // Tìm user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) throw new Error("Người dùng không tồn tại");
    if (!user.isActive) throw new Error("Tài khoản bị khóa");

    console.log("✅ [Middleware] User verified:", user);
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ [Middleware] Lỗi xác thực Token:", error.message);
    res.status(401).json({ 
      success: false,
      message: error.name === "TokenExpiredError" ? "AccessToken hết hạn" : "Invalid Token" 
    });
  }
};

// Middleware xác thực user đăng nhập
export const verifyUser = async (req, res, next) => {
  try {
    const user = await verifyAccessToken(req);
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Lỗi verifyUser:", error.message);
    return res.status(401).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Middleware xác thực admin
export const verifyAdmin = async (req, res, next) => {
  try {
    const user = await verifyAccessToken(req);
    
    if (user.role !== "admin") {
      return res.status(403).json({ 
        success: false,
        message: "Bạn không có quyền truy cập trang này" 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Lỗi verifyAdmin:", error.message);
    return res.status(401).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Middleware kiểm tra Refresh Token
export const verifyRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken; // Kiểm tra cookies an toàn hơn
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