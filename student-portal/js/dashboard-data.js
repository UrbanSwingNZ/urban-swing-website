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
