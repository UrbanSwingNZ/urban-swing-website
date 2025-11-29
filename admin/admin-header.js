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
    
    // Get configuration for current page
    const config = getPageConfig(currentPath);
    
    // Load the header HTML
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
            const isStudentPortalPage = currentPath.includes('/student-portal/');
            
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
})();
