/**
 * notifications.js
 * Snackbar notification system
 */

// Import centralized utilities
import { showSnackbar as centralizedSnackbar } from '/js/utils/index.js';

/**
 * Show snackbar notification
 * Now uses centralized implementation
 */
export function showSnackbar(message, type = 'success') {
    centralizedSnackbar(message, type);
}

/**
 * Show success message
 */
export function showSuccess(message) {
    showSnackbar(message, 'success');
}

/**
 * Show error message
 */
export function showError(message) {
    showSnackbar(message, 'error');
}

/**
 * Show loading spinner
 */
export function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}
