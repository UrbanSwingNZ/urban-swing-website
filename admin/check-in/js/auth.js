/**
 * auth.js - Authentication module
 * Handles user authentication and session management
 */

let currentUser = null;

/**
 * Initialize authentication
 * Returns a promise that resolves when authentication is complete
 */
function initializeAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                document.getElementById('user-email').textContent = user.email;
                
                // Check if user has access to Admin Tools
                const isAuthorizedForAdminTools = user.email === 'dance@urbanswing.co.nz';
                const adminToolsNavItem = document.getElementById('admin-tools-nav');
                if (adminToolsNavItem) {
                    adminToolsNavItem.parentElement.style.display = isAuthorizedForAdminTools ? 'block' : 'none';
                }
                
                resolve(user);
            } else {
                // Not logged in, redirect to login
                window.location.href = '../index.html';
                reject(new Error('Not authenticated'));
            }
        });
    });
}

/**
 * Logout user
 */
function logout() {
    auth.signOut().then(() => {
        window.location.href = '../index.html';
    }).catch((error) => {
        showError('Logout failed: ' + error.message);
    });
}

/**
 * Get current user
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Check if current user is super admin (dance@urbanswing.co.nz)
 */
function isSuperAdmin() {
    return currentUser && currentUser.email === 'dance@urbanswing.co.nz';
}
