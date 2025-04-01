import { logError } from "../utils/logger.js";

export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Admin access required"
            });
        }

        next();
    } catch (error) {
        logError(`[${req.id}] Error in isAdmin middleware:`, error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}; 