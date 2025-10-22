/**
 * utils.js
 * Utility functions for transactions page
 */

/**
 * Format date for display
 */
function formatDate(date) {
    return date.toLocaleDateString('en-NZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format date for input field
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show snackbar notification
 */
function showSnackbar(message, type = 'success') {
    const snackbar = document.getElementById('snackbar');
    snackbar.textContent = message;
    snackbar.className = `snackbar ${type} show`;
    
    setTimeout(() => {
        snackbar.className = 'snackbar';
    }, 3000);
}

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = show ? 'flex' : 'none';
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        window.location.href = '/admin/';
    } catch (error) {
        console.error('Logout error:', error);
        showSnackbar('Error logging out', 'error');
    }
}
