/**
 * Navigation Module
 * Handles page navigation and button clicks
 */

/**
 * Navigate to registration page
 */
function navigateToRegister() {
    window.location.href = '../../student-portal/register.html';
}

/**
 * Initialize navigation event listeners
 */
function initializeNavigation() {
    // Register New Student button (in header)
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', navigateToRegister);
    }

    // Register New Student button (in empty state)
    const registerBtnEmpty = document.getElementById('register-btn-empty');
    if (registerBtnEmpty) {
        registerBtnEmpty.addEventListener('click', navigateToRegister);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}
