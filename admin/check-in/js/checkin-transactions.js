/**
 * checkin-transactions.js
 * Handles loading and displaying financial transactions for the selected check-in date
 */

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
            } else if (transactionType === 'casual-entry' || transactionType === 'entry') {
                transactionType = 'casual-entry';
                typeName = 'Casual Entry';
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
                paymentMethod: paymentMethod,
                invoiced: data.invoiced || false,
                reversed: data.reversed || false
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
    } else if (transaction.type === 'casual-entry') {
        typeBadgeClass = 'casual-entry';
    } else {
        typeBadgeClass = 'other';
    }
    
    // Add reversed badge if transaction is reversed
    const reversedBadge = transaction.reversed ? '<span class="type-badge reversed">REVERSED</span> ' : '';
    
    row.innerHTML = `
        <td>${formatDate(transaction.date)}</td>
        <td><strong>${escapeHtml(transaction.studentName)}</strong></td>
        <td>${reversedBadge}<span class="type-badge ${typeBadgeClass}">${transaction.typeName}</span></td>
        <td class="amount-cell">${formatCurrency(transaction.amount)}</td>
        <td class="payment-amount ${transaction.cash > 0 ? '' : 'empty'}">
            ${transaction.cash > 0 ? formatCurrency(transaction.cash) : '-'}
        </td>
        <td class="payment-amount ${transaction.eftpos > 0 ? '' : 'empty'}">
            ${transaction.eftpos > 0 ? formatCurrency(transaction.eftpos) : '-'}
        </td>
        <td class="payment-amount ${transaction.bankTransfer > 0 ? '' : 'empty'}">
            ${transaction.bankTransfer > 0 ? formatCurrency(transaction.bankTransfer) : '-'}
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn-icon btn-invoice ${transaction.invoiced ? 'invoiced' : ''}" 
                        title="${transaction.invoiced ? 'Mark as Not Invoiced' : 'Mark as Invoiced'}"
                        data-id="${transaction.id}"
                        data-collection="${transaction.collection}"
                        ${transaction.reversed ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-file-invoice"></i>
                </button>
                <button class="btn-icon btn-edit" 
                        title="Edit Transaction"
                        ${transaction.reversed ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" 
                        title="${transaction.reversed ? 'Cannot delete reversed transaction' : 'Delete Transaction'}"
                        data-id="${transaction.id}"
                        data-collection="${transaction.collection}"
                        data-student="${escapeHtml(transaction.studentName)}"
                        data-amount="${transaction.amount}"
                        ${transaction.reversed ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </td>
    `;
    
    // Add event listeners
    const invoiceBtn = row.querySelector('.btn-invoice');
    invoiceBtn.addEventListener('click', () => toggleCheckinTransactionInvoiced(transaction));
    
    const editBtn = row.querySelector('.btn-edit');
    if (!transaction.reversed) {
        editBtn.addEventListener('click', () => editCheckinTransaction(transaction));
    }
    
    const deleteBtn = row.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => confirmDeleteCheckinTransaction(transaction));
    
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
    const totalBank = transactions.reduce((sum, t) => sum + t.bankTransfer, 0);
    
    document.getElementById('checkin-total-count').textContent = totalCount;
    document.getElementById('checkin-total-amount').textContent = formatCurrency(totalAmount);
    document.getElementById('checkin-total-cash').textContent = formatCurrency(totalCash);
    document.getElementById('checkin-total-eftpos').textContent = formatCurrency(totalEftpos);
    document.getElementById('checkin-total-bank').textContent = formatCurrency(totalBank);
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

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
 * Edit transaction (placeholder - not yet implemented)
 */
function editCheckinTransaction(transaction) {
    showSnackbar('Edit functionality coming soon', 'info');
}

/**
 * Confirm transaction deletion
 */
function confirmDeleteCheckinTransaction(transaction) {
    const modal = document.getElementById('delete-modal');
    const titleEl = document.getElementById('delete-modal-title');
    const messageEl = document.getElementById('delete-modal-message');
    const infoEl = document.getElementById('delete-modal-info');
    const btnTextEl = document.getElementById('delete-modal-btn-text');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    // Customize modal for transaction deletion
    titleEl.textContent = 'Delete Transaction';
    messageEl.textContent = 'Are you sure you want to delete this transaction?';
    infoEl.innerHTML = `<strong>${transaction.studentName}</strong> - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}`;
    btnTextEl.textContent = 'Delete Transaction';
    
    // Remove any existing event listeners by replacing the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add click handler for confirm button
    newConfirmBtn.addEventListener('click', () => {
        deleteCheckinTransaction(transaction);
    });
    
    modal.style.display = 'flex';
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
        
        closeDeleteModal();
        
        // Reload transactions
        await loadCheckinTransactions();
        
        showSnackbar('Transaction reversed successfully', 'success');
        
    } catch (error) {
        console.error('Error reversing transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
        closeDeleteModal();
    }
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
