import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import duration from 'dayjs/plugin/duration.js';
import isLeapYear from 'dayjs/plugin/isLeapYear.js';

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(duration);
dayjs.extend(isLeapYear);

// Constants
export const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";
export const VIETNAM_DATE_FORMAT = "DD/MM/YYYY HH:mm";
export const ISO_DATE_FORMAT = "YYYY-MM-DD";
export const SIMPLE_DATE_FORMAT = "YYYY-MM-DD";

/**
 * Utility class for timezone and date handling
 */
export const DateUtils = {
    /**
     * Format a date to Vietnam timezone string
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string in Vietnam timezone
     */
    formatVietnamDate: (date) => dayjs(date).tz(VIETNAM_TIMEZONE).format("DD/MM/YYYY HH:mm:ss"),

    /**
     * Convert a date to UTC
     * @param {Date|string} date - Date to convert
     * @returns {Date} Date in UTC
     */
    toUTC: (date) => dayjs(date).utc().toDate(),

    /**
     * Convert a UTC date to Vietnam timezone
     * @param {Date|string} date - Date in UTC
     * @returns {Date} Date in Vietnam timezone
     */
    fromUTCToVietnam: (date) => dayjs.utc(date).tz(VIETNAM_TIMEZONE).toDate(),

    /**
     * Get current time in Vietnam timezone
     * @returns {Date} Current time in Vietnam timezone
     */
    getCurrentVietnamTime: () => dayjs().tz(VIETNAM_TIMEZONE).toDate(),

    /**
     * Parse a Vietnam date string to UTC Date
     * @param {string} dateString - Date string in format "DD/MM/YYYY HH:mm"
     * @returns {Date} Date in UTC
     */
    parseVietnamDate: (dateString) => {
        const d = dayjs.tz(dateString, VIETNAM_DATE_FORMAT, VIETNAM_TIMEZONE, true);
        if (!d.isValid()) throw new Error(`Invalid date format: Expected ${VIETNAM_DATE_FORMAT}`);
        return d.utc().toDate();
    },

    /**
     * Parse a date string flexibly to UTC Date
     * @param {string} dateString - Date string to parse
     * @returns {Date} Date in UTC
     */
    parseDateFlexible: (dateString) => {
        if (!dateString) return null;

        console.log('Parsing date:', dateString);

        // Thử parse trực tiếp với dayjs và timezone
        let parsedDate = dayjs.tz(dateString, VIETNAM_TIMEZONE);
        if (parsedDate.isValid()) {
            console.log('Direct parse successful:', parsedDate.format());
            return parsedDate.toDate();
        }

        // Danh sách các format cần thử
        const formats = [
            VIETNAM_DATE_FORMAT,
            ISO_DATE_FORMAT,
            SIMPLE_DATE_FORMAT,
            "YYYY-MM-DD HH:mm",
            "YYYY-MM-DDTHH:mm:ss.SSSZ",
            "YYYY-MM-DDTHH:mm:ssZ"
        ];

        // Thử parse với từng format
        for (const format of formats) {
            parsedDate = dayjs.tz(dateString, format, VIETNAM_TIMEZONE);
            if (parsedDate.isValid()) {
                console.log('Parse successful with format:', format, parsedDate.format());
                return parsedDate.toDate();
            }
        }

        console.log('All parse attempts failed');
        throw new Error(`Không thể parse ngày tháng. Format hỗ trợ: ${formats.join(", ")}`);
    },

    /**
     * Parse an ISO date string with timezone to UTC Date
     * @param {string} isoString - ISO date string with timezone (e.g. "2025-04-07T07:00:00+07:00")
     * @returns {Date} Date in UTC
     */
    parseISOWithTimezone: (isoString) => {
        console.log('Parsing ISO string with timezone:', isoString);
        
        // Thử parse trực tiếp với dayjs
        const d = dayjs(isoString);
        
        if (d.isValid()) {
            console.log('ISO parse successful:', d.format());
            return d.utc().toDate();
        }
        
        console.log('ISO parse failed');
        throw new Error(`Invalid ISO date format: ${isoString}`);
    },

    /**
     * Check if a UTC date is expired compared to current Vietnam time
     * @param {Date} utcDate - UTC Date to check
     * @returns {boolean} True if date is expired
     */
    isExpiredInVietnam: (utcDate) => {
        const vnNow = dayjs().tz(VIETNAM_TIMEZONE);
        const vnDate = dayjs.utc(utcDate).tz(VIETNAM_TIMEZONE);
        return vnDate.isBefore(vnNow);
    },

    /**
     * Format a UTC date to Vietnam date string
     * @param {Date} date - UTC Date to format
     * @returns {string} Formatted date string in Vietnam timezone
     */
    formatToVietnamDateString: (date) => {
        if (!date) return null;
        return dayjs(date).tz(VIETNAM_TIMEZONE).format(VIETNAM_DATE_FORMAT);
    },

    /**
     * Get current time in UTC
     * @returns {Date} Current time in UTC
     */
    getCurrentUTCTime: () => dayjs.utc().toDate(),

    /**
     * Compare two UTC dates in Vietnam timezone
     * @param {Date} utcDate1 - First UTC date
     * @param {Date} utcDate2 - Second UTC date
     * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
     */
    compareVietnamDates: (utcDate1, utcDate2) => {
        const d1 = dayjs.utc(utcDate1).tz(VIETNAM_TIMEZONE);
        const d2 = dayjs.utc(utcDate2).tz(VIETNAM_TIMEZONE);
        return d1.isBefore(d2) ? -1 : d1.isAfter(d2) ? 1 : 0;
    },

    /**
     * Convert a Vietnam date string to UTC ISO string
     * @param {string} dateString - Date string in format "DD/MM/YYYY HH:mm"
     * @returns {string} ISO string in UTC
     */
    vietnamDateToUTCISO: (dateString) => {
        const d = dayjs.tz(dateString, VIETNAM_DATE_FORMAT, VIETNAM_TIMEZONE, true);
        if (!d.isValid()) throw new Error(`Invalid date format: Expected ${VIETNAM_DATE_FORMAT}`);
        return d.utc().toISOString();
    },

    /**
     * Convert a UTC ISO string to Vietnam date string
     * @param {string} isoString - ISO string in UTC
     * @returns {string} Date string in format "DD/MM/YYYY HH:mm"
     */
    utcISOToVietnamDate: (isoString) => dayjs.utc(isoString).tz(VIETNAM_TIMEZONE).format(VIETNAM_DATE_FORMAT),
    
    /**
     * Check if a date is within a date range in Vietnam timezone
     * @param {Date} date - Date to check
     * @param {Date} startDate - Start date of range
     * @param {Date} endDate - End date of range
     * @returns {boolean} True if date is within range
     */
    isDateInRange: (date, startDate, endDate) => {
        if (!date || !startDate || !endDate) return false;
        return dayjs(date).isBetween(startDate, endDate, 'day', '[]');
    },
    
    /**
     * Calculate duration between two dates in Vietnam timezone
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string} unit - Unit of duration (years, months, days, hours, minutes, seconds)
     * @returns {number} Duration in specified unit
     */
    calculateDuration: (startDate, endDate, unit = 'days') => {
        if (!startDate || !endDate) return 0;
        return dayjs(endDate).diff(dayjs(startDate), unit);
    },
    
    /**
     * Check if a date is a weekday in Vietnam timezone
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is a weekday (Monday-Friday)
     */
    isWeekday: (date) => {
        const d = dayjs.utc(date).tz(VIETNAM_TIMEZONE);
        const day = d.day();
        return day !== 0 && day !== 6; // 0 is Sunday, 6 is Saturday
    },
    
    /**
     * Get the start of day in Vietnam timezone
     * @param {Date} date - Date to get start of day for
     * @returns {Date} Start of day in UTC
     */
    getStartOfDay: (date) => {
        return dayjs.utc(date).tz(VIETNAM_TIMEZONE).startOf('day').utc().toDate();
    },
    
    /**
     * Get the end of day in Vietnam timezone
     * @param {Date} date - Date to get end of day for
     * @returns {Date} End of day in UTC
     */
    getEndOfDay: (date) => {
        return dayjs.utc(date).tz(VIETNAM_TIMEZONE).endOf('day').utc().toDate();
    },

    /**
     * Format a date to simple YYYY-MM-DD format
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string in YYYY-MM-DD format
     */
    formatSimpleDate: (date) => dayjs(date).format(SIMPLE_DATE_FORMAT),

    /**
     * Format a date to ISO date string
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string in ISO date format
     */
    formatToISODateString: (date) => {
        if (!date) return null;
        return dayjs(date).tz(VIETNAM_TIMEZONE).format(ISO_DATE_FORMAT);
    }
};

// Export dayjs đã được cấu hình
export default dayjs;