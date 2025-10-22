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
            
            // Load students
            loadStudents().catch(error => {
                console.error('Failed to load students:', error);
                showError('Failed to load students: ' + error.message);
                showLoading(false);
            });
        } else {
            // User not authenticated, redirect to admin login
            window.location.href = '../index.html';
        }
    });
}

/**
 * Logout user
 */
async function logout() {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
}

/**
 * Get current user
 */
function getCurrentUser() {
    return currentUser;
}
