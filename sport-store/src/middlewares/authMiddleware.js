const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Middleware xác thực user đăng nhập
exports.verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        console.log("🔍 Authorization Header:", authHeader);

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Thiếu token xác thực" });
        }

        const token = authHeader.split(" ")[1];
        console.log("🔍 Extracted Token:", token);

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("✅ Decoded Token:", decoded);

        // Lấy user từ DB
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            console.log("❌ User không tồn tại trong DB");
            return res.status(401).json({ message: "Người dùng không tồn tại" });
        }

        req.user = user;
        console.log("✅ User from DB:", user);
        next();
    } catch (error) {
        console.error("🔥 Lỗi xác thực:", error.message);
        res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};

// Middleware xác thực admin
exports.verifyAdmin = async (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Không có token, quyền truy cập bị từ chối" });

    console.log("Token nhận được:", token);

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.ACCESS_TOKEN_SECRET);
        console.log("Thông tin user từ token:", decoded);

        const user = await User.findById(decoded.userId);
        if (!user || user.role !== "admin") {
            console.log("Quyền không hợp lệ hoặc người dùng không phải admin");
            return res.status(403).json({ message: "Bạn không có quyền admin" });
        }

        req.user = user;
        console.log("Thông tin admin:", user);
        next();
    } catch (error) {
        console.error("Lỗi khi giải mã token:", error);
        res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};

// Middleware bảo vệ route
exports.protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            console.log("Decoded Token:", decoded);

            const userId = decoded.id || decoded.userId;
            if (!userId) return res.status(401).json({ message: "Token không hợp lệ" });

            req.user = await User.findById(userId).select("-password");
            if (!req.user) return res.status(401).json({ message: "User không tồn tại" });

            console.log("User từ DB:", req.user);
            next();
        } catch (error) {
            console.error("Lỗi khi xác thực token:", error);
            res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }
    } else {
        res.status(401).json({ message: "Không có token, quyền truy cập bị từ chối" });
    }
};

// Middleware kiểm tra quyền admin
exports.admin = (req, res, next) => {
    console.log("🛑 Kiểm tra quyền admin, req.user:", req.user);
    if (req.user && req.user.role === "admin") {
        console.log("Người dùng có quyền admin!");
        next();
    } else {
        console.log("Người dùng không có quyền admin!");
        res.status(403).json({ message: "Yêu cầu quyền truy cập quản trị" });
    }
};

// Middleware kiểm tra Refresh Token
exports.verifyRefreshToken = (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(403).json({ message: "Không có Refresh Token, vui lòng đăng nhập lại" });
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn" });
        }

        req.user = decoded; // Lưu thông tin user từ Refresh Token
        next();
    });
};
