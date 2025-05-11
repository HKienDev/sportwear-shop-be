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
const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_DATE_FORMAT = "DD/MM/YYYY HH:mm";
const ISO_DATE_FORMAT_WITH_OFFSET = 'YYYY-MM-DDTHH:mm:ssZ';

console.log('Testing date parsing with dayjs');
console.log('-----------------------------------');

// Test 1: Parse ISO string with timezone
const isoString = "2025-04-07T07:00:00+07:00";
console.log('1. Testing ISO string with timezone:');
console.log('Input:', isoString);
const d1 = dayjs(isoString);
console.log('Is valid:', d1.isValid());
console.log('Format:', d1.format());
console.log('ISO string:', d1.toISOString());
console.log('UTC:', d1.utc().format());
console.log('Vietnam:', d1.tz(VIETNAM_TIMEZONE).format());
console.log('-----------------------------------');

// Test 2: Parse ISO string with timezone using format
console.log('2. Testing ISO string with timezone using format:');
console.log('Input:', isoString);
const d2 = dayjs(isoString, ISO_DATE_FORMAT_WITH_OFFSET, true);
console.log('Is valid:', d2.isValid());
console.log('Format:', d2.format());
console.log('ISO string:', d2.toISOString());
console.log('UTC:', d2.utc().format());
console.log('Vietnam:', d2.tz(VIETNAM_TIMEZONE).format());
console.log('-----------------------------------');

// Test 3: Parse Vietnam date string
const vnString = "07/04/2025 07:00";
console.log('3. Testing Vietnam date string:');
console.log('Input:', vnString);
const d3 = dayjs.tz(vnString, VIETNAM_DATE_FORMAT, VIETNAM_TIMEZONE, true);
console.log('Is valid:', d3.isValid());
console.log('Format:', d3.format());
console.log('ISO string:', d3.toISOString());
console.log('UTC:', d3.utc().format());
console.log('Vietnam:', d3.tz(VIETNAM_TIMEZONE).format());
console.log('-----------------------------------');

// Test 4: Parse second date
const isoString2 = "2025-05-08T06:59:59+07:00";
console.log('4. Testing second ISO string with timezone:');
console.log('Input:', isoString2);
const d4 = dayjs(isoString2);
console.log('Is valid:', d4.isValid());
console.log('Format:', d4.format());
console.log('ISO string:', d4.toISOString());
console.log('UTC:', d4.utc().format());
console.log('Vietnam:', d4.tz(VIETNAM_TIMEZONE).format());
console.log('-----------------------------------');

// Test 5: Compare dates
console.log('5. Testing date comparison:');
console.log('Start date:', d1.format());
console.log('End date:', d4.format());
console.log('Is end after start:', d4.isAfter(d1));
console.log('Is end same or before start:', d4.isSameOrBefore(d1));
console.log('-----------------------------------');

// Test 6: Get current time
console.log('6. Testing current time:');
const now = dayjs();
console.log('Current time:', now.format());
console.log('Current time UTC:', now.utc().format());
console.log('Current time Vietnam:', now.tz(VIETNAM_TIMEZONE).format());
console.log('-----------------------------------');

// Test 7: Check if start date is in the future
console.log('7. Testing if start date is in the future:');
console.log('Start date:', d1.format());
console.log('Current time:', now.format());
console.log('Is start date in the future:', d1.isAfter(now));
console.log('-----------------------------------');

// Test 8: Check if end date is after start date
console.log('8. Testing if end date is after start date:');
console.log('Start date:', d1.format());
console.log('End date:', d4.format());
console.log('Is end date after start date:', d4.isAfter(d1));
console.log('-----------------------------------');

// Test 9: Calculate duration between dates
console.log('9. Testing duration between dates:');
console.log('Start date:', d1.format());
console.log('End date:', d4.format());
console.log('Duration in days:', d4.diff(d1, 'day'));
console.log('Duration in hours:', d4.diff(d1, 'hour'));
console.log('Duration in minutes:', d4.diff(d1, 'minute'));
console.log('-----------------------------------');

// Test 10: Format dates
console.log('10. Testing date formatting:');
console.log('Start date:', d1.format());
console.log('End date:', d4.format());
console.log('Start date Vietnam:', d1.tz(VIETNAM_TIMEZONE).format(VIETNAM_DATE_FORMAT));
console.log('End date Vietnam:', d4.tz(VIETNAM_TIMEZONE).format(VIETNAM_DATE_FORMAT));
console.log('-----------------------------------');

if (!d1.isValid() || !d4.isValid()) {
    console.error("Lỗi xác thực dữ liệu");
    console.error("Ngày bắt đầu không hợp lệ");
    console.error("Ngày kết thúc không hợp lệ");
} 