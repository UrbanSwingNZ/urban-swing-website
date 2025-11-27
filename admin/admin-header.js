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
            showLogout: true,
            backUrl: '../index.html'
        },
        '/admin/playlist-manager/': {
            title: 'Playlist Manager',
            activePage: 'playlist-manager',
            navSection: 'main-admin',
            showBackButton: true,
            showLogout: true,
            backUrl: '../index.html'
        },
        '/admin/playlist-manager/index.html': {
            title: 'Playlist Manager',
            activePage: 'playlist-manager',
            navSection: 'main-admin',
            showBackButton: true,
            showLogout: true,
            backUrl: '../index.html'
        },
        '/admin/student-database/': {
            title: 'Student Database',
            activePage: 'student-database',
            navSection: 'main-admin',
            showBackButton: true,
            showLogout: true,
            backUrl: '../index.html'
        },
        '/admin/check-in/': {
            title: 'Student Check-In',
            activePage: 'check-in',
            navSection: 'main-admin',
            showBackButton: true,
            showLogout: true,
            backUrl: '../index.html'
        },
        '/admin/admin-tools/': {
            title: 'Admin Tools',
            activePage: 'admin-tools',
            navSection: 'admin-tools',
            showBackButton: true,
            showLogout: true,
            backUrl: '../index.html'
        },
        '/admin/admin-tools/backup-database.html': {
            title: 'Database Backup',
            activePage: 'backup',
            navSection: 'admin-tools',
            showBackButton: true,
            showLogout: true,
            backUrl: './'
        },
        '/admin/admin-tools/concession-types.html': {
            title: 'Concession Types',
            activePage: 'concession-types',
            navSection: 'admin-tools',
            showBackButton: true,
            showLogout: true,
            backUrl: './'
        },
        '/admin/admin-tools/closedown-nights/': {
            title: 'Closedown Nights',
            activePage: 'closedown',
            navSection: 'admin-tools',
            showBackButton: true,
            showLogout: true,
            backUrl: '../'
        },
        '/admin/admin-tools/email-templates/': {
            title: 'Email Templates',
            activePage: 'email-templates',
            navSection: 'admin-tools',
            showBackButton: true,
            showLogout: true,
            backUrl: '../'
        },
        '/admin/admin-tools/gift-concessions/': {
            title: 'Gift Concessions',
            activePage: 'gift-concessions',
            navSection: 'admin-tools',
            showBackButton: true,
            showLogout: true,
            backUrl: '../'
        },
        '/admin/admin-tools/transactions/': {
            title: 'Transactions',
            activePage: 'transactions',
            navSection: 'admin-tools',
            showBackButton: true,
            showLogout: true,
            backUrl: '../'
        }
    };
    
    // Get config for current page
    const config = pageConfig[currentPath] || {
        title: 'Admin',
        activePage: '',
        navSection: 'main-admin',
        showBackButton: false,
        showLogout: true,
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
        
        // Show/hide logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.style.display = config.showLogout ? 'inline-block' : 'none';
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
        
        // Initialize mobile navigation
        initializeMobileNav(config);
    }
    
    function initializeMobileNav(config) {
        // Check if already initialized to prevent duplicates
        if (document.getElementById('mobile-nav-drawer')) {
            return;
        }
        
        const navToggle = document.getElementById('mobile-nav-toggle');
        if (!navToggle) return;
        
        // Create mobile navigation drawer
        const drawer = document.createElement('div');
        drawer.id = 'mobile-nav-drawer';
        drawer.className = 'mobile-nav-drawer';
        
        // Add logo to drawer
        const logo = document.querySelector('.logo-small');
        if (logo) {
            const drawerLogo = logo.cloneNode(true);
            drawerLogo.classList.add('drawer-logo');
            drawer.appendChild(drawerLogo);
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'mobile-nav-overlay';
        overlay.className = 'mobile-nav-overlay';
        
        // Clone the appropriate navigation menu
        let menuToClone;
        if (config.navSection === 'admin-tools') {
            menuToClone = document.querySelector('#admin-tools-nav .admin-menu');
            
            // For admin-tools section, also add Dashboard link at the top
            if (menuToClone) {
                const clonedMenu = menuToClone.cloneNode(true);
                
                // Create Dashboard link
                const dashboardLi = document.createElement('li');
                dashboardLi.style.borderBottom = '1px solid var(--border-overlay-light)';
                
                const dashboardLink = document.createElement('a');
                dashboardLink.href = '/admin/';
                dashboardLink.dataset.page = 'dashboard';
                dashboardLink.innerHTML = '<i class="fas fa-home"></i> Dashboard';
                
                dashboardLi.appendChild(dashboardLink);
                
                // Insert Dashboard at the beginning of the menu
                clonedMenu.insertBefore(dashboardLi, clonedMenu.firstChild);
                
                drawer.appendChild(clonedMenu);
            }
        } else {
            menuToClone = document.querySelector('#main-admin-nav .admin-menu');
            
            if (menuToClone) {
                const clonedMenu = menuToClone.cloneNode(true);
                drawer.appendChild(clonedMenu);
            }
        }
        
        // Add logout button to the menu
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            const clonedMenu = drawer.querySelector('.admin-menu');
            if (clonedMenu) {
                // Create a list item for the logout button
                const logoutListItem = document.createElement('li');
                logoutListItem.style.borderBottom = '1px solid var(--border-overlay-light)';
                
                const clonedLogout = logoutBtn.cloneNode(true);
                clonedLogout.id = 'mobile-logout-btn';
                
                logoutListItem.appendChild(clonedLogout);
                clonedMenu.appendChild(logoutListItem);
                
                // Add click event to cloned logout button
                clonedLogout.addEventListener('click', () => {
                    // Trigger click on original logout button
                    logoutBtn.click();
                    toggleMenu();
                });
            }
        }
        
        // Insert drawer and overlay into body
        document.body.appendChild(overlay);
        document.body.appendChild(drawer);
        
        // Toggle menu function
        function toggleMenu() {
            navToggle.classList.toggle('active');
            drawer.classList.toggle('open');
            overlay.classList.toggle('active');
        }
        
        // Event listeners
        navToggle.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        
        // Close menu when clicking a link
        const drawerLinks = drawer.querySelectorAll('a');
        drawerLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMenu();
            });
        });
    }
})();
