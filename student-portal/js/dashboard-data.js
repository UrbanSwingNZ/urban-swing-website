/**
 * Dashboard Data Loader
 * Loads and displays student dashboard information
 */

/**
 * Load dashboard data for the selected student
 */
async function loadDashboardData(student) {
    try {
        console.log('Loading dashboard data for:', student.firstName, student.lastName);
        
        // Dashboard data loading removed - stats tiles were removed from UI
        // Future: Will load data for My Concessions, Check-In History, and Transaction pages
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

/**
 * Setup navigation card click handlers
 */
function setupNavigationCards() {
    // Transaction History
    document.getElementById('nav-transactions').addEventListener('click', (e) => {
        e.preventDefault();
        // Persist selected student for admin view so the target page doesn't flash empty state
        if (window.selectedStudent && window.selectedStudent.id) {
            sessionStorage.setItem('currentStudentId', window.selectedStudent.id);
        }
        window.location.href = '../transactions/index.html';
    });
    
    // My Concessions
    document.getElementById('nav-concessions').addEventListener('click', (e) => {
        e.preventDefault();
        // Persist selected student for admin view so the target page doesn't flash empty state
        if (window.selectedStudent && window.selectedStudent.id) {
            sessionStorage.setItem('currentStudentId', window.selectedStudent.id);
        }
        window.location.href = '../concessions/index.html';
    });
    
    // Check-In History
    document.getElementById('nav-checkins').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.selectedStudent && window.selectedStudent.id) {
            sessionStorage.setItem('currentStudentId', window.selectedStudent.id);
        }
        window.location.href = '../check-ins/index.html';
    });
    
    // Profile
    document.getElementById('nav-profile').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.selectedStudent && window.selectedStudent.id) {
            sessionStorage.setItem('currentStudentId', window.selectedStudent.id);
        }
        window.location.href = '../profile/index.html';
    });
    
    // Purchase Concessions
    document.getElementById('nav-purchase').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.selectedStudent && window.selectedStudent.id) {
            sessionStorage.setItem('currentStudentId', window.selectedStudent.id);
        }
        window.location.href = '../purchase/index.html';
    });
    
    // Pre-Pay for Class
    document.getElementById('nav-prepay').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.selectedStudent && window.selectedStudent.id) {
            sessionStorage.setItem('currentStudentId', window.selectedStudent.id);
        }
        window.location.href = '../prepay/index.html';
    });
}

// Setup navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavigationCards);
} else {
    // DOM already loaded
    setupNavigationCards();
}
