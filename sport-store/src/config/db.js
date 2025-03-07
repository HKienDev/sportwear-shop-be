import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Log để kiểm tra biến môi trường
console.log("MONGO_URI:", process.env.MONGO_URI);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;