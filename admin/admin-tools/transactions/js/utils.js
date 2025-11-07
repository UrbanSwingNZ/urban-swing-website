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
        day: 'numeric'
    });
}

/**
 * Format currency with commas for thousands
 */
function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
