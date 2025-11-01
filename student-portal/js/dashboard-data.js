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
        alert('Transaction History page coming soon!\n\nThis will show all purchases and payments.');
    });
    
    // My Concessions
    document.getElementById('nav-concessions').addEventListener('click', (e) => {
        e.preventDefault();
        alert('My Concessions page coming soon!\n\nThis will show active concession blocks with balances and expiry dates.');
    });
    
    // Check-In History
    document.getElementById('nav-checkins').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Check-In History page coming soon!\n\nThis will show all class attendance records.');
    });
    
    // Profile
    document.getElementById('nav-profile').addEventListener('click', (e) => {
        e.preventDefault();
        // Store selected student ID in sessionStorage if viewing as admin
        if (typeof selectedStudent !== 'undefined' && selectedStudent) {
            sessionStorage.setItem('selectedStudentId', selectedStudent.id);
        }
        window.location.href = '../profile/index.html';
    });
    
    // Disabled cards (prepay and purchase) - do nothing
    document.getElementById('nav-prepay').addEventListener('click', (e) => {
        e.preventDefault();
    });
    
    document.getElementById('nav-purchase').addEventListener('click', (e) => {
        e.preventDefault();
    });
}

// Setup navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupNavigationCards();
});
