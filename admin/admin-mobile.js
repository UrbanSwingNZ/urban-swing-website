// Admin Mobile Navigation
// Handles hamburger menu and mobile drawer navigation

// ========================================
// Mobile Menu Management
// ========================================

class MobileNavigation {
  constructor() {
    this.hamburger = null;
    this.overlay = null;
    this.drawer = null;
    this.isOpen = false;
    
    // Initialize after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    // Create mobile navigation elements
    this.createMobileNav();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('Mobile navigation initialized');
  }

  createMobileNav() {
    const header = document.querySelector('.admin-header-content');
    if (!header) return;

    // Create hamburger menu button
    this.hamburger = document.createElement('button');
    this.hamburger.className = 'hamburger-menu';
    this.hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    this.hamburger.setAttribute('aria-expanded', 'false');
    this.hamburger.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;

    // Add hamburger to header (after h1)
    const h1 = header.querySelector('h1');
    if (h1) {
      h1.insertAdjacentElement('afterend', this.hamburger);
    } else {
      header.appendChild(this.hamburger);
    }

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'mobile-nav-overlay';
    document.body.appendChild(this.overlay);

    // Create drawer
    this.drawer = document.createElement('div');
    this.drawer.className = 'mobile-nav-drawer';
    this.drawer.innerHTML = this.createDrawerContent();
    document.body.appendChild(this.drawer);
  }

  createDrawerContent() {
    const userEmail = auth?.currentUser?.email || 'Not logged in';
    const isAuthorizedForAdminTools = userEmail === 'dance@urbanswing.co.nz';

    return `
      <div class="mobile-nav-header">
        <img src="/images/urban-swing-logo-glow-black-circle.png" alt="Urban Swing Logo">
        <div class="mobile-nav-user">
          <div class="mobile-nav-user-email">${userEmail}</div>
          <button class="mobile-nav-logout" id="mobile-logout-btn">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      
      <ul class="mobile-nav-menu">
        <li>
          <a href="/admin/" class="${this.isCurrentPage('/admin/') ? 'active' : ''}">
            <i class="fas fa-home"></i>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="/admin/playlist-manager/" class="${this.isCurrentPage('/admin/playlist-manager/') ? 'active' : ''}">
            <i class="fas fa-music"></i>
            <span>Playlist Manager</span>
          </a>
        </li>
        <li>
          <a href="/admin/student-database/" class="${this.isCurrentPage('/admin/student-database/') ? 'active' : ''}">
            <i class="fas fa-users"></i>
            <span>Student Database</span>
          </a>
        </li>
        <li>
          <a href="/admin/check-in/" class="${this.isCurrentPage('/admin/check-in/') ? 'active' : ''}">
            <i class="fas fa-user-check"></i>
            <span>Check-In</span>
          </a>
        </li>
        ${isAuthorizedForAdminTools ? `
        <li>
          <a href="/admin/admin-tools/" class="${this.isCurrentPage('/admin/admin-tools/') ? 'active' : ''}">
            <i class="fas fa-tools"></i>
            <span>Admin Tools</span>
          </a>
        </li>
        ` : ''}
      </ul>
      
      <div class="mobile-nav-footer">
        <p>&copy; 2025 Urban Swing<br>Admin Portal v1.0</p>
      </div>
    `;
  }

  isCurrentPage(path) {
    const currentPath = window.location.pathname;
    if (path === '/admin/') {
      return currentPath === '/admin/' || currentPath === '/admin/index.html';
    }
    return currentPath.startsWith(path);
  }

  setupEventListeners() {
    // Hamburger click
    this.hamburger?.addEventListener('click', () => this.toggleMenu());

    // Overlay click
    this.overlay?.addEventListener('click', () => this.closeMenu());

    // Logout button in drawer
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    mobileLogoutBtn?.addEventListener('click', () => this.handleMobileLogout());

    // Close menu when clicking a navigation link
    const navLinks = this.drawer?.querySelectorAll('.mobile-nav-menu a');
    navLinks?.forEach(link => {
      link.addEventListener('click', () => {
        // Small delay to allow navigation to feel responsive
        setTimeout(() => this.closeMenu(), 150);
      });
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
      }
    });

