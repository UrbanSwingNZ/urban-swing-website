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
        window.location.href = '../transactions/index.html';
    });
    
    // My Concessions
    document.getElementById('nav-concessions').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../concessions/index.html';
    });
    
    // Check-In History
    document.getElementById('nav-checkins').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../check-ins/index.html';
    });
    
    // Profile
    document.getElementById('nav-profile').addEventListener('click', (e) => {
        e.preventDefault();
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
