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
        
        // Always use main admin nav, but make Admin Tools an accordion
        const navMenu = document.querySelector('#main-admin-nav .nav-menu');
        
        if (navMenu) {
            const links = navMenu.querySelectorAll('a');
            links.forEach(link => {
                // Extract icon class
                const icon = link.querySelector('i');
                const iconClass = icon ? icon.className : '';
                
                // Extract text (remove icon)
                const text = link.textContent.trim();

                // Extract pathname from href for consistent matching
                const url = new URL(link.href, window.location.origin);
                
                // Check if this is the Admin Tools link
                if (link.dataset.page === 'admin-tools') {
                    // Create Admin Tools as an accordion with sub-items
                    const adminToolsSubItems = this.getAdminToolsSubItems();
                    
                    items.push({
                        href: url.pathname,
                        icon: iconClass,
                        label: text,
                        dataPage: link.dataset.page || '',
                        subItems: adminToolsSubItems
                    });
                } else {
                    // Regular menu item
                    items.push({
                        href: url.pathname,
                        icon: iconClass,
                        label: text,
                        dataPage: link.dataset.page || ''
                    });
                }
            });
        }

        return items;
    },

    /**
     * Get Admin Tools sub-items from the admin-tools-nav
     */
    getAdminToolsSubItems() {
        const subItems = [];
        const adminToolsNav = document.querySelector('#admin-tools-nav .nav-menu');
        
        if (adminToolsNav) {
            const links = adminToolsNav.querySelectorAll('a');
            links.forEach(link => {
                // Skip Dashboard and Tools Home from the sub-items
                if (link.dataset.page === 'dashboard' || link.dataset.page === 'admin-tools') {
                    return;
                }
                
                // Extract icon class
                const icon = link.querySelector('i');
                const iconClass = icon ? icon.className : '';
                
                // Extract text (remove icon)
                const text = link.textContent.trim();

                // Extract pathname from href for consistent matching
                const url = new URL(link.href, window.location.origin);
                
                // Check if this is the Database Tools link
                if (link.dataset.page === 'database-tools') {
                    // Create Database Tools as a nested accordion with sub-items
                    const databaseToolsSubItems = this.getDatabaseToolsSubItems();
                    
                    subItems.push({
                        href: url.pathname,
                        icon: iconClass,
                        label: text,
                        dataPage: link.dataset.page || '',
                        subItems: databaseToolsSubItems
                    });
                } else {
                    subItems.push({
                        href: url.pathname,
                        icon: iconClass,
                        label: text,
                        dataPage: link.dataset.page || ''
                    });
                }
            });
        }
        
        return subItems;
    },

    /**
     * Get Database Tools sub-items from the database-tools-nav
     */
    getDatabaseToolsSubItems() {
        const subItems = [];
        const databaseToolsNav = document.querySelector('#database-tools-nav .nav-menu');
        
        if (databaseToolsNav) {
            const links = databaseToolsNav.querySelectorAll('a');
            links.forEach(link => {
                // Skip Dashboard and Tools Home from the sub-items
                if (link.dataset.page === 'dashboard' || link.dataset.page === 'admin-tools') {
                    return;
                }
                
                // Extract icon class
                const icon = link.querySelector('i');
                const iconClass = icon ? icon.className : '';
                
                // Extract text (remove icon)
                const text = link.textContent.trim();

                // Extract pathname from href for consistent matching
                const url = new URL(link.href, window.location.origin);
                
                const item = {
                    href: url.pathname,
                    icon: iconClass,
                    label: text,
                    dataPage: link.dataset.page || ''
                };
                
                // Mark Backup, Merge Records, and Database Manager as desktop-only
                if (link.dataset.page === 'backup' || 
                    link.dataset.page === 'merge-records' || 
                    link.dataset.page === 'database-manager') {
                    item.desktopOnly = true;
                }
                
                subItems.push(item);
            });
        }
        
        return subItems;
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
