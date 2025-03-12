import jwt from "jsonwebtoken";
import User from "../models/user.js";

// Hàm chung để lấy và xác thực Access Token
const verifyAccessToken = async (req) => {
  try {
    const authHeader = req.header("Authorization");
    console.log("🔹 [Middleware] Authorization Header:", authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Thiếu hoặc sai định dạng Access Token");
    }

    const token = authHeader.split(" ")[1];
    console.log("🔹 [Middleware] Access Token nhận được:", token);

    // Xác thực Token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("✅ [Middleware] Token decoded thành công:", decoded);

    // Tìm user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) throw new Error("Người dùng không tồn tại");
    if (!user.isActive) throw new Error("Tài khoản bị khóa");

    console.log("✅ [Middleware] User verified:", user);
    return user;
  } catch (error) {
    console.error("❌ [Middleware] Lỗi xác thực Token:", error.message);
    throw new Error(error.name === "TokenExpiredError" ? "AccessToken hết hạn" : "Invalid Token");
  }
};

// Middleware xác thực user đăng nhập
export const verifyUser = async (req, res, next) => {
    try {
      console.log("🔹 Authorization Header:", req.header("Authorization"));
      const user = await verifyAccessToken(req);
  
      if (!user) {
        return res.status(401).json({ message: "Không có quyền truy cập" });
      }
  
      req.user = user;
      next();
    } catch (error) {
      console.error("❌ Lỗi verifyUser:", error.message);
  
      // Nếu lỗi là TokenExpiredError, trả về mã 401 để FE làm mới token
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "AccessToken hết hạn" });
      }
  
      res.status(403).json({ message: error.message });
    }
  };

// Middleware xác thực admin
export const verifyAdmin = async (req, res, next) => {
  try {
    console.log("🔹 [Admin Middleware] Authorization Header:", req.header("Authorization"));

    const user = await verifyAccessToken(req);
    console.log("✅ [Admin Middleware] User verified:", user);

    if (user.role !== "admin") {
      throw new Error("Bạn không có quyền admin");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ [Admin Middleware] Lỗi:", error.message);
    res.status(403).json({ message: error.message });
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