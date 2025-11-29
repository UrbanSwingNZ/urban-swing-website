/**
 * Admin Header Mobile Navigation
 * Handles mobile navigation drawer functionality
 */

const AdminMobileNav = {
    initialized: false,

    /**
     * Initialize mobile navigation
     */
    initialize(config) {
        // Check if already initialized to prevent duplicates
        if (this.initialized || document.getElementById('mobile-nav-drawer')) {
            return;
        }
        
        const navToggle = document.getElementById('mobile-nav-toggle');
        if (!navToggle) return;
        
        this.createDrawer(config);
        this.createOverlay();
        this.setupEventListeners(navToggle);
        
        this.initialized = true;
    },

    /**
     * Create the mobile navigation drawer
     */
    createDrawer(config) {
        const drawer = document.createElement('div');
        drawer.id = 'mobile-nav-drawer';
        drawer.className = 'mobile-nav-drawer';
        
        // Add close button to drawer
        this.addCloseButtonToDrawer(drawer);
        
        // Add logo to drawer
        this.addLogoToDrawer(drawer);
        
        // Add menu to drawer
        this.addMenuToDrawer(drawer, config);
        
        // Add logout button to drawer
        this.addLogoutToDrawer(drawer);
        
        // Insert drawer into body
        document.body.appendChild(drawer);
    },

    /**
     * Add close button to drawer
     */
    addCloseButtonToDrawer(drawer) {
        const closeBtn = document.createElement('button');
        closeBtn.id = 'mobile-nav-close';
        closeBtn.className = 'mobile-nav-close';
        closeBtn.setAttribute('aria-label', 'Close navigation menu');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        drawer.appendChild(closeBtn);
        
        // Add click event to close button
        closeBtn.addEventListener('click', () => this.toggleMenu());
    },

    /**
     * Add logo to drawer
     */
    addLogoToDrawer(drawer) {
        const logo = document.querySelector('.logo-small');
        if (logo) {
            const drawerLogo = logo.cloneNode(true);
            drawerLogo.classList.add('drawer-logo');
            drawer.appendChild(drawerLogo);
        }
    },

    /**
     * Add menu to drawer based on config
     */
    addMenuToDrawer(drawer, config) {
        let menuToClone;
        
        if (config.navSection === 'admin-tools') {
            menuToClone = document.querySelector('#admin-tools-nav .admin-menu');
            
            if (menuToClone) {
                const clonedMenu = menuToClone.cloneNode(true);
                
                // Create Dashboard link for admin-tools section
                const dashboardLi = document.createElement('li');
                dashboardLi.style.borderBottom = '1px solid var(--border-overlay-light)';
                
                const dashboardLink = document.createElement('a');
                dashboardLink.href = '/admin/';
                dashboardLink.dataset.page = 'dashboard';
                dashboardLink.innerHTML = '<i class="fas fa-home"></i> Dashboard';
                
                dashboardLi.appendChild(dashboardLink);
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
    },

    /**
     * Add logout button to drawer
     */
    addLogoutToDrawer(drawer) {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) return;
        
        const clonedMenu = drawer.querySelector('.admin-menu');
        if (!clonedMenu) return;
        
        const logoutListItem = document.createElement('li');
        logoutListItem.style.borderBottom = '1px solid var(--border-overlay-light)';
        
        const clonedLogout = logoutBtn.cloneNode(true);
        clonedLogout.id = 'mobile-logout-btn';
        
        logoutListItem.appendChild(clonedLogout);
        clonedMenu.appendChild(logoutListItem);
        
        // Add click event to cloned logout button
        clonedLogout.addEventListener('click', () => {
            logoutBtn.click();
            this.toggleMenu();
        });
    },

    /**
     * Create the overlay
     */
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'mobile-nav-overlay';
        overlay.className = 'mobile-nav-overlay';
        document.body.appendChild(overlay);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners(navToggle) {
        const drawer = document.getElementById('mobile-nav-drawer');
        const overlay = document.getElementById('mobile-nav-overlay');
        
        // Toggle button
        navToggle.addEventListener('click', () => this.toggleMenu());
        
        // Overlay
        overlay.addEventListener('click', () => this.toggleMenu());
        
        // Menu links
        const drawerLinks = drawer.querySelectorAll('a');
        drawerLinks.forEach(link => {
            link.addEventListener('click', () => this.toggleMenu());
        });
    },

    /**
     * Toggle menu open/closed
     */
    toggleMenu() {
        const navToggle = document.getElementById('mobile-nav-toggle');
        const drawer = document.getElementById('mobile-nav-drawer');
        const overlay = document.getElementById('mobile-nav-overlay');
        
        if (navToggle) navToggle.classList.toggle('active');
        if (drawer) drawer.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    }
};
