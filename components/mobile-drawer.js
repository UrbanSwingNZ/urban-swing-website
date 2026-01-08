/**
 * Mobile Drawer Component
 * Reusable mobile navigation drawer for admin, student portal, and public site
 * 
 * Usage:
 * const drawer = new MobileDrawer({
 *   toggleButtonId: 'mobile-nav-toggle',
 *   drawerId: 'mobile-nav-drawer',
 *   overlayId: 'mobile-nav-overlay',
 *   menuItems: [...],
 *   logoSrc: '/images/logo.png',
 *   onLogout: () => handleLogout()
 * });
 * drawer.initialize();
 */

class MobileDrawer {
    /**
     * Create a mobile drawer instance
     * @param {Object} config - Configuration object
     * @param {string} config.toggleButtonId - ID of the hamburger toggle button
     * @param {string} config.drawerId - ID for the drawer element (default: 'mobile-nav-drawer')
     * @param {string} config.overlayId - ID for the overlay element (default: 'mobile-nav-overlay')
     * @param {string} config.drawerClass - CSS class for the drawer (default: 'mobile-nav-drawer')
     * @param {string} config.overlayClass - CSS class for the overlay (default: 'mobile-nav-overlay')
     * @param {Array} config.menuItems - Array of menu item objects {href, icon, label, dataPage}
     * @param {string} config.logoSrc - Path to logo image
     * @param {Function} config.onLogout - Logout handler function
     * @param {string} config.activeClass - Class to add when drawer is open (default: 'mobile-active')
     */
    constructor(config) {
        this.config = {
            drawerId: 'mobile-nav-drawer',
            overlayId: 'mobile-nav-overlay',
            drawerClass: 'mobile-nav-drawer',
            overlayClass: 'mobile-nav-overlay',
            activeClass: 'mobile-active',
            ...config
        };
        
        this.toggleButton = null;
        this.drawer = null;
        this.overlay = null;
        this.initialized = false;
    }

    /**
     * Initialize the mobile drawer
     */
    initialize() {
        // Prevent duplicate initialization
        if (this.initialized || document.getElementById(this.config.drawerId)) {
            console.warn('MobileDrawer: Already initialized');
            return;
        }

        // Get toggle button
        this.toggleButton = document.getElementById(this.config.toggleButtonId);
        if (!this.toggleButton) {
            console.error(`MobileDrawer: Toggle button #${this.config.toggleButtonId} not found`);
            return;
        }

        // Create drawer and overlay
        this.createDrawer();
        this.createOverlay();
        this.setupEventListeners();

        this.initialized = true;
    }

    /**
     * Create the drawer element
     */
    createDrawer() {
        this.drawer = document.createElement('div');
        this.drawer.id = this.config.drawerId;
        this.drawer.className = this.config.drawerClass;

        // Add close button
        this.addCloseButton();

        // Add logo
        if (this.config.logoSrc) {
            this.addLogo();
        }

        // Add menu
        if (this.config.menuItems && this.config.menuItems.length > 0) {
            this.addMenu();
        }

        // Add logout button
        if (this.config.onLogout) {
            this.addLogoutButton();
        }

        document.body.appendChild(this.drawer);
    }

    /**
     * Add close button to drawer
     */
    addCloseButton() {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-nav-close';
        closeBtn.setAttribute('aria-label', 'Close navigation menu');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        
        closeBtn.addEventListener('click', () => this.close());
        
        this.drawer.appendChild(closeBtn);
    }

    /**
     * Add logo to drawer
     */
    addLogo() {
        const logoLink = document.createElement('a');
        logoLink.className = 'drawer-logo';
        logoLink.href = this.config.logoHref || '#';
        
        const logoImg = document.createElement('img');
        logoImg.src = this.config.logoSrc;
        logoImg.alt = this.config.logoAlt || 'Logo';
        
        logoLink.appendChild(logoImg);
        this.drawer.appendChild(logoLink);
    }

    /**
     * Add menu to drawer
     */
    addMenu() {
        const menu = document.createElement('ul');
        menu.className = 'mobile-drawer-menu';
        
        const currentPath = window.location.pathname;

        this.config.menuItems.forEach(item => {
            const li = document.createElement('li');
            
            // Check if item has sub-items (accordion)
            if (item.subItems && item.subItems.length > 0) {
                this.createAccordionItem(li, item, currentPath);
            } else {
                this.createRegularItem(li, item, currentPath);
            }
            
            menu.appendChild(li);
        });

        this.drawer.appendChild(menu);
    }

    /**
     * Create a regular menu item (not an accordion)
     */
    createRegularItem(li, item, currentPath) {
        const link = document.createElement('a');
        link.href = item.href;
        
        if (item.dataPage) {
            link.dataset.page = item.dataPage;
        }
        
        // Check if this is the current page
        const isCurrentPage = this.isCurrentPage(item.href, currentPath);
        
        if (isCurrentPage) {
            link.classList.add('active');
        }
        
        if (item.icon) {
            link.innerHTML = `<i class="${item.icon}"></i> ${item.label}`;
        } else {
            link.textContent = item.label;
        }
        
        // Close drawer when menu item is clicked
        link.addEventListener('click', () => this.close());
        
        li.appendChild(link);
    }

