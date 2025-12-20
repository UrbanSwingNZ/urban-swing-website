/**
 * Authentication Module
 * Handles user authentication and session management
 */

let currentUser = null;

/**
 * Initialize authentication
 */
function initializeAuth() {
    showLoading(true);

    // Check if user is authenticated
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
            
            // Load students (this sets up a snapshot listener, doesn't return a promise)
            try {
                loadStudents();
            } catch (error) {
                console.error('Failed to load students:', error);
                showError('Failed to load students: ' + error.message);
                showLoading(false);
            }
        } else {
            // User not authenticated, redirect to admin login
            window.location.href = '../index.html';
        }
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
