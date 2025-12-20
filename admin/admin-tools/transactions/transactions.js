/**
 * Transactions Page Main Controller
 * Coordinates all transaction page functionality
 */

// Global state
let allTransactions = [];
let filteredTransactions = [];
let currentSort = { field: 'date', direction: 'desc' };
let dateFromPicker = null;
let dateToPicker = null;

/**
 * Convert date from d/mm/yyyy format to Date object
 */
function parseDateFromInput(dateString) {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Format Date object to YYYY-MM-DD string for filtering
 */
function formatDateToYYYYMMDD(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Check if current user is super admin (dance@urbanswing.co.nz)
 */
function isSuperAdmin() {
    return auth.currentUser && auth.currentUser.email === 'dance@urbanswing.co.nz';
}

// Initialize when DOM is ready and user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    // Wait for authentication before initializing
    if (typeof initializeAuth === 'function') {
        initializeAuth().then(() => {
            initializePage();
        }).catch((error) => {
            console.error('Authentication failed:', error);
        });
    } else {
        // Fallback if initializeAuth not available
        setTimeout(initializePage, 500);
    }
});

/**
 * Initialize the page
 */
function initializePage() {
    // User email is already populated by initializeAuth() in auth.js
    // No need to do it here
    
    // Initialize modals
    if (typeof initializePurchaseConcessionsModal === 'function') {
        initializePurchaseConcessionsModal();
    }
    if (typeof initializeCasualEntryModal === 'function') {
        initializeCasualEntryModal();
    }
    
    // Initialize student filter
    if (typeof initializeStudentFilter === 'function') {
        initializeStudentFilter();
    }
    
    // Initialize date pickers
    initializeDatePickers();
    
    setupEventListeners();
    setDefaultDateRange();
    loadTransactions();
}

/**
 * Initialize custom date pickers
 */
function initializeDatePickers() {
    // From Date picker
    dateFromPicker = new DatePicker('date-from', 'date-from-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow past dates
        onDateSelected: (date, formattedDate) => {
            applyFilters();
        }
    });
    
    // To Date picker (right-aligned)
    dateToPicker = new DatePicker('date-to', 'date-to-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow past dates
        onDateSelected: (date, formattedDate) => {
            applyFilters();
        }
    });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Logout button handler is set up by header-configurator.js
    
    // Filters
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
    document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);
    document.getElementById('show-reversed-toggle').addEventListener('change', applyFilters);
    
    // Sort
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.getAttribute('data-sort')));
    });
    
    // Modal
    document.getElementById('cancel-delete-btn')?.addEventListener('click', closeDeleteModal);
}

/**
 * Set default date range (last 30 days)
 */
function setDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Set dates using DatePicker instances
    if (dateFromPicker) {
        dateFromPicker.setDate(thirtyDaysAgo);
    }
    if (dateToPicker) {
        dateToPicker.setDate(today);
    }
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
    const dateFromInput = document.getElementById('date-from').value;
    const dateToInput = document.getElementById('date-to').value;
    
    // Convert d/mm/yyyy to yyyy-mm-dd format
    const dateFrom = dateFromInput ? formatDateToYYYYMMDD(parseDateFromInput(dateFromInput)) : '';
    const dateTo = dateToInput ? formatDateToYYYYMMDD(parseDateFromInput(dateToInput)) : '';
    
    const typeFilter = document.getElementById('transaction-type').value;
    const paymentMethodFilter = document.getElementById('payment-method-filter').value;
    const showReversed = document.getElementById('show-reversed-toggle').checked;
    const studentId = typeof getSelectedStudentId === 'function' ? getSelectedStudentId() : null;
    
    filteredTransactions = applyTransactionFilters(allTransactions, dateFrom, dateTo, typeFilter, paymentMethodFilter, showReversed, studentId);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
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
    document.getElementById('payment-method-filter').value = 'all';
    document.getElementById('show-reversed-toggle').checked = false;
    
    // Clear student filter
    if (typeof clearStudentFilter === 'function') {
        clearStudentFilter();
    }
    
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
 * Callback when transaction is deleted/reversed
 */
