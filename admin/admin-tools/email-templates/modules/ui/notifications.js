/**
 * notifications.js
 * Snackbar notification system
 */

/**
 * Show snackbar notification
 */
export function showSnackbar(message, type = 'success') {
    // Remove any existing snackbar
    const existing = document.querySelector('.snackbar');
    if (existing) {
        existing.remove();
    }
    
    // Create snackbar
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    snackbar.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="snackbar-message">${message}</span>
    `;
    
    document.body.appendChild(snackbar);
    
    // Trigger animation
    setTimeout(() => snackbar.classList.add('show'), 10);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => snackbar.remove(), 300);
    }, 3000);
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
    document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}
