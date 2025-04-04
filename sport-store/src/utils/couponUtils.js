/**
 * Generate a unique coupon code
 * @returns {string} Generated coupon code
 */
export const generateCouponCode = () => {
    const prefix = "VJUSPORTVOUCHER";
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 3; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `${prefix}${result}`;
};

/**
 * Calculate discount amount based on coupon type and value
 * @param {string} type - Coupon type (% or VNĐ)
 * @param {number} value - Coupon value
 * @param {number} totalAmount - Total amount to apply discount
 * @returns {number} Discount amount
 */
export const calculateDiscount = (type, value, totalAmount) => {
    if (type === "%") {
        return (totalAmount * value) / 100;
    }
    return value;
};

/**
 * Check if coupon is valid for use
 * @param {Object} coupon - Coupon object
 * @param {string} userId - User ID
 * @param {number} totalAmount - Total amount
 * @returns {Object} Validation result
 */
export const validateCoupon = (coupon, userId, totalAmount) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    // Check if coupon is active
    if (coupon.status !== "Hoạt động") {
        return {
            isValid: false,
            message: "Mã giảm giá không còn khả dụng"
        };
    }

    // Check if coupon is expired
    if (now < startDate || now > endDate) {
        return {
            isValid: false,
            message: "Mã giảm giá không hợp lệ hoặc đã hết hạn"
        };
    }

    // Check usage limit
    if (coupon.usageCount >= coupon.usageLimit) {
        return {
            isValid: false,
            message: "Mã giảm giá đã hết lượt sử dụng"
        };
    }

    // Check user limit
    const userUsageCount = coupon.userUsageCount.get(userId) || 0;
    if (userUsageCount >= coupon.userLimit) {
        return {
            isValid: false,
            message: "Bạn đã sử dụng hết số lần cho phép"
        };
    }

    // Check minimum purchase amount
    if (totalAmount < coupon.minimumPurchaseAmount) {
        return {
            isValid: false,
            message: `Đơn hàng phải có giá trị tối thiểu ${coupon.minimumPurchaseAmount.toLocaleString('vi-VN')} VNĐ`
        };
    }

    return {
        isValid: true,
        message: "Mã giảm giá hợp lệ"
    };
}; 