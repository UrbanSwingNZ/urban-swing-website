/**
 * Check-in Utility Functions
 * 
 * This file now imports from the centralized utilities library (/js/utils/)
 * and provides check-in-specific utilities.
 * 
 * NOTE: showSnackbar() will be migrated to a shared component in refactoring item #5
 */

// Import centralized utilities
import {
    escapeHtml,
    formatTime,
    formatDate,
    formatTimestamp,
    toTitleCase,
    isToday,
    getStartOfToday,
    getEndOfToday,
    showError
} from '/js/utils/index.js';

// Re-export for backward compatibility during migration
export {
    escapeHtml,
    formatTime,
    formatDate,
    formatTimestamp,
    toTitleCase,
    isToday,
    getStartOfToday,
    getEndOfToday,
    showError
};

/**
 * Show/hide loading spinner
 * Check-in specific implementation that also hides/shows main container
 */
export function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    const container = document.getElementById('main-container');
    
    if (spinner && container) {
        spinner.style.display = show ? 'flex' : 'none';
        container.style.display = show ? 'none' : 'block';
    }
}

/**
 * Show snackbar notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 * 
 * TODO: Replace with shared snackbar component (refactoring item #5)
 */
export function showSnackbar(message, type = 'success', duration = 3000) {
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
