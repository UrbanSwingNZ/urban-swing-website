/**
 * checkin-transactions.js
 * Handles loading and displaying financial transactions for the selected check-in date
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

let checkinTransactions = [];

/**
 * Load transactions for the selected check-in date
 */
async function loadCheckinTransactions() {
    try {
        // Get the selected check-in date
        const selectedDate = getSelectedCheckinDate();
        
        // Start and end of selected day
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Query Firestore for transactions on selected date
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('transactionDate', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
            .where('transactionDate', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
            .get();
        
        // Convert to array and normalize data
        const transactionPromises = snapshot.docs.map(async doc => {
            const data = doc.data();
            const date = data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate);
            const paymentMethod = (data.paymentMethod || '').toLowerCase();
            const amount = data.amountPaid || 0;
            
            // Fetch student name
            let studentName = data.studentName || 'Unknown';
            if (data.studentId) {
                try {
                    const studentDoc = await firebase.firestore()
                        .collection('students')
                        .doc(data.studentId)
                        .get();
                    
                    if (studentDoc.exists) {
                        const studentData = studentDoc.data();
                        studentName = `${studentData.firstName} ${studentData.lastName}`;
                    }
                } catch (error) {
                    console.error('Error fetching student name:', error);
                }
            }
            
            // Determine transaction type and display name
            let transactionType = data.type || 'concession-purchase';
            let typeName;
            
            if (transactionType === 'concession-purchase' || transactionType === 'purchase') {
                transactionType = 'concession-purchase';
                typeName = 'Concession Purchase';
            } else if (transactionType === 'concession-gift') {
                typeName = 'Gifted Concessions';
            } else if (transactionType === 'casual-entry' || transactionType === 'entry' || transactionType === 'casual' || transactionType === 'casual-student') {
                // For casual-entry transactions, check the entryType field (if it exists) to distinguish casual vs casual-student
                // This handles both old transactions (type='casual-entry') and new ones (type='casual' or 'casual-student')
                if (data.entryType === 'casual-student' || transactionType === 'casual-student') {
                    transactionType = 'casual-student';
                    typeName = 'Casual Student';
                } else {
                    transactionType = 'casual';
                    typeName = 'Casual Entry';
                }
            } else {
                typeName = 'Transaction';
            }
            
            return {
                id: doc.id,
                collection: 'transactions', // Add collection for actions
                type: transactionType,
                typeName: typeName,
                date: date,
                studentName: studentName,
                studentId: data.studentId || null,
                amount: amount,
                cash: paymentMethod === 'cash' ? amount : 0,
                eftpos: paymentMethod === 'eftpos' ? amount : 0,
                bankTransfer: (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') ? amount : 0,
                online: paymentMethod === 'stripe' ? amount : 0,
                paymentMethod: paymentMethod,
                invoiced: data.invoiced || false,
                reversed: data.reversed || false,
                stripeCustomerId: data.stripeCustomerId || null
            };
        });
        
        checkinTransactions = await Promise.all(transactionPromises);
        
        // Filter out reversed transactions by default
        const showReversed = document.getElementById('show-reversed-checkins-toggle')?.checked || false;
        const transactionsToDisplay = showReversed 
            ? checkinTransactions 
            : checkinTransactions.filter(t => !t.reversed);
        
        // Sort by date descending
        transactionsToDisplay.sort((a, b) => b.date - a.date);
        
        displayCheckinTransactions(transactionsToDisplay);
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        checkinTransactions = [];
        displayCheckinTransactions([]);
    }
}

/**
 * Display transactions in the table
 */
function displayCheckinTransactions(transactions) {
    const tbody = document.getElementById('checkin-transactions-tbody');
    const table = document.getElementById('checkin-transactions-table');
    const emptyState = document.getElementById('transactions-empty-state');
    
    tbody.innerHTML = '';
    
    if (transactions.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        updateCheckinTransactionSummary([]);
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    transactions.forEach(transaction => {
        const row = createCheckinTransactionRow(transaction);
        tbody.appendChild(row);
    });
    
    updateCheckinTransactionSummary(transactions);
}

/**
 * Create a table row for a transaction
 */
function createCheckinTransactionRow(transaction) {
    const row = document.createElement('tr');
    
    // Add reversed class if transaction is reversed
    if (transaction.reversed) {
        row.classList.add('reversed-transaction');
    }
    
    // Determine badge class based on transaction type
    let typeBadgeClass;
    if (transaction.type === 'concession-purchase') {
        typeBadgeClass = 'concession';
    } else if (transaction.type === 'concession-gift') {
        typeBadgeClass = 'gift';
    } else if (transaction.type === 'casual') {
        typeBadgeClass = 'casual';
    } else if (transaction.type === 'casual-student') {
        typeBadgeClass = 'casual-student';
    } else {
        typeBadgeClass = 'other';
    }
    
    // Add reversed badge if transaction is reversed
    const reversedBadge = transaction.reversed ? '<span class="type-badge reversed">REVERSED</span> ' : '';
    
    // Get payment badge HTML
    const paymentBadgeHTML = getCheckinPaymentBadgeHTML(transaction);
    
    // Determine if delete button should be shown
    // Super admin can always delete, front desk can only delete today's transactions
    const canDelete = isSuperAdmin() || (typeof isSelectedDateToday === 'function' && isSelectedDateToday());
    
    row.innerHTML = `
        <td data-label="Date">${formatDate(transaction.date)}</td>
        <td data-label="Student"><strong>${escapeHtml(transaction.studentName)}</strong></td>
        <td data-label="Type">${reversedBadge}<span class="type-badge ${typeBadgeClass}">${transaction.typeName}</span></td>
        <td data-label="Amount" class="amount-cell">${formatCurrency(transaction.amount)}</td>
        <td data-label="Payment Method">${paymentBadgeHTML}</td>
        <td data-label="Actions">
            <div class="action-buttons">
                ${isSuperAdmin() ? `<button class="btn-icon btn-invoice ${transaction.invoiced ? 'invoiced' : ''}" 
                        title="${transaction.invoiced ? 'Mark as Not Invoiced' : 'Mark as Invoiced'}"
                        data-id="${transaction.id}"
                        data-collection="${transaction.collection}"
                        ${transaction.reversed ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-file-invoice"></i>
                </button>` : ''}
                <button class="btn-icon btn-edit" 
                        title="Edit Transaction"
                        ${transaction.reversed ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-edit"></i>
                </button>
                ${canDelete ? `<button class="btn-icon btn-delete" 
                        title="${transaction.reversed ? 'Cannot delete reversed transaction' : 'Delete Transaction'}"
                        data-id="${transaction.id}"
                        data-collection="${transaction.collection}"
                        data-student="${escapeHtml(transaction.studentName)}"
                        data-amount="${transaction.amount}"
                        ${transaction.reversed ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-trash-alt"></i>
                </button>` : ''}
            </div>
        </td>
    `;
    
    // Add event listeners
    const invoiceBtn = row.querySelector('.btn-invoice');
    if (invoiceBtn) {
        invoiceBtn.addEventListener('click', () => toggleCheckinTransactionInvoiced(transaction));
    }
    
    const editBtn = row.querySelector('.btn-edit');
    if (!transaction.reversed) {
        editBtn.addEventListener('click', () => editCheckinTransaction(transaction));
    }
    
    const deleteBtn = row.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => confirmDeleteCheckinTransaction(transaction));
    }
    
    return row;
}

/**
 * Update transaction summary statistics
 */
function updateCheckinTransactionSummary(transactions) {
    const totalCount = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalCash = transactions.reduce((sum, t) => sum + t.cash, 0);
    const totalEftpos = transactions.reduce((sum, t) => sum + t.eftpos, 0);
    const totalOnline = transactions.reduce((sum, t) => sum + t.online, 0);
    const totalBank = transactions.reduce((sum, t) => sum + t.bankTransfer, 0);
    
    document.getElementById('checkin-total-count').textContent = totalCount;
    document.getElementById('checkin-total-amount').textContent = formatCurrency(totalAmount);
    document.getElementById('checkin-total-cash').textContent = formatCurrency(totalCash);
    document.getElementById('checkin-total-eftpos').textContent = formatCurrency(totalEftpos);
    document.getElementById('checkin-total-online').textContent = formatCurrency(totalOnline);
    document.getElementById('checkin-total-bank').textContent = formatCurrency(totalBank);
}

/**
 * Get payment method badge HTML
 */
function getCheckinPaymentBadgeHTML(transaction) {
    // Check if online payment first (has stripeCustomerId)
    if (transaction.stripeCustomerId) {
        return '<span class="payment-badge online"><i class="fas fa-globe"></i> Online</span>';
    }
    
    const paymentMethod = String(transaction.paymentMethod || '').toLowerCase();
    
    if (paymentMethod === 'cash') {
        return '<span class="payment-badge cash"><i class="fas fa-money-bill-wave"></i> Cash</span>';
    } else if (paymentMethod === 'eftpos') {
        return '<span class="payment-badge eftpos"><i class="fas fa-credit-card"></i> EFTPOS</span>';
    } else if (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') {
        return '<span class="payment-badge bank"><i class="fas fa-building-columns"></i> Bank Transfer</span>';
    } else if (paymentMethod === 'none') {
        return '<span class="payment-badge na">N/A</span>';
    } else {
        return '<span class="payment-badge unknown"><i class="fas fa-question-circle"></i> Unknown</span>';
    }
}

// Import centralized utilities
import { formatCurrency } from '/js/utils/index.js';

/**
 * Refresh transactions display (called when toggle changes)
 */
function refreshCheckinTransactionsDisplay() {
    const showReversed = document.getElementById('show-reversed-checkins-toggle')?.checked || false;
    const transactionsToDisplay = showReversed 
        ? checkinTransactions 
        : checkinTransactions.filter(t => !t.reversed);
    
    transactionsToDisplay.sort((a, b) => b.date - a.date);
    displayCheckinTransactions(transactionsToDisplay);
}

/**
 * Toggle invoiced status for a transaction
 */
async function toggleCheckinTransactionInvoiced(transaction) {
    try {
        const newStatus = !transaction.invoiced;
        
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                invoiced: newStatus
            });
        
        // Update local data
        transaction.invoiced = newStatus;
        
        // Update the button in the table
        const btn = document.querySelector(`.btn-invoice[data-id="${transaction.id}"]`);
        if (btn) {
            if (newStatus) {
                btn.classList.add('invoiced');
                btn.title = 'Mark as Not Invoiced';
            } else {
                btn.classList.remove('invoiced');
                btn.title = 'Mark as Invoiced';
            }
        }
        
        showSnackbar(`Transaction marked as ${newStatus ? 'invoiced' : 'not invoiced'}`, 'success');
        
    } catch (error) {
        console.error('Error toggling invoiced status:', error);
        showSnackbar('Error updating invoice status: ' + error.message, 'error');
    }
}

/**
 * Edit transaction
 */
async function editCheckinTransaction(transaction) {
    if (transaction.type === 'concession-purchase') {
        // Fetch the full transaction data from Firestore to get packageId
        try {
            const transactionDoc = await firebase.firestore()
                .collection('transactions')
                .doc(transaction.id)
                .get();
            
            if (!transactionDoc.exists) {
                showSnackbar('Transaction not found', 'error');
                return;
            }
            
            const transactionData = transactionDoc.data();
            
            // Open purchase concessions modal for editing
            await editConcessionPurchaseTransaction(transaction, transactionData);
        } catch (error) {
            console.error('Error fetching transaction data:', error);
            showSnackbar('Error opening edit modal', 'error');
        }
    } else if (transaction.type === 'casual' || transaction.type === 'casual-student') {
        // Get checkinId - we need to fetch it from the checkins collection
        let checkinId = null;
        try {
            const checkinSnapshot = await firebase.firestore()
                .collection('checkins')
                .where('studentId', '==', transaction.studentId)
                .where('checkinDate', '==', firebase.firestore.Timestamp.fromDate(transaction.date))
                .get();
            
            if (!checkinSnapshot.empty) {
                checkinId = checkinSnapshot.docs[0].id;
            }
        } catch (error) {
            console.error('Error fetching checkin:', error);
        }
        
        // Open casual entry modal for editing with callback to reload transactions
        await openCasualEntryModal(
            transaction.id,                    // transactionId
            checkinId,                         // checkinId
            transaction.studentId,             // studentId
            transaction.studentName,           // studentName
            transaction.date,                  // entryDate
            transaction.paymentMethod,         // paymentMethod
            transaction.amount,                // amount
            async () => {                      // callback
                // Reload transactions after update
                await loadCheckinTransactions();
            },
            null                               // parentModalId
        );
    } else {
        showSnackbar('Cannot edit this transaction type', 'error');
    }
}

/**
 * Confirm transaction deletion
 */
function confirmDeleteCheckinTransaction(transaction) {
    // Format date as d/mm/yyyy
    const day = transaction.date.getDate();
    const month = transaction.date.getMonth() + 1;
    const year = transaction.date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    // Create and show delete confirmation modal
    const deleteModal = new ConfirmationModal({
        title: 'Delete Transaction',
        message: `
            <p>Are you sure you want to delete this transaction?</p>
            <div class="student-info-delete">
                <strong>${transaction.studentName}</strong><br>
                ${formattedDate} · ${formatCurrency(transaction.amount)}
            </div>
            <p class="text-muted" style="margin-top: 15px;">This action cannot be undone.</p>
        `,
        icon: 'fas fa-trash',
        variant: 'danger',
        confirmText: 'Delete Transaction',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            await deleteCheckinTransaction(transaction);
        }
    });
    
    deleteModal.show();
}

