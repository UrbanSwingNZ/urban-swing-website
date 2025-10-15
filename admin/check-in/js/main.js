/**
 * main.js - Check-in application entry point
 * Initializes all modules and coordinates startup
 */

/**
 * Initialize the check-in application
 */
async function initializeApp() {
    try {
        showLoading();
        
        // Initialize authentication
        await initializeAuth();
        
        // Load students data
        await loadStudents();
        
        // Load today's check-ins
        await loadTodaysCheckins();
        
        // Initialize reusable purchase concessions modal
        initializePurchaseConcessionsModal();
        
        // Initialize modal event listeners
        initializeModalListeners();
        initializeCheckinModalListeners();
        initializeHistoryModalListeners();
        
        // Initialize nav button event listeners
        initializeNavListeners();
        
        // Hide loading indicator
        showLoading(false);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Initialize navigation button listeners
 */
function initializeNavListeners() {
    // Check-in button - opens modal
    const checkinBtn = document.getElementById('checkin-btn');
    if (checkinBtn) {
        checkinBtn.addEventListener('click', () => openCheckinModal());
    }
    
    // History button
    const historyBtn = document.getElementById('view-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', openHistoryModal);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

/**
 * Initialize modal listeners
 */
function initializeModalListeners() {
    // Check-in modal close buttons
    const checkinCloseBtn = document.querySelector('#checkin-modal .close-modal');
    if (checkinCloseBtn) {
        checkinCloseBtn.addEventListener('click', closeCheckinModal);
    }
    
    const checkinCancelBtn = document.querySelector('#checkin-modal .btn-secondary');
    if (checkinCancelBtn) {
        checkinCancelBtn.addEventListener('click', closeCheckinModal);
    }
    
    // Purchase modal close buttons
    const purchaseCloseBtn = document.querySelector('#purchase-modal .close-modal');
    if (purchaseCloseBtn) {
        purchaseCloseBtn.addEventListener('click', closePurchaseModal);
    }
    
    const purchaseCancelBtn = document.querySelector('#purchase-modal .btn-secondary');
    if (purchaseCancelBtn) {
        purchaseCancelBtn.addEventListener('click', closePurchaseModal);
    }
    
    // History modal close button
    const historyCloseBtn = document.querySelector('#history-modal .close-modal');
    if (historyCloseBtn) {
        historyCloseBtn.addEventListener('click', closeHistoryModal);
    }
    
    // Check-in form submit
    const checkinForm = document.getElementById('checkin-form');
    if (checkinForm) {
        checkinForm.addEventListener('submit', handleCheckinSubmit);
    }
    
    // Purchase form submit
    const purchaseForm = document.getElementById('purchase-form');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', handlePurchaseSubmit);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
