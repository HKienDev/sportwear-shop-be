// Cấu hình dotenv với ES Module
import dotenv from "dotenv";

dotenv.config(); // Load biến môi trường từ file .env

const env = {
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET, // Thêm ACCESS_TOKEN_SECRET
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET, // Thêm REFRESH_TOKEN_SECRET
};

export default env;