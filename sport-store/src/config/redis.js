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
    } catch (error) {
        logError("Redis connection error:", error);
        process.exit(1);
    }
};

export { connectRedis, redisClient };