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
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// Kết nối Database
connectDB();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use(passport.initialize());
app.use("/user", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);

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
  socket.on("sendMessage", ({ text, recipientId }) => {
    const message = {
      senderId: socket.userId,
      senderType: socket.userType,
      recipientId, // Người nhận
      text,
    };

    console.log("Message received:", message);

    // Tìm socket của người nhận và gửi tin nhắn trực tiếp
    const recipientSocket = io.sockets.sockets.get(recipientId);
    if (recipientSocket) {
      recipientSocket.emit("receiveMessage", message);
    }

    // Gửi lại tin nhắn cho người gửi để cập nhật giao diện
    socket.emit("receiveMessage", message);
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