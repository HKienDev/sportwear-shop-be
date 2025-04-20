import { DateUtils } from "./timeUtils.js";
import { Coupon } from "../models/coupon.js";

/**
 * Generate a unique coupon code
 * @returns {Promise<string>} Generated coupon code
 */
export const generateCouponCode = async () => {
    const prefix = "VJUSPORTVOUCHER-";
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let isUnique = false;
    let code;

    while (!isUnique) {
        let result = '';
        for (let i = 0; i < 3; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        code = `${prefix}${result}`;

        // Kiểm tra xem code đã tồn tại chưa
        const existingCoupon = await Coupon.findOne({ code });
        if (!existingCoupon) {
            isUnique = true;
        }
    }

    return code;
};

/**
 * Calculate discount amount based on coupon type and value
 * @param {Object} coupon - Coupon object
 * @param {number} totalAmount - Total amount to apply discount
 * @returns {Object} Discount result
 */
export const calculateDiscount = (coupon, totalAmount) => {
    let discountAmount = 0;
    let finalAmount = totalAmount;

    if (coupon.type === "percentage") {
        discountAmount = (totalAmount * coupon.value) / 100;
        finalAmount = totalAmount - discountAmount;
    } else if (coupon.type === "fixed") {
        discountAmount = coupon.value;
        finalAmount = totalAmount - discountAmount;
    }

    return {
        discountAmount,
        finalAmount
    };
};

/**
 * Check if coupon is valid for use
 * @param {Object} coupon - Coupon object
 * @returns {Object} Validation result
 */
export const validateCoupon = (coupon) => {
    // Check if coupon type is valid
    if (!coupon.type || !["percentage", "fixed"].includes(coupon.type)) {
        return {
            isValid: false,
            error: "Loại coupon không hợp lệ"
        };
    }

    // Check if coupon value is valid
    if (!coupon.value || coupon.value <= 0) {
        return {
            isValid: false,
            error: "Giá trị coupon không hợp lệ"
        };
    }

    // Check if percentage coupon value is between 0 and 100
    if (coupon.type === "percentage" && (coupon.value < 0 || coupon.value > 100)) {
        return {
            isValid: false,
            error: "Giá trị coupon phần trăm phải nằm trong khoảng 0-100"
        };
    }

    return {
        isValid: true
    };
}; 