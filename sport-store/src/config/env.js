// Cấu hình dotenv với ES Module
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, "../../.env") });

// Validate required environment variables
const requiredEnvVars = [
    "PORT",
    "NODE_ENV",
    "MONGODB_URI",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "JWT_REFRESH_EXPIRES_IN",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "MAX_FILE_SIZE",
    "ALLOWED_FILE_TYPES",
    "RATE_LIMIT_WINDOW_MS",
    "RATE_LIMIT_MAX_REQUESTS",
    "CORS_ORIGIN",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET"
    // GOOGLE_REDIRECT_URI - Made optional for deployment
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
}

// Environment configuration
const env = {
    // Server
    PORT: process.env.PORT || 4000,
    NODE_ENV: process.env.NODE_ENV || "development",
    
    // MongoDB
    MONGODB_URI: process.env.MONGODB_URI,
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // Email (Resend)
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    
    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes default
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    
    // Redis (Optional)
    REDIS_URL: process.env.REDIS_URL,
    
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === "production" ? `${process.env.CORS_ORIGIN}/api/auth/google/callback` : "http://localhost:4000/api/auth/google/callback"),
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === "production" ? `${process.env.CORS_ORIGIN}/api/auth/google/callback` : "http://localhost:4000/api/auth/google/callback"),
    
    // Paths
    UPLOAD_DIR: join(__dirname, "../../uploads"),
    
    // Validation
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test"
};

// Validate JWT configuration
if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
}

export default env;