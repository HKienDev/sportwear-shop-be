// Utility functions for timezone handling
const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Format date to Vietnam timezone string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string in Vietnam timezone
 */
export const formatVietnamDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * Convert date to UTC
 * @param {Date} date - Date to convert
 * @returns {Date} Date in UTC
 */
export const toUTC = (date) => {
    return new Date(date.toISOString());
};

/**
 * Convert date from UTC to Vietnam time
 * @param {Date} date - Date in UTC
 * @returns {Date} Date in Vietnam timezone
 */
export const fromUTCToVietnam = (date) => {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
};

/**
 * Get current time in UTC
 * @returns {Date} Current time in UTC
 */
export const getCurrentUTC = () => {
    return new Date();
};

/**
 * Parse ISO string to UTC
 * @param {string} isoString - ISO date string
 * @returns {Date} Date in UTC
 */
export const parseToUTC = (isoString) => {
    return new Date(isoString);
}; 