/**
 * Transactions Page Main Controller
 * Coordinates all transaction page functionality
 */

// Global state
let allTransactions = [];
let filteredTransactions = [];
let currentSort = { field: 'date', direction: 'desc' };

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializePage, 500);
});

/**
 * Initialize the page
 */
function initializePage() {
    setupEventListeners();
    setDefaultDateRange();
    loadTransactions();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    
    // Filters
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
    document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);
    
    // Sort
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.getAttribute('data-sort')));
    });
    
    // Modal
    document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);
}

/**
 * Set default date range (last 30 days)
 */
function setDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('date-from').value = formatDateForInput(thirtyDaysAgo);
    document.getElementById('date-to').value = formatDateForInput(today);
}

/**
 * Load all transactions from Firestore
 */
async function loadTransactions() {
    showLoading(true);
    
    try {
        allTransactions = await loadAllTransactions();
        applyFilters();
        
        showLoading(false);
        document.getElementById('main-container').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showSnackbar('Error loading transactions: ' + error.message, 'error');
        showLoading(false);
    }
}

/**
 * Apply filters to transactions
 */
function applyFilters() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const typeFilter = document.getElementById('transaction-type').value;
    
    filteredTransactions = applyTransactionFilters(allTransactions, dateFrom, dateTo, typeFilter);
    sortFilteredTransactions();
    displayFilteredTransactions();
    updateSummary();
}

/**
 * Reset filters to defaults
 */
function resetFilters() {
    setDefaultDateRange();
    document.getElementById('transaction-type').value = 'all';
    applyFilters();
}

/**
 * Handle column sort
 */
function handleSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = field === 'date' ? 'desc' : 'asc';
    }
    
    sortFilteredTransactions();
    displayFilteredTransactions();
}

/**
 * Sort filtered transactions
 */
function sortFilteredTransactions() {
    filteredTransactions = sortTransactions(filteredTransactions, currentSort.field, currentSort.direction);
}

/**
 * Display filtered transactions
 */
function displayFilteredTransactions() {
    displayTransactions(filteredTransactions, currentSort);
}

/**
 * Update summary statistics
 */
function updateSummary() {
    const summary = calculateSummary(filteredTransactions);
    updateSummaryDisplay(summary);
}

/**
 * Callback when transaction is deleted
 */
window.onTransactionDeleted = function(transactionId) {
    allTransactions = allTransactions.filter(t => t.id !== transactionId);
    filteredTransactions = filteredTransactions.filter(t => t.id !== transactionId);
    displayFilteredTransactions();
    updateSummary();
};

// Expose functions needed by other modules
window.toggleInvoiced = toggleInvoiced;
window.confirmDelete = confirmDelete;
