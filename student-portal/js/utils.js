/**
 * Shared Utility Functions
 * Common utilities used across the student portal
 */

/**
 * Show a snackbar notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showSnackbar(message, type = 'info', duration = 3000) {
    // Check if snackbar already exists
    let snackbar = document.getElementById('snackbar');
    
    if (!snackbar) {
        // Create snackbar element
        snackbar = document.createElement('div');
        snackbar.id = 'snackbar';
        snackbar.className = 'snackbar';
        document.body.appendChild(snackbar);
    }
    
    // Set message and type
    snackbar.textContent = message;
    snackbar.className = `snackbar ${type}`;
    
    // Show snackbar
    setTimeout(() => snackbar.classList.add('show'), 10);
    
    // Hide after duration
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML string
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show or hide loading spinner
 * @param {boolean} show - Whether to show or hide the spinner
 */
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Format currency for display
 * @param {number} amount - Amount in dollars
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
function formatDate(date, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
    return new Intl.DateTimeFormat('en-NZ', options).format(date);
}

/**
 * Normalize date to start of day
 * @param {Date} date - Date to normalize
 * @returns {Date} - Date set to 00:00:00
 */
function normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

/**
 * Check if a form field has changed from its original value
 * @param {*} currentValue - Current form field value
 * @param {*} originalValue - Original value
 * @returns {boolean} - True if changed
 */
function hasFieldChanged(currentValue, originalValue) {
    // Handle boolean fields
    if (typeof currentValue === 'boolean') {
        return currentValue !== (originalValue || false);
    }
    
    // Handle string fields
    return currentValue !== (originalValue || '');
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Configuration object for API endpoints
 */
const API_CONFIG = {
    CASUAL_PAYMENT: 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processCasualPayment',
    CONCESSION_PURCHASE: 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processConcessionPurchase'
};

/**
 * Navigation helper
 * @param {string} path - Relative path to navigate to
 */
function navigateTo(path) {
    window.location.href = path;
}
