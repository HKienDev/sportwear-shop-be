import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import env from "./env.js"; 
import User from "../models/user.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Profile:", profile);

        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Không thể lấy email từ Google"), null);
        }

        // Kiểm tra user có tồn tại dựa trên email
        let user = await User.findOne({ email });

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id; // Cập nhật googleId nếu chưa có
            await user.save();
            console.log("Cập nhật googleId cho user cũ:", user);
          }
        } else {
          // Nếu user chưa tồn tại, tạo mới
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: email,
            avatar: profile.photos?.[0]?.value || "",
            isVerified: true,
          });
          await user.save();
          console.log("User mới đã được tạo:", user);
        }

        return done(null, user);
      } catch (error) {
        console.error("Lỗi trong quá trình xác thực Google:", error);
        return done(error, null);
      }
    }
  )
);

// Không cần serializeUser & deserializeUser nếu không dùng session
export default passport;