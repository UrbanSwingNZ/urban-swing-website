/**
 * Dashboard Data Loader
 * Loads and displays student dashboard information
 */

/**
 * Load dashboard data for the selected student
 */
async function loadDashboardData(student) {
    try {
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
    // Get all navigation cards
    const navCards = {
        'nav-transactions': '../transactions/index.html',
        'nav-concessions': '../concessions/index.html',
        'nav-checkins': '../check-ins/index.html',
        'nav-profile': '../profile/index.html',
        'nav-purchase': '../purchase/index.html',
        'nav-prepay': '../prepay/index.html'
    };
    
    // Setup click handlers for each card
    for (const [cardId, url] of Object.entries(navCards)) {
        const card = document.getElementById(cardId);
        if (card) {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Student ID should already be in sessionStorage from either:
                // 1. Admin selecting a student (window.selectedStudent)
                // 2. Regular student logging in (loadCurrentStudentData in auth-check.js)
                
                // Double-check and set from global variables if needed
                if (!sessionStorage.getItem('currentStudentId')) {
                    const student = window.selectedStudent || window.currentStudent;
                    if (student && student.id) {
                        sessionStorage.setItem('currentStudentId', student.id);
                    }
                }
                
                // Navigate to the page
                window.location.href = url;
            });
        }
    }
}

// Listen for student selection (from admin dropdown)
window.addEventListener('studentSelected', (event) => {
    if (event.detail && event.detail.student) {
        const student = event.detail.student;
        
        // Hide empty state
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'none';
        
        // Show dashboard
        const studentDashboard = document.getElementById('student-dashboard');
        if (studentDashboard) studentDashboard.style.display = 'block';
        
        // Update student name
        const studentNameEl = document.getElementById('dashboard-student-name');
        if (studentNameEl) studentNameEl.textContent = student.firstName;
        
        // Load dashboard data
        loadDashboardData(student);
    } else {
        // No student selected - show empty state
        const studentDashboard = document.getElementById('student-dashboard');
        if (studentDashboard) studentDashboard.style.display = 'none';
        
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'block';
    }
});

// Listen for student loaded event (when regular student logs in)
window.addEventListener('studentLoaded', (event) => {
    if (event.detail) {
        const student = event.detail;
        
        // Hide empty state
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'none';
        
        // Show dashboard
        const studentDashboard = document.getElementById('student-dashboard');
        if (studentDashboard) studentDashboard.style.display = 'block';
        
        // Update student name
        const studentNameEl = document.getElementById('dashboard-student-name');
        if (studentNameEl) studentNameEl.textContent = student.firstName;
        
        // Load dashboard data
        loadDashboardData(student);
    }
});

// Setup navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavigationCards);
} else {
    // DOM already loaded
    setupNavigationCards();
}
