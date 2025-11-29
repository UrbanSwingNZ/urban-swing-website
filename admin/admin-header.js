/**
 * Admin Header Component Loader
 * Dynamically loads and configures the admin header for all admin pages
 * 
 * Dependencies (loaded via admin-header.html):
 * - header-config.js: Page configurations
 * - header-configurator.js: Header configuration logic
 * - mobile-nav.js: Mobile navigation functionality
 */

(function() {
    const currentPath = window.location.pathname;
    const headerPath = '/admin/components/admin-header.html';
    const isStudentPortalPage = currentPath.includes('/student-portal/');
    
    console.log('Admin header loading - currentPath:', currentPath);
    
    // Get configuration for current page
    const config = getPageConfig(currentPath);
    
    console.log('Config retrieved:', config);
    
    // For student portal pages, check if user is admin before loading header
    if (isStudentPortalPage) {
        // Wait for Firebase to initialize and auth to be ready
        const checkAuth = async () => {
            if (!window.firebase || !window.firebase.auth) {
                setTimeout(checkAuth, 100);
                return;
            }
            
            // Wait for user to be authenticated (with timeout)
            const user = await new Promise((resolve) => {
                let resolved = false;
                
                const unsubscribe = window.firebase.auth().onAuthStateChanged((user) => {
                    if (user) {
                        // User is authenticated - resolve immediately
                        if (!resolved) {
                            resolved = true;
                            unsubscribe();
                            resolve(user);
                        }
                    }
                    // If user is null, don't resolve yet - wait in case session is being restored
                });
                
                // If we still don't have a user after 5 seconds, give up
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        unsubscribe();
                        resolve(null);
                    }
                }, 5000);
            });
            
            if (!user) {
                // No user logged in after waiting, don't load admin header
                return;
            }
            
            // Check if user is admin via users collection (not admins collection)
            try {
                if (!window.db) {
                    console.error('Firestore not initialized');
                    return;
                }
                
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists && (userDoc.data().role === 'admin' || userDoc.data().role === 'front-desk')) {
                    // User is admin or front-desk, load the header
                    loadAdminHeader();
                }
                // If not admin, don't load admin header
            } catch (error) {
                console.error('Error checking admin status:', error);
            }
        };
        
        checkAuth();
    } else {
        // Not a student portal page, always load admin header
        loadAdminHeader();
    }
    
    function loadAdminHeader() {
        fetch(headerPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load admin header: ' + response.status);
                }
                return response.text();
            })
            .then(html => {
                // Find the insertion point
                // For student portal pages, always insert into body to avoid hidden containers
                const container = isStudentPortalPage ? document.body :
                                (document.getElementById('dashboard-container') || 
                                document.getElementById('main-container') ||
                                document.querySelector('.playlist-manager-container') ||
                                document.querySelector('.dashboard-container') ||
                                document.body);
                
                // Insert header at the beginning
                container.insertAdjacentHTML('afterbegin', html);
                
                // Configure the header immediately
                AdminHeaderConfigurator.configure(config);
                
                // Load user info (email)
                AdminHeaderConfigurator.loadUserInfo();
                
                // Initialize mobile navigation
                AdminMobileNav.initialize(config);
                
                // Also configure when container becomes visible (for login pages)
                const observer = new MutationObserver(() => {
                    AdminHeaderConfigurator.configure(config);
                });
                
                observer.observe(container, {
                    attributes: true,
                    attributeFilter: ['style']
                });
            })
            .catch(error => {
                console.error('Error loading admin header:', error);
            });
    }
})();