    /**
     * Create an accordion menu item with sub-items
     */
    createAccordionItem(li, item, currentPath) {
        li.classList.add('accordion-item');
        
        // Create accordion header/toggle button
        const accordionButton = document.createElement('button');
        accordionButton.className = 'accordion-toggle';
        accordionButton.setAttribute('aria-expanded', 'false');
        
        if (item.icon) {
            accordionButton.innerHTML = `
                <span class="accordion-label">
                    <i class="${item.icon}"></i> ${item.label}
                </span>
                <i class="fas fa-chevron-down accordion-icon"></i>
            `;
        } else {
            accordionButton.innerHTML = `
                <span class="accordion-label">${item.label}</span>
                <i class="fas fa-chevron-down accordion-icon"></i>
            `;
        }
        
        // Create sub-menu container
        const subMenu = document.createElement('ul');
        subMenu.className = 'accordion-submenu';
        subMenu.style.display = 'none';
        
        // Check if any sub-item is the current page
        let hasActivePage = false;
        
        item.subItems.forEach(subItem => {
            const subLi = document.createElement('li');
            const subLink = document.createElement('a');
            subLink.href = subItem.href;
            
            if (subItem.dataPage) {
                subLink.dataset.page = subItem.dataPage;
            }
            
            const isCurrentPage = this.isCurrentPage(subItem.href, currentPath);
            
            if (isCurrentPage) {
                subLink.classList.add('active');
                hasActivePage = true;
            }
            
            if (subItem.icon) {
                subLink.innerHTML = `<i class="${subItem.icon}"></i> ${subItem.label}`;
            } else {
                subLink.textContent = subItem.label;
            }
            
            // Close drawer when sub-item is clicked
            subLink.addEventListener('click', () => this.close());
            
            subLi.appendChild(subLink);
            subMenu.appendChild(subLi);
        });
        
        // If a sub-item is active, expand the accordion by default
        if (hasActivePage) {
            accordionButton.classList.add('expanded');
            accordionButton.setAttribute('aria-expanded', 'true');
            subMenu.style.display = 'block';
        }
        
        // Toggle accordion on click
        accordionButton.addEventListener('click', (e) => {
            e.preventDefault();
            const isExpanded = accordionButton.classList.contains('expanded');
            
            if (isExpanded) {
                accordionButton.classList.remove('expanded');
                accordionButton.setAttribute('aria-expanded', 'false');
                subMenu.style.display = 'none';
            } else {
                accordionButton.classList.add('expanded');
                accordionButton.setAttribute('aria-expanded', 'true');
                subMenu.style.display = 'block';
            }
        });
        
        li.appendChild(accordionButton);
        li.appendChild(subMenu);
    }

    /**
     * Check if a URL is the current page
     */
    isCurrentPage(href, currentPath) {
        // Handle both exact matches and directory matches
        const normalizedItemHref = href.replace(/\/$/, ''); // Remove trailing slash
        const normalizedCurrentPath = currentPath.replace(/\/$/, '');
        
        let isCurrentPage = false;
        
        // Special case for home page - only match if both are home
        if (normalizedItemHref === '' || normalizedItemHref === '/') {
            isCurrentPage = normalizedCurrentPath === '' || normalizedCurrentPath === '/' || normalizedCurrentPath === '/index.html';
        } else {
            // For other pages - use exact matching only, no startsWith to avoid parent path false positives
            isCurrentPage = normalizedCurrentPath === normalizedItemHref || 
                            normalizedCurrentPath === normalizedItemHref + '/index.html' ||
                            normalizedItemHref === normalizedCurrentPath + '/index.html';
        }
        
        return isCurrentPage;
    }

    /**
     * Add logout button to drawer
     */
    addLogoutButton() {
        const menu = this.drawer.querySelector('.mobile-drawer-menu');
        if (!menu) {
            console.warn('MobileDrawer: Cannot add logout button - menu not found');
            return;
        }

        const li = document.createElement('li');
        
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'drawer-logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        
        logoutBtn.addEventListener('click', () => {
            this.close();
            if (this.config.onLogout) {
                this.config.onLogout();
            }
        });
        
        li.appendChild(logoutBtn);
        menu.appendChild(li);
    }

    /**
     * Create overlay element
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = this.config.overlayId;
        this.overlay.className = this.config.overlayClass;
        
        this.overlay.addEventListener('click', () => this.close());
        
        document.body.appendChild(this.overlay);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle button
        this.toggleButton.addEventListener('click', () => this.toggle());
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }

    /**
     * Open the drawer
     */
    open() {
        if (!this.drawer || !this.overlay) return;
        
        this.drawer.classList.add(this.config.activeClass);
        this.overlay.classList.add(this.config.activeClass);
        this.toggleButton?.classList.add('active');
        
        // Trap focus in drawer for accessibility
        this.trapFocus();
    }

    /**
     * Close the drawer
     */
    close() {
        if (!this.drawer || !this.overlay) return;
        
        this.drawer.classList.remove(this.config.activeClass);
        this.overlay.classList.remove(this.config.activeClass);
        this.toggleButton?.classList.remove('active');
        
        // Return focus to toggle button
        this.toggleButton?.focus();
    }

    /**
     * Toggle drawer open/closed
     */
    toggle() {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Check if drawer is open
     */
    isOpen() {
        return this.drawer?.classList.contains(this.config.activeClass);
    }

    /**
     * Trap focus within drawer for accessibility
     */
    trapFocus() {
        const focusableElements = this.drawer.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Focus first element
        firstElement.focus();
        
        // Trap tab key
        const handleTab = (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        
        this.drawer.addEventListener('keydown', handleTab);
    }

    /**
     * Destroy the drawer and cleanup
     */
    destroy() {
        if (this.drawer) {
            this.drawer.remove();
        }
        if (this.overlay) {
            this.overlay.remove();
        }
        this.initialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileDrawer;
}
