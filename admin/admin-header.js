/**
 * Admin Header Component Loader
 * Dynamically loads and configures the admin header for all admin pages
 */

(function() {
    // Determine the correct path to the header based on current location
    const currentPath = window.location.pathname;
    
    // Use absolute path to avoid issues with subdirectories
    const headerPath = '/admin/components/admin-header.html';
    
    // Page configuration mapping
    const pageConfig = {
        '/admin/': {
            title: 'Admin Dashboard',
            activePage: 'dashboard',
            navSection: 'main-admin',
            showBackButton: false,
            backUrl: '../index.html'
        },
        '/admin/playlist-manager/': {
            title: 'Playlist Manager',
            activePage: 'playlist-manager',
            navSection: 'main-admin',
            showBackButton: true,
            backUrl: '../index.html'
        },
        '/admin/student-database/': {
            title: 'Student Database',
            activePage: 'student-database',
            navSection: 'main-admin',
            showBackButton: true,
            backUrl: '../index.html'
        },
        '/admin/check-in/': {
            title: 'Student Check-In',
            activePage: 'check-in',
            navSection: 'main-admin',
            showBackButton: true,
            backUrl: '../index.html'
        },
        '/admin/admin-tools/': {
            title: 'Admin Tools',
            activePage: 'admin-tools',
            navSection: 'admin-tools',
            showBackButton: true,
            backUrl: '../index.html'
        },
        '/admin/admin-tools/backup-database.html': {
            title: 'Database Backup',
            activePage: 'backup',
            navSection: 'admin-tools',
            showBackButton: true,
            backUrl: './'
        },
        '/admin/admin-tools/concession-types.html': {
            title: 'Concession Types',
            activePage: 'concession-types',
            navSection: 'admin-tools',
            showBackButton: true,
            backUrl: './'
        },
        '/admin/admin-tools/closedown-nights/': {
            title: 'Closedown Nights',
            activePage: 'closedown',
            navSection: 'admin-tools',
            showBackButton: true,
            backUrl: '../'
        },
        '/admin/admin-tools/email-templates/': {
            title: 'Email Templates',
            activePage: 'email-templates',
            navSection: 'admin-tools',
            showBackButton: true,
            backUrl: '../'
        },
        '/admin/admin-tools/gift-concessions/': {
            title: 'Gift Concessions',
            activePage: 'gift-concessions',
            navSection: 'admin-tools',
            showBackButton: true,
            backUrl: '../'
        },
        '/admin/admin-tools/transactions/': {
            title: 'Transactions',
            activePage: 'transactions',
            navSection: 'admin-tools',
            showBackButton: true,
            backUrl: '../'
        }
    };
    
    // Get config for current page
    const config = pageConfig[currentPath] || {
        title: 'Admin',
        activePage: '',
        navSection: 'main-admin',
        showBackButton: false,
        backUrl: '../index.html'
    };
    
    // Load the header HTML
    fetch(headerPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load admin header: ' + response.status);
            }
            return response.text();
        })
        .then(html => {
            // Find the insertion point (first element in dashboard-container or body)
            const container = document.getElementById('dashboard-container') || 
                            document.getElementById('main-container') ||
                            document.querySelector('.playlist-manager-container') ||
                            document.querySelector('.dashboard-container') ||
                            document.body;
            
            // Insert header at the beginning
            container.insertAdjacentHTML('afterbegin', html);
            
            // Configure the header immediately
            configureHeader(config);
            
            // Also configure when dashboard becomes visible (for login page)
            const observer = new MutationObserver(() => {
                configureHeader(config);
            });
            
            observer.observe(container, {
                attributes: true,
                attributeFilter: ['style']
            });
        })
        .catch(error => {
            console.error('Error loading admin header:', error);
        });
    
    function configureHeader(config) {
        // Set page title
        const titleElement = document.getElementById('admin-page-title');
        if (titleElement) {
            titleElement.textContent = config.title;
        }
        
        // Show/hide back button
        const backButton = document.getElementById('admin-back-button');
        if (backButton) {
            if (config.showBackButton) {
                backButton.style.display = 'flex';
                backButton.href = config.backUrl;
            } else {
                backButton.style.display = 'none';
            }
        }
        
        // Update logo link
        const logoLink = document.getElementById('admin-logo-link');
        if (logoLink && !config.showBackButton) {
            logoLink.href = config.backUrl;
        } else if (logoLink) {
            logoLink.removeAttribute('href');
            logoLink.style.cursor = 'default';
        }
        
        // Show correct navigation section
        const mainNav = document.getElementById('main-admin-nav');
        const toolsNav = document.getElementById('admin-tools-nav');
        
        if (config.navSection === 'admin-tools') {
            if (mainNav) mainNav.style.display = 'none';
            if (toolsNav) toolsNav.style.display = 'block';
        } else {
            if (mainNav) mainNav.style.display = 'block';
            if (toolsNav) toolsNav.style.display = 'none';
        }
        
        // Set active nav item
        const allNavLinks = document.querySelectorAll('.admin-menu a');
        allNavLinks.forEach(link => {
            if (link.dataset.page === config.activePage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
})();
