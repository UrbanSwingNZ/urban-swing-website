/**
 * Admin Header Configurator
 * Handles configuration of the admin header based on page settings
 */

const AdminHeaderConfigurator = {
    /**
     * Configure the header with the given config
     */
    configure(config) {
        this.setPageTitle(config.title);
        this.configureBackButton(config.showBackButton, config.backUrl);
        this.configureLogoLink(config.showBackButton, config.backUrl);
        this.configureLogoutButton(config.showLogout);
        this.configureNavigation(config);
        this.setActiveNavItem(config.activePage);
    },

    /**
     * Set the page title
     */
    setPageTitle(title) {
        const titleElement = document.getElementById('admin-page-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    },

    /**
     * Configure the back button
     */
    configureBackButton(show, backUrl) {
        const backButton = document.getElementById('admin-back-button');
        if (backButton) {
            if (show) {
                backButton.style.display = 'flex';
                backButton.href = backUrl;
            } else {
                backButton.style.display = 'none';
            }
        }
    },

    /**
     * Configure the logo link
     */
    configureLogoLink(hideLink, backUrl) {
        const logoLink = document.getElementById('admin-logo-link');
        if (logoLink && !hideLink) {
            logoLink.href = backUrl;
        } else if (logoLink) {
            logoLink.removeAttribute('href');
            logoLink.style.cursor = 'default';
        }
    },

    /**
     * Configure the logout button
     */
    configureLogoutButton(show) {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.style.display = show ? 'inline-block' : 'none';
        }
    },

    /**
     * Configure navigation sections
     */
    configureNavigation(config) {
        const mainNav = document.getElementById('main-admin-nav');
        const toolsNav = document.getElementById('admin-tools-nav');
        const studentSelectorInline = document.getElementById('student-selector-inline');
        const adminHeader = document.querySelector('.admin-header');
        
        if (config.navSection === 'admin-tools') {
            if (mainNav) mainNav.style.display = 'none';
            if (toolsNav) toolsNav.style.display = 'block';
            if (studentSelectorInline) studentSelectorInline.style.display = 'none';
            if (adminHeader) adminHeader.classList.remove('no-nav');
        } else if (config.navSection === 'none') {
            // Student portal pages - hide nav, show student selector inline
            if (mainNav) mainNav.style.display = 'none';
            if (toolsNav) toolsNav.style.display = 'none';
            if (studentSelectorInline) studentSelectorInline.style.display = 'flex';
            if (adminHeader) adminHeader.classList.add('no-nav');
            
            // Initialize student selector
            if (config.showStudentSelector) {
                this.initializeStudentSelector();
            }
        } else {
            if (mainNav) mainNav.style.display = 'block';
            if (toolsNav) toolsNav.style.display = 'none';
            if (studentSelectorInline) studentSelectorInline.style.display = 'none';
            if (adminHeader) adminHeader.classList.remove('no-nav');
        }
    },

    /**
     * Set the active navigation item
     */
    setActiveNavItem(activePage) {
        const allNavLinks = document.querySelectorAll('.admin-header .nav-menu a');
        allNavLinks.forEach(link => {
            if (link.dataset.page === activePage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    /**
     * Initialize the student selector dropdown
     */
    initializeStudentSelector() {
        // Check if StudentLoader utility is available
        if (typeof StudentLoader === 'undefined') {
            console.error('StudentLoader utility not loaded. Please include student-loader.js');
            return;
        }
        
        // Check if already initialized
        const dropdown = document.getElementById('admin-student-dropdown');
        if (!dropdown || dropdown.dataset.initialized === 'true') {
            return;
        }
        
        // Mark as initialized
        dropdown.dataset.initialized = 'true';
        
        // Check if user is an admin and load students
        StudentLoader.checkAdminAuthorization().then(isAdmin => {
            if (isAdmin) {
                StudentLoader.loadStudents('admin-student-dropdown');
                StudentLoader.handleStudentSelection('admin-student-dropdown');
            } else {
                // Not an admin - hide the admin header entirely
                const adminHeader = document.querySelector('.admin-header');
                if (adminHeader) {
                    adminHeader.style.display = 'none';
                }
            }
        });
    },

    /**
     * Load and display the current user's email
     */
    loadUserInfo() {
        if (!window.firebase || !window.firebase.auth) {
            console.error('Firebase not initialized');
            return;
        }

        window.firebase.auth().onAuthStateChanged((user) => {
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement && user) {
                userEmailElement.textContent = user.email;
            }
        });
        
        // Setup logout button handler
        this.setupLogoutButton();
    },

    /**
     * Setup logout button event handler
     */
    setupLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) {
            return;
        }

        // Remove any existing listeners by cloning and replacing
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

        // Add the logout handler
        newLogoutBtn.addEventListener('click', async () => {
            try {
                if (!window.firebase || !window.firebase.auth) {
                    console.error('Firebase not initialized');
                    return;
                }

                await window.firebase.auth().signOut();
                console.log('Logout successful');
                
                // Clear any session storage
                sessionStorage.clear();
                
                // Redirect to login page or homepage
                window.location.href = '/admin/';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to logout. Please try again.');
            }
        });
    }
};
