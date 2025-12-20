/**
 * UI Utilities
 * Functions for UI state management and user feedback
 */

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
 * Show snackbar notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'  
 * @param {number} duration - Duration in milliseconds (default: 3000)
 * @example
 * showSnackbar('Check-in successful!', 'success', 3000)
 * showSnackbar('Error occurred', 'error')
 */
export function showSnackbar(message, type = 'success', duration = 3000) {
    // Import escapeHtml dynamically to avoid circular dependency
    // Since this module is imported by index.js which also imports dom-utils
    const escapeHtml = window.escapeHtml || ((text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    });

    // Remove any existing snackbar
    const existingSnackbar = document.getElementById('snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }

    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.id = 'snackbar';
    snackbar.className = `snackbar snackbar-${type}`;

    // Add icon based on type
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';

    snackbar.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    // Add to body
    document.body.appendChild(snackbar);

    // Trigger animation
    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10);

    // Auto-hide after duration
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => {
            snackbar.remove();
        }, 300);
    }, duration);
}
