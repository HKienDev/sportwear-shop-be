import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as socketIo } from "socket.io";
import env from "./src/config/env.js";
import connectDB from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import passport from "./src/config/passport.js";
import productRoutes from "./src/routes/productRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import uploadRoutes from './src/routes/uploadRoutes.js';

const app = express();
const server = http.createServer(app);
const io = new socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.use("/api/orders/stripe-webhook", express.raw({ type: "application/json" }));
// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// Middleware để xử lý lỗi multer
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    console.error('Multer error:', err);
    return res.status(400).json({
      error: 'Lỗi khi upload file',
      details: err.message
    });
  }
  next(err);
});

// Kết nối Database
connectDB();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use(passport.initialize());
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use('/api/upload', uploadRoutes);

// ==========================
// ⚡ Socket.IO - Quản lý Chat Live
// ==========================
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Xác định loại người dùng (Admin hoặc Guest)
  socket.on("identifyUser", ({ userId }) => {
    socket.userId = userId || `guest-${socket.id}`; // Nếu không có userId thì coi là guest
    socket.userType = userId ? "admin" : "guest"; // Admin nếu có userId, guest nếu không có

    console.log(`User identified - ID: ${socket.userId}, Type: ${socket.userType}`);
  });

  // Sửa logic sendMessage trong BE
  socket.on("sendMessage", ({ text }) => {
    const message = {
      senderId: socket.userId,
      senderType: socket.userType,
      text,
    };

    console.log("Message received from:", message.senderId, "| Content:", message.text);

    // Gửi tin nhắn đến tất cả user khác (ngoại trừ sender)
    socket.broadcast.emit("receiveMessage", message);

  });

  // Khi user ngắt kết nối
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Xuất app để test
export { app, server };

// Lắng nghe server
const PORT = env.PORT || 4000;
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}