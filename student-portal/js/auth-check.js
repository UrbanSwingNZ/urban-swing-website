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
        // Wait for Firebase Auth to initialize
        await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });

        currentUser = firebase.auth().currentUser;
        
        if (!currentUser) {
            console.log('No user logged in - redirecting to login');
            // Redirect to login page (to be implemented)
            window.location.href = '../index.html';
            return false;
        }

        currentUserEmail = currentUser.email.toLowerCase();
        console.log('Checking access for:', currentUserEmail);

        // Check if user email is in authorized admin list
        isAuthorized = AUTHORIZED_ADMINS.includes(currentUserEmail);

        if (isAuthorized) {
            console.log('Admin user detected - showing student selector');
            showAdminView();
            return true;
        } else {
            console.log('Regular student user - showing personal view');
            showStudentView();
            return false;
        }
    } catch (error) {
        console.error('Error checking user access:', error);
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
    document.getElementById('student-selector').style.display = 'block';
    // Show empty state until student is selected
    document.getElementById('empty-state').style.display = 'block';
}

/**
 * Show regular student view (hide dropdown and admin banner)
 */
function showStudentView() {
    document.getElementById('main-container').style.display = 'block';
    document.getElementById('admin-banner').style.display = 'none';
    document.getElementById('student-selector').style.display = 'none';
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
