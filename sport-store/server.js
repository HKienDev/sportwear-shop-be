import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from 'http';
import { logInfo, logError } from "./src/utils/logger.js";
import env from "./src/config/env.js";
import { ERROR_MESSAGES } from "./src/utils/constants.js";
import { requestId } from "./src/middlewares/requestId.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { notFoundHandler } from "./src/middlewares/notFoundHandler.js";
import { initSocket } from "./src/config/socket.js";
import { connectRedis } from "./src/config/redis.js";
import corsOptions from './src/config/cors.js';

// Import routes
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import couponRoutes from "./src/routes/couponRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Khởi tạo Socket.IO
initSocket(httpServer);

// Rate limiter chung cho toàn bộ API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "unsafe-none" }
})); // Bảo mật headers
app.use(compression()); // Nén response
app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morgan("dev")); // Logging
app.use(requestId); // Thêm request ID
app.use(apiLimiter); // Áp dụng rate limit chung

// Static files
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/coupons", couponRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB and Redis
const startServer = async () => {
    try {
        // Kết nối MongoDB
        await mongoose.connect(env.MONGODB_URI);
        logInfo("Connected to MongoDB");

        // Kết nối Redis
        await connectRedis();
        logInfo("Connected to Redis");

        // Khởi động server
        httpServer.listen(env.PORT, () => {
            logInfo(`Server is running on port ${env.PORT}`);
        });
    } catch (error) {
        logError("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
    logError("Unhandled Promise Rejection:", error);
    process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logError("Uncaught Exception:", error);
    process.exit(1);
});