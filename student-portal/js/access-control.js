/**
 * Access Control for Student Portal
 * Protects pages based on improver status
 */

(function() {
    /**
     * Check if current user has access to the current page
     * Redirects if access is denied
     */
    async function checkPageAccess() {
        try {
            // Wait for Firebase to initialize
            if (typeof firebase === 'undefined' || !firebase.auth()) {
                await new Promise(resolve => setTimeout(resolve, 500));
                return checkPageAccess(); // Retry
            }

            // Wait for authentication
            const user = await new Promise((resolve) => {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            });

            if (!user) {
                // Not logged in - redirect to login page
                window.location.href = '/student-portal/index.html';
                return;
            }

            // Check if admin (admins bypass access control)
            const AUTHORIZED_ADMINS = [
                'dance@urbanswing.co.nz',
                'urbanswingfrontdesk@gmail.com'
            ];
            const isAdmin = AUTHORIZED_ADMINS.includes(user.email.toLowerCase());
            
            if (isAdmin) {
                // Admins can access all pages
                return;
            }

            // Wait for Firestore
            if (!window.db) {
                await new Promise(resolve => setTimeout(resolve, 500));
                return checkPageAccess(); // Retry
            }

            // Load student data
            const studentsSnapshot = await window.db.collection('students')
                .where('email', '==', user.email.toLowerCase())
                .limit(1)
                .get();

            if (studentsSnapshot.empty) {
                // Student not found - redirect to dashboard
                showMessageAndRedirect('Student account not found. Please contact support.', '/student-portal/dashboard/');
                return;
            }

            const student = studentsSnapshot.docs[0].data();
            const isImprover = student.improver === true;
            
            // Get current page
            const currentPath = window.location.pathname;

            // Check access rules
            if (currentPath.includes('/membership/')) {
                // Membership page - only for improvers
                if (!isImprover) {
                    showMessageAndRedirect('Memberships are for Improver students only', '/student-portal/dashboard/');
                }
            } else if (currentPath.includes('/purchase/')) {
                // Purchase concessions page - only for beginners
                if (isImprover) {
                    showMessageAndRedirect('As an Improver, please use the Membership system', '/student-portal/membership/');
                }
            } else if (currentPath.includes('/prepay/')) {
                // Prepay page - only for beginners
                if (isImprover) {
                    showMessageAndRedirect('As an Improver, please use the Membership system', '/student-portal/membership/');
                }
            }

        } catch (error) {
            console.error('Error checking page access:', error);
            // On error, allow access but log the issue
        }
    }

    /**
     * Show message and redirect
     * @param {string} message - Message to display
     * @param {string} redirectUrl - URL to redirect to
     */
    function showMessageAndRedirect(message, redirectUrl) {
        // Try to use snackbar if available
        if (typeof showSnackbar === 'function') {
            showSnackbar(message, 'error');
        } else {
            // Fallback to alert
            alert(message);
        }

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
    }

    // Run access check when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkPageAccess);
    } else {
        checkPageAccess();
    }
})();
