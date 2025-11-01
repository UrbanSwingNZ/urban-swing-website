/**
 * Dashboard Data Loader
 * Loads and displays student dashboard statistics and information
 */

/**
 * Load dashboard data for the selected student
 */
async function loadDashboardData(student) {
    try {
        console.log('Loading dashboard data for:', student.firstName, student.lastName);
        
        // Load all data in parallel
        await Promise.all([
            loadActiveConcessions(student.id),
            loadTotalCheckins(student.id),
            loadAccountBalance(student.id)
        ]);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

/**
 * Load active concessions count
 */
async function loadActiveConcessions(studentId) {
    try {
        const concessionsSnapshot = await window.db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('balance', '>', 0)
            .get();
        
        const activeCount = concessionsSnapshot.size;
        document.getElementById('active-concessions').textContent = activeCount;
        
    } catch (error) {
        console.error('Error loading active concessions:', error);
        document.getElementById('active-concessions').textContent = 'Error';
    }
}

/**
 * Load total check-ins count
 */
async function loadTotalCheckins(studentId) {
    try {
        const checkinsSnapshot = await window.db.collection('checkins')
            .where('studentId', '==', studentId)
            .get();
        
        const totalCount = checkinsSnapshot.size;
        document.getElementById('total-checkins').textContent = totalCount;
        
    } catch (error) {
        console.error('Error loading total check-ins:', error);
        document.getElementById('total-checkins').textContent = 'Error';
    }
}

/**
 * Load account balance (sum of active concession balances)
 */
async function loadAccountBalance(studentId) {
    try {
        const concessionsSnapshot = await window.db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('balance', '>', 0)
            .get();
        
        let totalBalance = 0;
        concessionsSnapshot.forEach(doc => {
            const data = doc.data();
            totalBalance += (data.balance || 0);
        });
        
        // For now, display as class count rather than dollar amount
        // Once we have pricing info, we can calculate monetary value
        document.getElementById('account-balance').textContent = `${totalBalance} classes`;
        
    } catch (error) {
        console.error('Error loading account balance:', error);
        document.getElementById('account-balance').textContent = 'Error';
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
        alert('Profile & Settings page coming soon!\n\nThis will allow viewing and updating student information.');
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
