/**
 * Admin Authorization Check
 * Determines if the current user is an admin (dance@urbanswing.co.nz or urbanswingfrontdesk@gmail.com)
 * If admin: show student dropdown
 * If regular student: hide dropdown and show their own data
 */

const AUTHORIZED_ADMINS = [
    'dance@urbanswing.co.nz',
    'urbanswingfrontdesk@gmail.com'
];

let currentUser = null;
let currentUserEmail = null;
let isAuthorized = false;

// Make isAuthorized globally accessible
window.isAuthorized = false;

/**
 * Check if the current user is an admin or regular student
 */
async function checkUserAccess() {
    try {
        // Wait for Firebase to be initialized
        if (typeof firebase === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 500));
            return checkUserAccess(); // Retry
        }
        
        // Wait for Firebase Auth to initialize and check auth state
        // Don't unsubscribe immediately - wait for a definitive answer
        currentUser = await new Promise((resolve) => {
            let resolved = false;
            
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    // User is authenticated - resolve immediately
                    if (!resolved) {
                        resolved = true;
                        unsubscribe();
                        resolve(user);
                    }
                }
                // If user is null, don't resolve yet - wait a bit in case session is being restored
            });
            
            // If we still don't have a user after 5 seconds, give up
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    unsubscribe();
                    resolve(null);
                }
            }, 5000);
        });
        
        if (!currentUser) {
            // Redirect to login page
            window.location.href = '../index.html';
            return false;
        }

        currentUserEmail = currentUser.email.toLowerCase();

        // Check if this user has been soft-deleted
        const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists && userDoc.data().deleted === true) {
            // User has been deleted - sign them out and redirect to login
            await firebase.auth().signOut();
            alert('No account found with this email address.');
            window.location.href = '../index.html';
            return false;
        }

        // Check if user email is in authorized admin list
        isAuthorized = AUTHORIZED_ADMINS.includes(currentUserEmail);
        window.isAuthorized = isAuthorized;

        if (isAuthorized) {
            showAdminView();
            
            // Dispatch event for other pages to know auth check is complete
            window.dispatchEvent(new CustomEvent('authCheckComplete', { detail: { isAuthorized: true } }));
            
            return true;
        } else {
            showStudentView();
            
            // Dispatch event for other pages to know auth check is complete
            window.dispatchEvent(new CustomEvent('authCheckComplete', { detail: { isAuthorized: false } }));
            
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking user access:', error);
        // On error, redirect to login
        window.location.href = '../index.html';
        return false;
    }
}

/**
 * Show admin view with student selector dropdown
 */
function showAdminView() {
    document.getElementById('main-container').style.display = 'block';
    
    // Check if we have a selected student in sessionStorage
    const currentStudentId = sessionStorage.getItem('currentStudentId');
    
    // Only show empty state if no student is selected
    const emptyState = document.getElementById('empty-state');
    if (emptyState && !currentStudentId) {
        emptyState.style.display = 'block';
    }
}

/**
 * Show regular student view (hide dropdown and admin banner)
 */
function showStudentView() {
    document.getElementById('main-container').style.display = 'block';
    
    // Show dashboard with current user's data
    loadCurrentStudentData();
}

/**
 * Load the current logged-in student's data
 */
async function loadCurrentStudentData() {
    try {
        // Find student record by email
        const studentSnapshot = await window.db.collection('students')
            .where('email', '==', currentUserEmail)
            .limit(1)
            .get();
        
        if (studentSnapshot.empty) {
            console.error('Student record not found');
            alert('Error: Your student record could not be found. Please contact support.');
            return;
        }
        
        const studentDoc = studentSnapshot.docs[0];
        const student = {
            id: studentDoc.id,
            ...studentDoc.data()
        };
        
        // Store student data globally for other pages to use
        window.currentStudent = student;
        
        // Store student ID in sessionStorage for navigation
        sessionStorage.setItem('currentStudentId', student.id);
        
        // Show dashboard with student's data (only if these elements exist on this page)
        const emptyState = document.getElementById('empty-state');
        const studentDashboard = document.getElementById('student-dashboard');
        const studentNameEl = document.getElementById('dashboard-student-name');
        
        if (emptyState) emptyState.style.display = 'none';
        if (studentDashboard) studentDashboard.style.display = 'block';
        if (studentNameEl) studentNameEl.textContent = student.firstName;
        
        // Load dashboard data (only if function exists)
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData(student);
        }
        
        // Dispatch event for other pages
        window.dispatchEvent(new CustomEvent('studentLoaded', { detail: student }));
        
    } catch (error) {
        console.error('Error loading current student data:', error);
        alert('Error loading your data. Please try refreshing the page.');
    }
}

// Run access check when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    checkUserAccess();
});
