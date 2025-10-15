/**
 * utils.js - Utility functions
 * Common helper functions used across check-in modules
 */

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    const container = document.getElementById('main-container');
    
    if (spinner && container) {
        spinner.style.display = show ? 'flex' : 'none';
        container.style.display = show ? 'none' : 'block';
    }
}

/**
 * Show error message
 */
function showError(message) {
    alert('Error: ' + message);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format timestamp to time string
 */
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
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
 * Format timestamp to date string
 */
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-NZ', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Convert text to title case
 */
function toTitleCase(text) {
    if (!text) return '';
    
    return text
        .toLowerCase()
        .split(' ')
        .map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Check if date is today
 */
function isToday(timestamp) {
    if (!timestamp) return false;
    
    let date;
    if (timestamp.toDate) {
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
 */
function getStartOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/**
 * Get end of today (23:59:59)
 */
function getEndOfToday() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
}
