/**
 * UI Utilities
 * Functions for UI state management and user feedback
 */

import { getMessageIcon } from './icon-constants.js';

/**
 * Show or hide loading spinner
 * Now delegates to centralized LoadingSpinner component
 * 
 * @param {boolean} show - Whether to show or hide the spinner
 * @param {string} message - Optional loading message
 * @example
 * showLoading(true) // Shows loading spinner with default message
 * showLoading(true, 'Processing payment...') // Shows with custom message
 * showLoading(false) // Hides loading spinner
 */
export function showLoading(show, message = 'Loading...') {
    // Delegate to LoadingSpinner component if available
    if (show) {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.showGlobal(message);
        } else {
            // Fallback for pages that haven't loaded the component yet
            const spinner = document.getElementById('loading-spinner');
            if (spinner) {
                spinner.style.display = 'flex';
            }
        }
    } else {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.hideGlobal();
        } else {
            const spinner = document.getElementById('loading-spinner');
            if (spinner) {
                spinner.style.display = 'none';
            }
        }
    }
}

/**
 * Show loading state on a button
 * Disables button and shows spinner icon
 * 
 * @param {string} buttonId - ID of button element
 * @param {boolean} show - Whether to show loading state
 * @param {string} loadingText - Text to show when loading (default: 'Loading...')
 * @example
 * showLoadingButton('submit-btn', true, 'Processing...')
 * showLoadingButton('submit-btn', false)
 */
export function showLoadingButton(buttonId, show, loadingText = 'Loading...') {
    if (window.LoadingSpinner) {
        if (show) {
            window.LoadingSpinner.showButton(buttonId, loadingText);
        } else {
            window.LoadingSpinner.hideButton(buttonId);
        }
    } else {
        // Fallback for pages that haven't loaded the component yet
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        if (show) {
            button.disabled = true;
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Submit';
            if (button.dataset.originalText) {
                delete button.dataset.originalText;
            }
        }
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
