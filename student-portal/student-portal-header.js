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
                // Wait for admin header if it's loading
                let retryCount = 0;
                const maxRetries = 20; // Wait up to 2 seconds
                
                const checkAndInsertHeader = () => {
                    const adminHeader = document.querySelector('.admin-header');
                    const adminHeaderScript = document.querySelector('script[src*="admin-header.js"]');
                    
                    // If admin header script exists but header not yet loaded, wait for it
                    if (adminHeaderScript && !adminHeader && retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(checkAndInsertHeader, 100);
                        return;
                    }
                    
                    const headerContainer = document.createElement('div');
                    headerContainer.innerHTML = html;
                    const headerElement = headerContainer.firstElementChild;
                    
                    if (adminHeader) {
                        // Both headers should be in body now, insert student portal header right after admin header
                        adminHeader.insertAdjacentElement('afterend', headerElement);
                    } else {
                        // Insert at beginning of body (regular student view)
                        document.body.insertBefore(headerElement, document.body.firstChild);
                    }
                    
                    // Configure header after it's loaded
                    configureHeader();
                };
                
                checkAndInsertHeader();
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

        // Set active navigation item
        if (config.activePage) {
            const navLink = document.querySelector(`.student-portal-menu a[data-page="${config.activePage}"]`);
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
        const toggleBtn = document.getElementById('mobile-nav-toggle');
        const nav = document.getElementById('student-portal-nav');
        
        if (toggleBtn && nav) {
            toggleBtn.addEventListener('click', () => {
                toggleBtn.classList.toggle('active');
                nav.classList.toggle('mobile-active');
            });

            // Close menu when clicking a link
            const navLinks = nav.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    toggleBtn.classList.remove('active');
                    nav.classList.remove('mobile-active');
                });
            });
        }
    }

    /**
     * Setup logout functionality
     */
    function setupLogout() {
        const logoutBtn = document.getElementById('student-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
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
            });
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

            // Check if this is an admin viewing a student
            const selectedStudentId = sessionStorage.getItem('currentStudentId');
            
            if (selectedStudentId) {
                // Admin is viewing a student - show selected student's name
                await loadStudentName(selectedStudentId, userNameElement);
            } else {
                // Regular student or admin without selection - show logged in user
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
