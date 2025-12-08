/**
 * Snackbar Component
 * Centralized notification system for Urban Swing
 * Updated: 2025-12-07
 * 
 * Usage:
 *   showSnackbar('Operation successful!', 'success');
 *   showSnackbar('An error occurred', 'error', 5000);
 * 
 * Types: 'success', 'error', 'warning', 'info'
 * Default duration: 3000ms
 */

// Queue to manage multiple snackbar requests
let snackbarQueue = [];
let isShowingSnackbar = false;

/**
 * Show a snackbar notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showSnackbar(message, type = 'info', duration = 3000) {
    // Add to queue
    snackbarQueue.push({ message, type, duration });
    
    // Process queue if not already showing a snackbar
    if (!isShowingSnackbar) {
        processQueue();
    }
}

/**
 * Process the snackbar queue
 */
function processQueue() {
    if (snackbarQueue.length === 0) {
        isShowingSnackbar = false;
        return;
    }
    
    isShowingSnackbar = true;
    const { message, type, duration } = snackbarQueue.shift();
    
    displaySnackbar(message, type, duration);
}

/**
 * Display a single snackbar
 */
function displaySnackbar(message, type, duration) {
    // Remove any existing snackbar
    const existingSnackbar = document.getElementById('snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }
    
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.id = 'snackbar';
    snackbar.className = `snackbar snackbar-${type}`;
    
    // Select icon based on type
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const icon = icons[type] || icons.info;
    
    // Escape HTML to prevent XSS
    const escapedMessage = escapeHtml(message);
    
    // Build snackbar content
    snackbar.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="snackbar-message">${escapedMessage}</span>
    `;
    
    // Add to DOM
    document.body.appendChild(snackbar);
    
    // Trigger slide-up animation
    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10);
    
    // Auto-hide after duration
    setTimeout(() => {
        snackbar.classList.remove('show');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            snackbar.remove();
            // Process next item in queue
            processQueue();
        }, 300); // Match CSS transition duration
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

// Expose globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.showSnackbar = showSnackbar;
}
