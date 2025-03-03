const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const env = require("../config/env"); 
const authController = require("../controllers/authController");
const authenticateToken = require("../middlewares/authenticateToken");
const { verifyToken } = require("../controllers/authController");
const { logout } = require("../controllers/authController");

const router = express.Router();

// Kiểm tra route hoạt động
router.get("/", (req, res) => {
  res.json({ message: "Route xác thực đang hoạt động!" });
});

// Đăng ký tài khoản mới (Gửi OTP qua email)
router.post("/register", authController.register);

// Xác thực OTP để kích hoạt tài khoản
router.post("/verify-account", authController.verifyOTP);

// Đăng nhập tài khoản
router.post("/login", authController.login);

// Đănh xuất tài khoản
router.post("/logout", logout);

// Quên mật khẩu (Gửi OTP qua email)
router.post("/forgot-password", authController.forgotPassword);

// Xác thực OTP quên mật khẩu & nhận token để đổi mật khẩu
router.post("/verify-forgot-password-otp", authController.verifyForgotPasswordOTP);

// Đặt lại mật khẩu bằng resetToken
router.post("/reset-password", authController.resetPassword);

// Gửi OTP để xác thực trước khi thay đổi thông tin bảo mật
router.post("/request-update", authController.requestUpdate);

// Xác thực OTP và cập nhật thông tin bảo mật (email, username, password)
router.put("/update-user", authController.updateUser);

// Route bắt đầu đăng nhập Google
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Route xử lý callback sau khi Google xác thực thành công
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false }),
    (req, res) => {
        if (!req.user) {
            return res.status(400).json({ message: "Xác thực Google thất bại" });
        }

        // Tạo JWT token
        const token = jwt.sign(
            { userId: req.user._id, email: req.user.email },
            env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log("FRONTEND_URL:", env.FRONTEND_URL); // Debug
        console.log("Redirecting to:", `${env.FRONTEND_URL}/user/auth/google-success?token=${token}`); // Debug

        // Chuyển hướng về FE với token
        res.redirect(`${process.env.FRONTEND_URL}/user/auth/google-success?token=${token}`);
    }
);

router.get("/profile", authenticateToken, async (req, res) => {
    try {
      // Lấy thông tin user từ req.user (được giải mã từ token)
      const user = {
        id: req.user.userId,
        email: req.user.email,
        name: req.user.name,
      };
      res.json({ message: "User Profile", user });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

router.post("/verify-token", verifyToken);  

router.post("/refresh", authController.refreshToken);
  


module.exports = router;