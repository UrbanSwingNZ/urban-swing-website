/**
 * UI Utilities
 * Functions for UI state management and user feedback
 */

import { getMessageIcon } from './icon-constants.js';

/**
 * Show or hide loading spinner
 * @param {boolean} show - Whether to show or hide the spinner
 * @example
 * showLoading(true) // Shows loading spinner
 * showLoading(false) // Hides loading spinner
 * 
 * Note: Basic implementation shows/hides spinner only.
 * Check-in module has enhanced version that also hides main-container.
 * That behavior should be handled in check-in specific code.
 */
export function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Show error message using alert
 * @param {string} message - Error message to display
 * @example
 * showError('An error occurred') // Shows alert with error message
 */
export function showError(message) {
    alert('Error: ' + message);
}

/**
 * Navigate to a different page
 * @param {string} path - Relative or absolute path to navigate to
 * @example
 * navigateTo('/admin/dashboard') // Navigates to admin dashboard
 */
export function navigateTo(path) {
    window.location.href = path;
}

/**
 * Handle user logout
 * Signs out from Firebase and redirects to home page
 * @returns {Promise<void>}
 * @example
 * await handleLogout() // Signs out and redirects to /
 */
export async function handleLogout() {
    try {
        await firebase.auth().signOut();
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

/**
 * showSnackbar() has been moved to /components/snackbar/snackbar.js
 * Import from there or use the global window.showSnackbar
 * 
 * This function is now exported from index.js which imports it from the new location.
 */
