/**
 * Transactions Tool Utility Functions
 * 
 * This file now imports from the centralized utilities library (/js/utils/)
 * and provides transactions-specific utilities.
 * 
 * NOTE: showSnackbar() will be migrated to a shared component in refactoring item #5
 */

// Import centralized utilities
import {
    formatDate,
    formatCurrency,
    escapeHtml,
    showLoading
} from '/js/utils/index.js';

// Re-export for backward compatibility during migration
export {
    formatDate,
    formatCurrency,
    escapeHtml,
    showLoading
};

/**
 * Show snackbar notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'success', 'error'
 * 
 * TODO: Replace with shared snackbar component (refactoring item #5)
 */
export function showSnackbar(message, type = 'success') {
    const snackbar = document.getElementById('snackbar');
    snackbar.textContent = message;
    snackbar.className = `snackbar ${type} show`;
    
    setTimeout(() => {
        snackbar.className = 'snackbar';
    }, 3000);
}

/**
 * Handle logout
 * Transactions-specific logout handler
 */
export async function handleLogout() {
    try {
        await firebase.auth().signOut();
        window.location.href = '/admin/';
    } catch (error) {
        console.error('Logout error:', error);
        showSnackbar('Error logging out', 'error');
    }
}
