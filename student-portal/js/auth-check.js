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
        currentUser = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Firebase auth timeout'));
            }, 10000); // 10 second timeout
            
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                clearTimeout(timeout);
                unsubscribe();
                resolve(user);
            });
        });
        
        if (!currentUser) {
            // Redirect to login page
            window.location.href = '../index.html';
            return false;
        }

        currentUserEmail = currentUser.email.toLowerCase();

        // Check if user email is in authorized admin list
        isAuthorized = AUTHORIZED_ADMINS.includes(currentUserEmail);

        if (isAuthorized) {
            showAdminView();
            
            // Trigger student loading if the function exists
            if (typeof loadStudents === 'function') {
                loadStudents();
            }
            
            return true;
        } else {
            showStudentView();
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
    document.getElementById('admin-banner').style.display = 'block';
    // Show empty state until student is selected
    document.getElementById('empty-state').style.display = 'block';
}

/**
 * Show regular student view (hide dropdown and admin banner)
 */
function showStudentView() {
    document.getElementById('main-container').style.display = 'block';
    document.getElementById('admin-banner').style.display = 'none';
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
            console.error('No student record found for:', currentUserEmail);
            alert('Error: Your student record could not be found. Please contact support.');
            return;
        }
        
        const studentDoc = studentSnapshot.docs[0];
        const student = {
            id: studentDoc.id,
            ...studentDoc.data()
        };
        
        console.log('Loaded student data for:', student.firstName, student.lastName);
        
        // Show dashboard with student's data
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('student-dashboard').style.display = 'block';
        document.getElementById('dashboard-student-name').textContent = student.firstName;
        
        // Load dashboard data
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData(student);
        }
    } catch (error) {
        console.error('Error loading current student data:', error);
        alert('Error loading your data. Please try refreshing the page.');
    }
}

// Run access check when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    checkUserAccess();
});
