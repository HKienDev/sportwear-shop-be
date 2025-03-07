const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;
let userId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) { 
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  // Xóa tất cả người dùng trước khi tạo người dùng mẫu mới
  await User.deleteMany({});

  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await User.create({
    email: "test@example.com",
    password: hashedPassword,
    fullname: "Test User",
    username: "testuser",
    phone: "123456789",
    avatar: "avatar.png",
    role: "user",
    isActive: true,
  });
  userId = user._id; // Lưu lại ID của người dùng mới tạo để sử dụng trong các test sau
});

afterAll(async () => {
    if (mongoServer) {
      // Đảm bảo rằng Mongoose được ngắt kết nối đúng cách
      await mongoose.disconnect();
      // Dừng MongoDB trong bộ nhớ
      await mongoServer.stop();
    }
  });
  
describe("User API Endpoints", () => {

  test("GET /users - Fetch all users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty("email", "test@example.com");
  });

  test("GET /users/:id - Fetch single user", async () => {
    const res = await request(app).get(`/api/users/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("username", "testuser");
  });

  test("POST /users - Create a new user", async () => {
    const newUser = {
      email: "newuser@example.com",
      password: "password456",
      fullname: "New User",
      username: "newuser",
      phone: "987654321",
      avatar: "newavatar.png",
      role: "user",
    };
    const res = await request(app).post("/api/users").send(newUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("email", "newuser@example.com");
  });

  test("PUT /users/:id - Update user info", async () => {
    const updateData = { fullname: "Updated Name", phone: "111222333" };
    const res = await request(app).put(`/api/users/${userId}`).send(updateData);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("fullname", "Updated Name");
  });

  test("DELETE /users/:id - Delete user", async () => {
    const res = await request(app).delete(`/api/users/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "User deleted successfully");
  });
});