window.onTransactionDeleted = function(transactionId) {
    // Update the reversed flag in the local data
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (transaction) {
        transaction.reversed = true;
    }
    
    // Reapply filters (this will hide reversed transactions unless the toggle is on)
    applyFilters();
};

// Expose functions needed by other modules
// Note: toggleInvoiced and confirmDelete are exposed in actions.js (module)
window.editTransaction = editTransaction;

/**
 * Edit a transaction
 */
async function editTransaction(transaction) {
    try {
        // Fetch the full transaction data from Firestore
        const transactionDoc = await firebase.firestore()
            .collection('transactions')
            .doc(transaction.id)
            .get();
        
        if (!transactionDoc.exists) {
            showSnackbar('Transaction not found', 'error');
            return;
        }
        
        const transactionData = transactionDoc.data();
        
        // Handle based on transaction type
        if (transaction.type === 'concession-gift') {
            showSnackbar('Gifted concessions cannot be edited. Please reverse and create a new gift if needed.', 'info');
            return;
        } else if (transaction.type === 'casual' || transaction.type === 'casual-student') {
            await editCasualEntryTransaction(transaction, transactionData);
        } else if (transaction.type === 'concession-purchase') {
            await editConcessionPurchaseTransaction(transaction, transactionData);
        }
        
    } catch (error) {
        console.error('Error editing transaction:', error);
        showSnackbar('Error opening edit modal', 'error');
    }
}

/**
 * Edit a casual entry transaction
 */
async function editCasualEntryTransaction(transaction, transactionData) {
    // checkinId is optional - online prepaid entries won't have one
    const checkinId = transactionData.checkinId || null;
    
    // Open the casual entry edit modal
    if (typeof openCasualEntryModal === 'function') {
        await openCasualEntryModal(
            transaction.id,                    // transactionId
            checkinId,                         // checkinId (can be null for online prepaid)
            transaction.studentId,             // studentId
            transaction.studentName,           // studentName
            transaction.date,                  // entryDate
            transaction.paymentMethod,         // paymentMethod
            transaction.amount,                // amount
            async () => {                      // callback
                // Reload transactions after update
                await loadTransactions();
                showSnackbar('Transaction updated successfully', 'success');
            },
            null                               // parentModalId
        );
    }
}

/**
 * Edit a concession purchase transaction
 */
async function editConcessionPurchaseTransaction(transaction, transactionData) {
    // Open the purchase modal in edit mode
    if (typeof openPurchaseConcessionsModalForEdit === 'function') {
        await openPurchaseConcessionsModalForEdit(
            transaction.studentId,
            transaction.id,
            transactionData.packageId,
            transaction.paymentMethod,
            transaction.date,
            null  // No parent modal for transactions page
        );
    }
}

/**
 * Open Purchase Concessions modal in edit mode for transactions page
 */
async function openPurchaseConcessionsModalForEdit(studentId, transactionId, packageId, paymentMethod, transactionDate, parentModalId) {
    // Open the modal first (pass studentId but it won't need to look up the student)
    if (typeof openPurchaseConcessionsModal === 'function') {
        // Don't pass studentId to openPurchaseConcessionsModal since it will try to call findStudentById
        // We'll manually populate the student info instead
        await openPurchaseConcessionsModal(null, null, parentModalId, null);
    }
    
    // Wait for modal to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Manually populate student info if we have the student data
    const transaction = filteredTransactions.find(t => t.id === transactionId);
    if (transaction && transaction.studentName) {
        document.getElementById('purchase-student-name').textContent = transaction.studentName;
        // Don't show email since we don't have it in transactions
        const emailElement = document.getElementById('purchase-student-email');
        if (emailElement) {
            emailElement.style.display = 'none';
        }
        document.getElementById('purchase-student-info').style.display = 'block';
    }
    
    // Pre-populate the form fields
    const datePicker = document.getElementById('purchase-date-picker');
    const packageSelect = document.getElementById('purchase-package-select');
    const paymentSelect = document.getElementById('purchase-payment-select');
    const confirmBtn = document.getElementById('confirm-purchase-concessions-btn');
    
    if (datePicker && transactionDate) {
        // Format date as d/mm/yyyy for display (matching DatePicker format)
        const day = transactionDate.getDate();
        const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
        const year = transactionDate.getFullYear();
        const dateStr = `${day}/${month}/${year}`;
        datePicker.value = dateStr;
        // Trigger button update since we're manually setting the value
        if (typeof updatePurchaseButton === 'function') {
            updatePurchaseButton();
        }
    }
    
    if (packageSelect && packageId) {
        packageSelect.value = packageId;
        packageSelect.dispatchEvent(new Event('change'));
    }
    
    if (paymentSelect && paymentMethod) {
        const methodValue = paymentMethod.toLowerCase().replace(/\s+/g, '-');
        paymentSelect.value = methodValue;
        paymentSelect.dispatchEvent(new Event('change'));
    }
    
    // Change the modal title
    const modalTitle = document.querySelector('#purchase-concessions-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Transaction';
    }
    
    // Change the button text
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-save"></i> Update Transaction';
    }
    
    // Replace click handler
    if (confirmBtn) {
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        newBtn.addEventListener('click', async () => {
            await handleTransactionUpdate(transactionId, studentId);
        });
    }
}

