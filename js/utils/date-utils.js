/**
 * Date Utilities
 * Functions for date manipulation and comparison
 */

/**
 * Normalize date to start of day (midnight)
 * @param {Date|string|number} date - Date to normalize
 * @returns {Date} Date set to 00:00:00
 * @example
 * normalizeDate(new Date()) // Returns today at midnight
 */
export function normalizeDate(date) {
    const normalized = date instanceof Date ? new Date(date) : new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

/**
 * Check if a timestamp is today
 * @param {Date|Object|string|number} timestamp - Timestamp to check (supports Firestore timestamps)
 * @returns {boolean} True if date is today
 * @example
 * isToday(new Date()) // Returns true
 */
export function isToday(timestamp) {
    if (!timestamp) return false;
    
    let date;
    if (timestamp.toDate) {
        // Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }
    
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

/**
 * Get start of today (midnight)
 * @returns {Date} Today's date at 00:00:00
 * @example
 * getStartOfToday() // Returns today at midnight
 */
export function getStartOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/**
 * Get end of today (23:59:59)
 * @returns {Date} Today's date at 23:59:59.999
 * @example
 * getEndOfToday() // Returns today at 23:59:59
 */
export function getEndOfToday() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date in YYYY-MM-DD format
 * @example
 * getTodayDateString() // Returns "2025-12-19"
 */
export function getTodayDateString() {
    const today = new Date();
    return formatDateToString(today);
}

/**
 * Format Date object to YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} Date in YYYY-MM-DD format
 * @example
 * formatDateToString(new Date('2025-12-19')) // Returns "2025-12-19"
 */
export function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Parsed date object
 * @example
 * parseDateString('2025-12-19') // Returns Date object for Dec 19, 2025
 */
export function parseDateString(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}
