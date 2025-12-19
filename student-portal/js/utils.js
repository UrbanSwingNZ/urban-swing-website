/**
 * Student Portal Utility Functions
 * 
 * This file now imports from the centralized utilities library (/js/utils/)
 * and provides portal-specific utilities.
 * 
 * NOTE: showSnackbar() will be migrated to a shared component in refactoring item #5
 */

// Import centralized utilities
import {
    escapeHtml,
    formatCurrency,
    formatDate,
    normalizeDate,
    hasFieldChanged,
    isValidEmail,
    showLoading,
    navigateTo
} from '/js/utils/index.js';

// Re-export for backward compatibility during migration
export {
    escapeHtml,
    formatCurrency,
    formatDate,
    normalizeDate,
    hasFieldChanged,
    isValidEmail,
    showLoading,
    navigateTo
};

/**
 * Show a snackbar notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 * 
 * TODO: Replace with shared snackbar component (refactoring item #5)
 */
export function showSnackbar(message, type = 'info', duration = 3000) {
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
 * Configuration object for API endpoints
 * Portal-specific configuration
 */
export const API_CONFIG = {
    CASUAL_PAYMENT: 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processCasualPayment',
    CONCESSION_PURCHASE: 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processConcessionPurchase'
};
