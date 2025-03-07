import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http"; // Import chuẩn
import { Server as socketIo } from "socket.io"; // Import chuẩn
import env from "./src/config/env.js"; // Nhớ thêm ".js"
import connectDB from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import passport from "./src/config/passport.js";
import productRoutes from "./src/routes/productRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";

const app = express();
const server = http.createServer(app); // Tạo server HTTP
const io = new socketIo(server, { // Sử dụng `new` khi khởi tạo `socket.io`
  cors: {
    origin: "http://localhost:3000", // FE chạy trên cổng 3000
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
// 🔹 Socket.IO - Quản lý Chat Live
// ==========================
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Nhận tin nhắn từ client
  socket.on("sendMessage", (data) => {
    console.log("📩 Message received:", data);
    io.emit("receiveMessage", data); // Gửi tin nhắn tới tất cả client
  });

  // Khi user ngắt kết nối
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Xuất app để test
export { app, server }; // Thay đổi từ `module.exports` sang `export`

// Lắng nghe server
const PORT = env.PORT || 4000;
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}