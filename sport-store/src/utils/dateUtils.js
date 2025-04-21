import { format, parse, compareAsc } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)
 */
export const getCurrentVietnamTime = () => {
    const now = new Date();
    return new Date(now.getTime() + (7 * 60 * 60 * 1000));
};

/**
 * So sánh hai ngày theo múi giờ Việt Nam
 * @returns {number} -1 nếu date1 < date2, 0 nếu date1 = date2, 1 nếu date1 > date2
 */
export const compareVietnamDates = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return compareAsc(d1, d2);
};

/**
 * Format ngày giờ theo định dạng Việt Nam
 */
export const formatToVietnamDateString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return format(d, 'HH:mm:ss dd/MM/yyyy', { locale: vi });
};

/**
 * Parse chuỗi ngày giờ từ định dạng Việt Nam sang Date object
 */
export const parseVietnamDateString = (dateString) => {
    if (!dateString) return null;
    try {
        return parse(dateString, 'HH:mm:ss dd/MM/yyyy', new Date(), { locale: vi });
    } catch (error) {
        console.error('Error parsing date:', error);
        return null;
    }
}; 