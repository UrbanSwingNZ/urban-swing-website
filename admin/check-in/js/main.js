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
        
        // Initialize date picker
        initializeDatePicker();
        
        // Initialize casual rate display
        if (typeof initializeCasualRateDisplay === 'function') {
            await initializeCasualRateDisplay();
        }
        
        // Load students data
        await loadStudents();
        
        // Load today's check-ins
        await loadTodaysCheckins();
        
        // Load today's transactions
        if (typeof loadCheckinTransactions === 'function') {
            await loadCheckinTransactions();
        }
        
        // Initialize reusable purchase concessions modal
        initializePurchaseConcessionsModal();
        initializeAddConcessionModal();
        
        // Initialize modal event listeners
        initializeModalListeners();
        initializeCheckinModalListeners();
        initializeHistoryModalListeners();
        
        // Initialize nav button event listeners
        initializeNavListeners();
        
        // Initialize accordions
        initializeAccordions();
        
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
    
    // Register Student button - navigates to student database
    const registerBtn = document.getElementById('register-student-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            window.location.href = '../../student-portal/register.html';
        });
    }
    
    // History button
    const historyBtn = document.getElementById('view-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', openHistoryModal);
    }
    
    // Show Reversed Checkins toggle
    const showReversedToggle = document.getElementById('show-reversed-checkins-toggle');
    if (showReversedToggle) {
        showReversedToggle.addEventListener('change', toggleShowReversedCheckins);
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
