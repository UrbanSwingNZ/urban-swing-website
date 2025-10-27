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
    `;
    
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
