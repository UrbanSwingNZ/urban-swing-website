/**
 * Student Portal Header Component Loader
 * Dynamically loads and configures the student portal header for all student portal pages
 */

(function() {
    // Use absolute path to header component
    const headerPath = '/student-portal/components/student-portal-header.html';
    
    // Page configuration mapping
    const pageConfig = {
        '/student-portal/dashboard/': {
            title: 'Dashboard',
            activePage: 'dashboard'
        },
        '/student-portal/profile/': {
            title: 'Profile',
            activePage: 'profile'
        },
        '/student-portal/prepay/': {
            title: 'Prepay Classes',
            activePage: 'prepay'
        },
        '/student-portal/purchase/': {
            title: 'Purchase Concessions',
            activePage: 'purchase'
        },
        '/student-portal/concessions/': {
            title: 'My Concessions',
            activePage: 'concessions'
        },
        '/student-portal/transactions/': {
            title: 'Transaction History',
            activePage: 'transactions'
        },
        '/student-portal/check-ins/': {
            title: 'Check-In History',
            activePage: 'check-ins'
        }
    };

    // Get current page configuration
    const currentPath = window.location.pathname;
    const config = pageConfig[currentPath] || {
        title: 'Student Portal',
        activePage: ''
    };

    /**
     * Load the header component
     */
    function loadHeader() {
        fetch(headerPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load header: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                const headerContainer = document.createElement('div');
                headerContainer.innerHTML = html;
                const headerElement = headerContainer.firstElementChild;
                
                // Insert header immediately at the top of body
                document.body.insertBefore(headerElement, document.body.firstChild);
                
                // Configure the header
                configureHeader();
                
                // Check if admin header loads later and adjust position if needed
                const adminHeader = document.querySelector('.admin-header');
                if (!adminHeader) {
                    // Watch for admin header being added
                    const observer = new MutationObserver((mutations) => {
                        const newAdminHeader = document.querySelector('.admin-header');
                        if (newAdminHeader) {
                            // Move student header after admin header
                            const studentHeader = document.querySelector('.student-portal-header');
                            if (studentHeader && newAdminHeader.nextSibling !== studentHeader) {
                                newAdminHeader.parentNode.insertBefore(studentHeader, newAdminHeader.nextSibling);
                            }
                            observer.disconnect();
                        }
                    });
                    
                    observer.observe(document.body, {
                        childList: true,
                        subtree: false
                    });
                    
                    // Stop watching after 3 seconds
                    setTimeout(() => observer.disconnect(), 3000);
                } else {
                    // Admin header already exists, move after it
                    const studentHeader = document.querySelector('.student-portal-header');
                    if (studentHeader) {
                        adminHeader.parentNode.insertBefore(studentHeader, adminHeader.nextSibling);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading student portal header:', error);
            });
    }

    /**
     * Configure header based on page config and user state
     */
    function configureHeader() {
        // Set page title
        const titleElement = document.getElementById('student-portal-page-title');
        if (titleElement) {
            titleElement.textContent = config.title;
        }

        // Set active navigation item (scope to student portal header)
        if (config.activePage) {
            const navLink = document.querySelector(`.student-portal-header .nav-menu a[data-page="${config.activePage}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
        }

        // Setup mobile menu toggle
        setupMobileMenu();

        // Setup logout button
        setupLogout();

        // Load user information
        loadUserInfo();
    }

    /**
     * Setup mobile menu toggle functionality
     */
    function setupMobileMenu() {
        // Get menu items from desktop navigation (scope to student portal header)
        const menuItems = [];
        const navLinks = document.querySelectorAll('.student-portal-header .nav-menu a');
        
        navLinks.forEach(link => {
            const icon = link.querySelector('i');
            const iconClass = icon ? icon.className : '';
            const text = link.textContent.trim();
            
            menuItems.push({
                href: link.href,
                icon: iconClass,
                label: text,
                dataPage: link.dataset.page || ''
            });
        });

        // Create and initialize mobile drawer
        const mobileDrawer = new MobileDrawer({
            toggleButtonId: 'student-mobile-nav-toggle',
            drawerId: 'student-mobile-nav-drawer',
            overlayId: 'student-mobile-nav-overlay',
            drawerClass: 'mobile-nav-drawer',
            overlayClass: 'student-mobile-nav-overlay',
            activeClass: 'mobile-active',
            menuItems: menuItems,
            logoSrc: '/images/urban-swing-logo-glow-black-circle.png',
            logoHref: '/student-portal/dashboard/',
            logoAlt: 'Urban Swing Logo',
            onLogout: async () => {
                try {
                    if (typeof firebase !== 'undefined' && firebase.auth) {
                        await firebase.auth().signOut();
                    }
                    sessionStorage.clear();
                    window.location.href = '/student-portal/index.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Error logging out. Please try again.');
                }
            }
        });

        mobileDrawer.initialize();
    }

    /**
     * Setup logout functionality
     */
    function setupLogout() {
        const logoutBtn = document.getElementById('student-logout-btn');
        
        const handleLogout = async () => {
            try {
                // Sign out from Firebase
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    await firebase.auth().signOut();
                }
                
                // Clear session storage
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = '/student-portal/index.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            }
        };
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    /**
     * Load and display user information
     */
    async function loadUserInfo() {
        const userNameElement = document.getElementById('student-user-name');
        if (!userNameElement) return;

        try {
            // Wait for Firebase to initialize
            if (typeof firebase === 'undefined') {
                await new Promise(resolve => setTimeout(resolve, 500));
                return loadUserInfo(); // Retry
            }

            // Check if user is authenticated
            const user = await new Promise((resolve) => {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            });

            if (!user) {
                userNameElement.textContent = 'Not logged in';
                return;
            }

            // Check if user is an admin
            const AUTHORIZED_ADMINS = [
                'dance@urbanswing.co.nz',
                'urbanswingfrontdesk@gmail.com'
            ];
            const isAdmin = AUTHORIZED_ADMINS.includes(user.email.toLowerCase());
            const userInfoContainer = document.querySelector('.student-user-info');
            
            if (isAdmin) {
                // Admin viewing student portal - hide user info (admin info shown in admin header)
                if (userInfoContainer) {
                    userInfoContainer.style.display = 'none';
                }
            } else {
                // Regular student logged in - show user info
                if (userInfoContainer) {
                    userInfoContainer.style.display = 'flex';
                }
                await loadCurrentUserName(user, userNameElement);
            }

            // Listen for student selection changes (when admin selects different student)
            window.addEventListener('studentSelected', (event) => {
                if (event.detail && event.detail.student) {
                    const student = event.detail.student;
                    userNameElement.textContent = `${student.firstName} ${student.lastName}`;
                }
            });

        } catch (error) {
            console.error('Error loading user info:', error);
            userNameElement.textContent = 'Error loading user';
        }
    }

    /**
     * Load selected student's name (for admin view)
     */
    async function loadStudentName(studentId, element) {
        try {
            if (!window.db) {
                throw new Error('Firestore not initialized');
            }

            const studentDoc = await window.db.collection('students').doc(studentId).get();
            
            if (studentDoc.exists) {
                const student = studentDoc.data();
                element.textContent = `${student.firstName} ${student.lastName}`;
            } else {
                element.textContent = 'Student not found';
            }
        } catch (error) {
            console.error('Error loading student name:', error);
            element.textContent = 'Error loading student';
        }
    }

    /**
     * Load current logged-in user's name
     */
    async function loadCurrentUserName(user, element) {
        try {
            if (!window.db) {
                throw new Error('Firestore not initialized');
            }

            // Find student by email
            const studentsSnapshot = await window.db.collection('students')
                .where('email', '==', user.email.toLowerCase())
                .limit(1)
                .get();

            if (!studentsSnapshot.empty) {
                const student = studentsSnapshot.docs[0].data();
                element.textContent = `${student.firstName} ${student.lastName}`;
            } else {
                // Might be admin - just show email
                element.textContent = user.email;
            }
        } catch (error) {
            console.error('Error loading user name:', error);
            element.textContent = user.email;
        }
    }

    // Load header when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
        loadHeader();
    }
})();
