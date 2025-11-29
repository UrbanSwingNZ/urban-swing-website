/**
 * Admin Header Page Configurations
 * Centralized configuration for all admin and student portal pages
 */

const AdminHeaderConfig = {
    // Admin Pages
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
    
    // Admin Tools Pages
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
    },
    
    // Student Portal Pages (admin view)
    '/student-portal/dashboard/': {
        title: 'Student Portal',
        activePage: 'student-portal',
        navSection: 'none',
        showBackButton: true,
        showLogout: true,
        showStudentSelector: true,
        backUrl: '/admin/index.html'
    },
    '/student-portal/profile/': {
        title: 'Student Portal',
        activePage: 'student-portal',
        navSection: 'none',
        showBackButton: true,
        showLogout: true,
        showStudentSelector: true,
        backUrl: '/admin/index.html'
    },
    '/student-portal/prepay/': {
        title: 'Student Portal',
        activePage: 'student-portal',
        navSection: 'none',
        showBackButton: true,
        showLogout: true,
        showStudentSelector: true,
        backUrl: '/admin/index.html'
    },
    '/student-portal/purchase/': {
        title: 'Student Portal',
        activePage: 'student-portal',
        navSection: 'none',
        showBackButton: true,
        showLogout: true,
        showStudentSelector: true,
        backUrl: '/admin/index.html'
    },
    '/student-portal/concessions/': {
        title: 'Student Portal',
        activePage: 'student-portal',
        navSection: 'none',
        showBackButton: true,
        showLogout: true,
        showStudentSelector: true,
        backUrl: '/admin/index.html'
    },
    '/student-portal/transactions/': {
        title: 'Student Portal',
        activePage: 'student-portal',
        navSection: 'none',
        showBackButton: true,
        showLogout: true,
        showStudentSelector: true,
        backUrl: '/admin/index.html'
    },
    '/student-portal/check-ins/': {
        title: 'Student Portal',
        activePage: 'student-portal',
        navSection: 'none',
        showBackButton: true,
        showLogout: true,
        showStudentSelector: true,
        backUrl: '/admin/index.html'
    }
};

/**
 * Get configuration for a given path
 */
function getPageConfig(path) {
    // First, try exact match
    if (AdminHeaderConfig[path]) {
        console.log('Exact match found for path:', path);
        return AdminHeaderConfig[path];
    }
    
    // Normalize path - remove index.html and ensure trailing slash for directories
    let normalizedPath = path;
    if (normalizedPath.endsWith('index.html')) {
        normalizedPath = normalizedPath.replace(/index\.html$/, '');
    }
    
    // Only add trailing slash if it doesn't end with .html (i.e., it's a directory)
    if (!normalizedPath.endsWith('/') && !normalizedPath.endsWith('.html')) {
        normalizedPath += '/';
    }
    
    console.log('Looking up config for normalized path:', normalizedPath);
    
    return AdminHeaderConfig[normalizedPath] || {
        title: 'Admin',
        activePage: '',
        navSection: 'main-admin',
        showBackButton: false,
        showLogout: true,
        backUrl: '../index.html'
    };
}
