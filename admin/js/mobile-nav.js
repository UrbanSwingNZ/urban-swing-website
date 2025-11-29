/**
 * Admin Header Mobile Navigation
 * Wrapper for MobileDrawer component with admin-specific configuration
 */

const AdminMobileNav = {
    drawerInstance: null,

    /**
     * Initialize mobile navigation using MobileDrawer component
     */
    initialize(config) {
        // Prevent duplicate initialization
        if (this.drawerInstance) {
            return;
        }

        // Check if MobileDrawer is available
        if (typeof MobileDrawer === 'undefined') {
            console.error('AdminMobileNav: MobileDrawer class not found. Make sure mobile-drawer.js is loaded first.');
            return;
        }

        // Get menu items from the visible nav menu
        const menuItems = this.getMenuItems(config);
        
        // Get logout handler
        const logoutBtn = document.getElementById('logout-btn');
        const onLogout = logoutBtn ? () => logoutBtn.click() : null;

        // Create and initialize the drawer
        this.drawerInstance = new MobileDrawer({
            toggleButtonId: 'mobile-nav-toggle',
            drawerId: 'mobile-nav-drawer',
            overlayId: 'mobile-nav-overlay',
            drawerClass: 'mobile-nav-drawer',
            overlayClass: 'mobile-nav-overlay',
            activeClass: 'mobile-active',
            menuItems: menuItems,
            logoSrc: '/images/urban-swing-logo-glow-black-circle.png',
            logoHref: '/admin/',
            logoAlt: 'Urban Swing Logo',
            onLogout: onLogout
        });

        this.drawerInstance.initialize();
    },

    /**
     * Get menu items from the current navigation
     */
    getMenuItems(config) {
        const items = [];
        let navMenu;

        if (config.navSection === 'admin-tools') {
            // Admin tools section - add Dashboard link first
            items.push({
                href: '/admin/',
                icon: 'fas fa-home',
                label: 'Dashboard',
                dataPage: 'dashboard'
            });

            // Get admin tools menu
            navMenu = document.querySelector('#admin-tools-nav .admin-menu');
        } else {
            // Main admin nav
            navMenu = document.querySelector('#main-admin-nav .admin-menu');
        }

        // Extract menu items from the nav
        if (navMenu) {
            const links = navMenu.querySelectorAll('a');
            links.forEach(link => {
                // Extract icon class
                const icon = link.querySelector('i');
                const iconClass = icon ? icon.className : '';
                
                // Extract text (remove icon)
                const text = link.textContent.trim();

                items.push({
                    href: link.href,
                    icon: iconClass,
                    label: text,
                    dataPage: link.dataset.page || ''
                });
            });
        }

        return items;
    },

    /**
     * Destroy the drawer (for cleanup)
     */
    destroy() {
        if (this.drawerInstance) {
            this.drawerInstance.destroy();
            this.drawerInstance = null;
        }
    }
};