    // Handle window resize - close menu if resized to desktop
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768 && this.isOpen) {
          this.closeMenu();
        }
      }, 250);
    });
  }

  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.isOpen = true;
    this.hamburger?.classList.add('active');
    this.overlay?.classList.add('active');
    this.drawer?.classList.add('active');
    document.body.classList.add('mobile-nav-open');
    this.hamburger?.setAttribute('aria-expanded', 'true');
    
    // Focus first menu item for accessibility
    setTimeout(() => {
      const firstLink = this.drawer?.querySelector('.mobile-nav-menu a');
      firstLink?.focus();
    }, 350);
  }

  closeMenu() {
    this.isOpen = false;
    this.hamburger?.classList.remove('active');
    this.overlay?.classList.remove('active');
    this.drawer?.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
    this.hamburger?.setAttribute('aria-expanded', 'false');
    
    // Return focus to hamburger button
    this.hamburger?.focus();
  }

  async handleMobileLogout() {
    if (!auth) {
      console.error('Firebase auth not available');
      return;
    }

    try {
      // Close the menu first
      this.closeMenu();
      
      // Show loading state
      const logoutBtn = document.getElementById('mobile-logout-btn');
      const originalContent = logoutBtn?.innerHTML;
      if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;
      }

      // Sign out
      await auth.signOut();
      console.log('Mobile logout successful');

    } catch (error) {
      console.error('Mobile logout error:', error);
      alert('Failed to logout. Please try again.');
      
      // Restore button
      const logoutBtn = document.getElementById('mobile-logout-btn');
      if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.disabled = false;
      }
    }
  }

  // Public method to update user email (called after login)
  updateUserEmail(email) {
    const emailElement = this.drawer?.querySelector('.mobile-nav-user-email');
    if (emailElement) {
      emailElement.textContent = email;
    }

    // Recreate drawer content to update admin tools visibility
    if (this.drawer) {
      const wasOpen = this.isOpen;
      if (wasOpen) this.closeMenu();
      this.drawer.innerHTML = this.createDrawerContent();
      
      // Re-setup logout button listener
      const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
      mobileLogoutBtn?.addEventListener('click', () => this.handleMobileLogout());
      
      // Re-setup nav link listeners
      const navLinks = this.drawer.querySelectorAll('.mobile-nav-menu a');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          setTimeout(() => this.closeMenu(), 150);
        });
      });
    }
  }
}

// ========================================
// Initialize Mobile Navigation
// ========================================

// Create global instance
let mobileNav;

// Wait for dashboard to be visible before initializing
function initializeMobileNav() {
  const dashboard = document.getElementById('dashboard-container') || document.getElementById('main-container');
  if (dashboard && dashboard.style.display !== 'none') {
    mobileNav = new MobileNavigation();
    
    // Update email when user logs in
    if (auth?.currentUser) {
      mobileNav.updateUserEmail(auth.currentUser.email);
    }
  }
}

// Listen for auth state changes to initialize mobile nav
if (typeof auth !== 'undefined') {
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Small delay to ensure dashboard is rendered
      setTimeout(initializeMobileNav, 100);
    }
  });
} else {
  // Fallback: try to initialize after a delay
  window.addEventListener('load', () => {
    setTimeout(initializeMobileNav, 500);
  });
}

// Additional fallback: Check if main container is already visible (for pages that load quickly)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const mainContainer = document.getElementById('dashboard-container') || document.getElementById('main-container');
    if (mainContainer && mainContainer.style.display !== 'none' && !mobileNav) {
      initializeMobileNav();
    }
  }, 1000);
});

// Export for potential use in other scripts
window.MobileNavigation = MobileNavigation;