/**
 * Handle transaction update for concession purchases
 */
async function handleTransactionUpdate(transactionId, studentId) {
    const packageId = document.getElementById('purchase-package-select').value;
    const paymentMethod = document.getElementById('purchase-payment-select').value;
    const purchaseDate = document.getElementById('purchase-date-picker').value;
    
    if (!packageId || !paymentMethod || !purchaseDate) {
        showSnackbar('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Parse date from d/mm/yyyy format
        const [day, month, year] = purchaseDate.split('/').map(Number);
        const parsedDate = new Date(year, month - 1, day, 12, 0, 0);
        
        // Get package data
        const packageData = typeof getConcessionPackageById === 'function' 
            ? getConcessionPackageById(packageId) 
            : null;
        
        if (!packageData) {
            throw new Error('Package not found');
        }
        
        // Update the transaction in Firestore
        await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .update({
                transactionDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                packageId: packageId,
                packageName: packageData.name,
                numberOfClasses: packageData.numberOfClasses,
                amountPaid: packageData.price,
                paymentMethod: paymentMethod,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Find and update the associated concession block
        const blocksSnapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('transactionId', '==', transactionId)
            .get();
        
        if (!blocksSnapshot.empty) {
            const blockDoc = blocksSnapshot.docs[0];
            const blockData = blockDoc.data();
            
            // Calculate new expiry date
            const newExpiryDate = new Date(parsedDate.getTime());
            newExpiryDate.setMonth(newExpiryDate.getMonth() + packageData.expiryMonths);
            
            // Calculate the difference in classes to update student balance
            const oldQuantity = blockData.originalQuantity;
            const usedClasses = oldQuantity - blockData.remainingQuantity;
            const newQuantity = packageData.numberOfClasses;
            const balanceDiff = newQuantity - oldQuantity;
            
            // Update the concession block
            await firebase.firestore()
                .collection('concessionBlocks')
                .doc(blockDoc.id)
                .update({
                    packageId: packageId,
                    packageName: packageData.name,
                    originalQuantity: newQuantity,
                    remainingQuantity: newQuantity - usedClasses,
                    purchaseDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                    expiryDate: firebase.firestore.Timestamp.fromDate(newExpiryDate),
                    price: packageData.price,
                    paymentMethod: paymentMethod,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Update student's concession balance if the number of classes changed
            if (balanceDiff !== 0) {
                await firebase.firestore()
                    .collection('students')
                    .doc(studentId)
                    .update({
                        concessionBalance: firebase.firestore.FieldValue.increment(balanceDiff),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }
        }
        
        showLoading(false);
        
        // Close the purchase modal
        if (typeof closePurchaseConcessionsModal === 'function') {
            closePurchaseConcessionsModal();
        }
        
        showSnackbar('Transaction updated successfully', 'success');
        
        // Reload transactions
        await loadTransactions();
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        showLoading(false);
        showSnackbar('Error updating transaction: ' + error.message, 'error');
    }
}
