import mongoose from "mongoose";
import { logInfo, logError } from "../utils/logger.js";
import env from "./env.js";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logInfo(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logError("MongoDB connection error:", error);
        process.exit(1);
    }
};

// Handle MongoDB connection events
mongoose.connection.on("error", (error) => {
    logError("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
    logError("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
    logInfo("MongoDB reconnected");
});

export default connectDB;