/**
 * Format Utilities
 * Functions for formatting dates, currency, and text
 */

/**
 * Format date for display using NZ locale
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 * @example
 * formatDate(new Date()) // Returns "19 Dec 2025"
 */
export function formatDate(date, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
    if (!date) return '';
    
    let dateObj;
    if (date instanceof Date) {
        dateObj = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
    } else {
        return '';
    }
    
    return new Intl.DateTimeFormat('en-NZ', options).format(dateObj);
}

/**
 * Format date as DD/MM/YYYY
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 * @example
 * formatDateDDMMYYYY(new Date('2025-12-19')) // Returns "19/12/2025"
 */
export function formatDateDDMMYYYY(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
}

/**
 * Format timestamp to time string only
 * @param {Date|Object|string|number} timestamp - Timestamp to format (supports Firestore timestamps)
 * @returns {string} Formatted time string
 * @example
 * formatTime(new Date()) // Returns "2:30pm"
 */
export function formatTime(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
        // Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleTimeString('en-NZ', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
    });
}

/**
 * Format timestamp to full date and time
 * @param {Date|Object|string|number} timestamp - Timestamp to format (supports Firestore timestamps)
 * @returns {string} Formatted date and time string
 * @example
 * formatTimestamp(new Date()) // Returns "19 Dec 2025, 2:30pm"
 */
export function formatTimestamp(timestamp) {
    if (!timestamp) return '—';
    
    let date;
    if (timestamp.toDate) {
        // Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else {
        return '—';
    }
    
    // Format: "15 Oct 2025, 2:30pm"
    const options = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleDateString('en-NZ', options);
}

/**
 * Format currency in NZD
 * @param {number} amount - Amount in dollars
 * @returns {string} Formatted currency string
 * @example
 * formatCurrency(25.5) // Returns "$25.50"
 * formatCurrency(1234.56) // Returns "$1,234.56"
 */
export function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '$0.00';
    
    // Use Intl.NumberFormat for proper formatting with comma separators
    return new Intl.NumberFormat('en-NZ', {
        style: 'currency',
        currency: 'NZD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Convert text to Title Case (first letter of each word capitalized)
 * @param {string} text - Text to convert
 * @returns {string} Title cased text
 * @example
 * toTitleCase('hello world') // Returns "Hello World"
 */
export function toTitleCase(text) {
    if (!text) return '';
    
    return text
        .toLowerCase()
        .split(' ')
        .map(word => {
            // Don't capitalize empty strings
            if (word.length === 0) return word;
            // Capitalize first letter, keep rest lowercase
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}
