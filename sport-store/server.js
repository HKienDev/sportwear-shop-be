// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); 
const env = require("./src/config/env"); 
const connectDB = require("./src/config/db");
const userRoutes = require("./src/routes/userRoutes");
const authRoutes = require("./src/routes/authRoutes");
const passport = require("./src/config/passport");
const productRoutes = require("./src/routes/productRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const orderRoutes = require("./src/routes/orderRoutes");

const app = express();
app.use("/api/orders/stripe-webhook", express.raw({ type: "application/json" }));
// Middleware
app.use(express.json()); // Hỗ trợ đọc JSON
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000", // FE chạy trên cổng 3000
  credentials: true, // Cho phép gửi cookie/token trong request
  methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS", // Các phương thức HTTP cho phép
  allowedHeaders: "Content-Type,Authorization", // Các headers được phép gửi
}));


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


// Xuất app để test
module.exports = app;

// Lắng nghe server
const PORT = env.PORT || 4000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}