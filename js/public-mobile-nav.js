/**
 * Public Site Mobile Navigation
 * Wrapper for MobileDrawer component with public site configuration
 */

const PublicMobileNav = {
    drawerInstance: null,

    /**
     * Initialize mobile navigation using MobileDrawer component
     */
    initialize() {
        // Prevent duplicate initialization
        if (this.drawerInstance) {
            return;
        }

        // Check if MobileDrawer is available
        if (typeof MobileDrawer === 'undefined') {
            console.error('PublicMobileNav: MobileDrawer class not found. Make sure mobile-drawer.js is loaded first.');
            return;
        }

        // Get menu items from desktop navigation
        const menuItems = this.getMenuItems();

        // Create and initialize the drawer
        this.drawerInstance = new MobileDrawer({
            toggleButtonId: 'public-mobile-nav-toggle',
            drawerId: 'public-mobile-nav-drawer',
            overlayId: 'public-mobile-nav-overlay',
            drawerClass: 'mobile-nav-drawer',
            overlayClass: 'mobile-nav-overlay',
            activeClass: 'mobile-active',
            menuItems: menuItems,
            logoSrc: '/images/urban-swing-logo-glow-black-circle.png',
            logoHref: '/',
            logoAlt: 'Urban Swing Logo',
            onLogout: null // No logout for public site
        });

        this.drawerInstance.initialize();
    },

    /**
     * Get menu items from the desktop navigation
     */
    getMenuItems() {
        const items = [];
        const navLinks = document.querySelectorAll('#desktop-nav #menu a');

        navLinks.forEach(link => {
            // Extract icon class
            const icon = link.querySelector('i');
            const iconClass = icon ? icon.className : '';
            
            // Extract text (remove icon)
            const text = link.textContent.trim();

            items.push({
                href: link.href,
                icon: iconClass,
                label: text,
                dataPage: '' // Not used for public site
            });
        });

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
