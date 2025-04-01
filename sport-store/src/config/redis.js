import Redis from "ioredis";
import { logInfo, logError } from "../utils/logger.js";
import env from "./env.js";

let redisClient = null;

const connectRedis = async () => {
    if (!env.REDIS_URL) {
        logInfo("Redis URL not provided, skipping Redis connection");
        return;
    }

    try {
        redisClient = new Redis(env.REDIS_URL, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redisClient.on("connect", () => {
            logInfo("Redis Connected");
        });

        redisClient.on("error", (error) => {
            logError("Redis connection error:", error);
        });

        redisClient.on("reconnecting", () => {
            logInfo("Redis reconnecting...");
        });

        redisClient.on("end", () => {
            logInfo("Redis connection closed");
        });

        // Test kết nối
        await redisClient.ping();
        logInfo("Redis connection test successful");
    } catch (error) {
        logError("Redis connection error:", error);
        process.exit(1);
    }
};

// Export một getter function để đảm bảo luôn lấy được instance mới nhất
export const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis connection not available');
    }
    return redisClient;
};

export { connectRedis };