import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    console.log("🔹 [Middleware] Authorization Header:", authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
        console.error("❌ [Middleware] Thiếu hoặc sai định dạng Access Token");
        return res.status(401).json({ message: "Thiếu hoặc sai định dạng Access Token" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔹 [Middleware] Access Token:", token);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => { // ✅ Sửa JWT_SECRET thành ACCESS_TOKEN_SECRET
        if (err) {
            console.error("❌ [Middleware] Token không hợp lệ:", err.message);
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }

        console.log("✅ [Middleware] Token decoded thành công:", decoded);
        req.user = decoded;
        next();
    });
};