/**
 * Delete a transaction (mark as reversed)
 */
async function deleteCheckinTransaction(transaction) {
    try {
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Reload transactions
        await loadCheckinTransactions();
        
        showSnackbar('Transaction reversed successfully', 'success');
        
    } catch (error) {
        console.error('Error reversing transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
    }
}

/**
 * Edit a concession purchase transaction
 */
async function editConcessionPurchaseTransaction(transaction, transactionData) {
    // Open the purchase modal in edit mode
    if (typeof openPurchaseConcessionsModal === 'function') {
        // Open modal without student lookup
        await openPurchaseConcessionsModal(null, null, null, null);
    }
    
    // Wait for modal to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Manually populate student info
    document.getElementById('purchase-student-name').textContent = transaction.studentName;
    const emailElement = document.getElementById('purchase-student-email');
    if (emailElement) {
        emailElement.style.display = 'none';
    }
    document.getElementById('purchase-student-info').style.display = 'block';
    
    // Pre-populate the form fields
    const datePicker = document.getElementById('purchase-date-picker');
    const packageSelect = document.getElementById('purchase-package-select');
    const paymentSelect = document.getElementById('purchase-payment-select');
    
    if (datePicker && transaction.date) {
        // Format date as d/mm/yyyy for display (matching DatePicker format)
        const day = transaction.date.getDate();
        const month = String(transaction.date.getMonth() + 1).padStart(2, '0');
        const year = transaction.date.getFullYear();
        const dateStr = `${day}/${month}/${year}`;
        datePicker.value = dateStr;
        // Trigger button update since we're manually setting the value
        if (typeof updatePurchaseButton === 'function') {
            updatePurchaseButton();
        }
    }
    
    if (packageSelect && transactionData.packageId) {
        packageSelect.value = transactionData.packageId;
        // Trigger change event to update total
        packageSelect.dispatchEvent(new Event('change'));
    }
    
    if (paymentSelect && transaction.paymentMethod) {
        let paymentValue = transaction.paymentMethod.toLowerCase();
        // Handle 'stripe' payment method -> 'online'
        if (paymentValue === 'stripe') {
            paymentValue = 'online';
        }
        paymentSelect.value = paymentValue;
    }
    
    // Change the modal title to "Edit Transaction"
    const modalTitle = document.querySelector('#purchase-concessions-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Transaction';
    }
    
    // Change the button text to "Update Transaction"
    const confirmBtn = document.getElementById('confirm-purchase-concessions-btn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-save"></i> Update Transaction';
    }
    
    // Store transaction details for update
    window.editingTransactionId = transaction.id;
    window.editingStudentId = transaction.studentId;
    
    // Override the confirm button to update instead of create
    if (confirmBtn) {
        // Remove existing listeners and add new one
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        newBtn.addEventListener('click', async () => {
            await updateConcessionPurchase();
        });
    }
}

/**
 * Update an existing concession purchase transaction
 */
async function updateConcessionPurchase() {
    const transactionId = window.editingTransactionId;
    const studentId = window.editingStudentId;
    const packageId = document.getElementById('purchase-package-select').value;
    const paymentMethod = document.getElementById('purchase-payment-select').value;
    const purchaseDate = document.getElementById('purchase-date-picker').value;
    
    if (!packageId || !paymentMethod || !purchaseDate) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        // Convert payment method for storage (online -> stripe)
        let dbPaymentMethod = paymentMethod;
        if (paymentMethod === 'online') {
            dbPaymentMethod = 'stripe';
        }
        
        // Get package details to update amount
        const packageDoc = await firebase.firestore()
            .collection('concessionPackages')
            .doc(packageId)
            .get();
        
        if (!packageDoc.exists) {
            showSnackbar('Package not found', 'error');
            return;
        }
        
        const packageData = packageDoc.data();
        
        // Parse date from d/mm/yyyy format
        const [day, month, year] = purchaseDate.split('/').map(Number);
        const parsedDate = new Date(year, month - 1, day);
        
        // Update transaction
        await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .update({
                packageId: packageId,
                packageName: packageData.name,
                numberOfClasses: packageData.numberOfClasses,
                paymentMethod: dbPaymentMethod,
                transactionDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                amountPaid: packageData.price,
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
                    paymentMethod: dbPaymentMethod,
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
        
        // Close modal
        if (typeof closePurchaseConcessionsModal === 'function') {
            closePurchaseConcessionsModal();
        }
        
        // Clean up
        delete window.editingTransactionId;
        delete window.editingStudentId;
        
        // Reload transactions
        await loadCheckinTransactions();
        
        showSnackbar('Transaction updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        showSnackbar('Error updating transaction: ' + error.message, 'error');
    }
}

// Expose functions globally for use in other modules
window.loadCheckinTransactions = loadCheckinTransactions;

