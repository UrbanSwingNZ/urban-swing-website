/**
 * Database Tools Page Logic
 * Handles authentication and page initialization
 */

(function() {
    // Wait for Firebase to initialize
    window.addEventListener('load', () => {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                // User not authenticated, redirect to login
                window.location.href = '/admin/';
                return;
            }

            // Check if user has admin role
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (!doc.exists || (doc.data().role !== 'admin' && doc.data().role !== 'front-desk')) {
                    // User is not an admin
                    window.location.href = '/admin/';
                    return;
                }

                // User is authenticated and is an admin
                console.log('Database Tools page loaded for admin:', user.email);
            }).catch((error) => {
                console.error('Error checking admin status:', error);
                window.location.href = '/admin/';
            });
        });
    });
})();
