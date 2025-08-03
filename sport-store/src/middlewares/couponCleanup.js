import { Coupon } from "../models/Coupon.js";
import { COUPON_STATUS } from "../models/Coupon.js";
import { logInfo, logError } from "../utils/logger.js";

// Middleware để tự động xóa coupons hết hạn
export const autoCleanupExpiredCoupons = async (req, res, next) => {
    try {
        // Chỉ chạy cleanup mỗi 10 requests để tránh ảnh hưởng performance
        const shouldRunCleanup = Math.random() < 0.1; // 10% chance
        
        if (shouldRunCleanup) {
            logInfo("Running automatic cleanup of expired coupons");
            
            // Xóa các coupon có status "Hết hạn"
            const result = await Coupon.deleteMany({ 
                status: COUPON_STATUS.EXPIRED 
            });
            
            if (result.deletedCount > 0) {
                logInfo(`Auto-cleanup: Deleted ${result.deletedCount} expired coupons`);
            }
        }
        
        next();
    } catch (error) {
        logError("Error in auto-cleanup expired coupons:", error);
        // Không block request nếu có lỗi cleanup
        next();
    }
};

// Function để chạy cleanup thủ công
export const manualCleanupExpiredCoupons = async () => {
    try {
        logInfo("Starting manual cleanup of expired coupons");
        
        const result = await Coupon.deleteMany({ 
            status: COUPON_STATUS.EXPIRED 
        });
        
        logInfo(`Manual cleanup: Deleted ${result.deletedCount} expired coupons`);
        return result.deletedCount;
    } catch (error) {
        logError("Error in manual cleanup expired coupons:", error);
        throw error;
    }
}; 