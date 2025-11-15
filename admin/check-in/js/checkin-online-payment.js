/**
 * checkin-online-payment.js - Handle online payment validation and transaction lookup
 */

// Store the selected online transaction
let selectedOnlineTransaction = null;

/**
 * Validate online payment for a student on a specific date
 * Query for valid transactions that can be used for check-in
 */
async function validateOnlinePayment(studentId, checkinDate) {
    try {
        // Clear any previous selection
        selectedOnlineTransaction = null;
        
        // Format the check-in date for comparison
        const checkinDateStart = new Date(checkinDate);
        checkinDateStart.setHours(0, 0, 0, 0);
        
        const checkinDateEnd = new Date(checkinDate);
        checkinDateEnd.setHours(23, 59, 59, 999);
        
        // Define date range for search (±30 days from check-in date)
        const searchStartDate = new Date(checkinDate);
        searchStartDate.setDate(searchStartDate.getDate() - 30);
        
        const searchEndDate = new Date(checkinDate);
        searchEndDate.setDate(searchEndDate.getDate() + 30);
        
        // Query ALL transactions for this student (single where clause - no index needed)
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Filter transactions in JavaScript to avoid needing a compound index
        const validTransactions = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const transactionDate = data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate);
            
            // Check if this transaction qualifies:
            // 1. Type is 'casual' or 'casual-student' (not 'concession-purchase')
            // 2. Payment method includes 'online' or has stripeCustomerId
            // 3. Not reversed
            // 4. Not already used for check-in
            // 5. Within ±30 days of check-in date
            
            const isCasualType = data.type === 'casual' || data.type === 'casual-student';
            const isOnlinePayment = data.paymentMethod === 'online' || data.stripeCustomerId;
            const isNotReversed = !data.reversed;
            const isNotUsed = !data.usedForCheckin;
            const isInDateRange = transactionDate >= searchStartDate && transactionDate <= searchEndDate;
            
            if (isCasualType && isOnlinePayment && isNotReversed && isNotUsed && isInDateRange) {
                validTransactions.push({
                    id: doc.id,
                    date: transactionDate,
                    type: data.type,
                    amount: data.amountPaid || 0,
                    classDate: data.classDate?.toDate ? data.classDate.toDate() : transactionDate
                });
            }
        }
        
        // Sort by date (newest first)
        validTransactions.sort((a, b) => b.date - a.date);
        
        // Display the results
        displayOnlinePaymentStatus(validTransactions, checkinDateStart);
        
        return validTransactions;
        
    } catch (error) {
        console.error('Error validating online payment:', error);
        showOnlinePaymentError('Failed to validate online payment. Please try again.');
        return [];
    }
}

/**
 * Display online payment validation status
 * Show success/warning messages based on available transactions
 */
function displayOnlinePaymentStatus(transactions, checkinDate) {
    const messagesContainer = document.getElementById('online-payment-messages');
    const confirmBtn = document.getElementById('confirm-checkin-btn');
    
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    messagesContainer.style.display = 'none';
    
    if (transactions.length === 0) {
        // No unused online payments found
        messagesContainer.innerHTML = `
            <div class="online-payment-message warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No unused online payments found for this student within ±30 days.</span>
            </div>
        `;
        messagesContainer.style.display = 'block';
        confirmBtn.disabled = true;
        return;
    }
    
    // Find exact match (same date)
    const exactMatch = transactions.find(t => {
        const tDate = new Date(t.classDate);
        tDate.setHours(0, 0, 0, 0);
        const cDate = new Date(checkinDate);
        cDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === cDate.getTime();
    });
    
    if (exactMatch) {
        // Exact match found
        const typeLabel = exactMatch.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        messagesContainer.innerHTML = `
            <div class="online-payment-message success">
                <i class="fas fa-check-circle"></i>
                <span>✓ Found: ${typeLabel} for ${formatDate(exactMatch.classDate)} - ${formatCurrency(exactMatch.amount)}</span>
                <button type="button" class="btn-use-transaction" onclick="selectOnlineTransaction('${exactMatch.id}')">Use This</button>
            </div>
        `;
        messagesContainer.style.display = 'block';
        selectedOnlineTransaction = exactMatch;
        confirmBtn.disabled = false;
        return;
    }
    
    // Different dates - show all available
    messagesContainer.innerHTML = `
        <div class="online-payment-message warning">
            <i class="fas fa-exclamation-triangle"></i>
            <span>⚠ No match for ${formatDate(checkinDate)}. Found online payments for:</span>
        </div>
    `;
    
    transactions.forEach(t => {
        const typeLabel = t.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        const transactionDiv = document.createElement('div');
        transactionDiv.className = 'online-payment-transaction';
        transactionDiv.innerHTML = `
            <span class="transaction-info">${typeLabel} - ${formatDate(t.classDate)} - ${formatCurrency(t.amount)}</span>
            <button type="button" class="btn-use-transaction" onclick="selectOnlineTransaction('${t.id}')">Use This</button>
        `;
        messagesContainer.appendChild(transactionDiv);
    });
    
    messagesContainer.style.display = 'block';
    confirmBtn.disabled = true; // Disabled until they select one
}

/**
 * Select an online transaction for check-in
 * Store the transaction ID for later use
 */
async function selectOnlineTransaction(transactionId) {
    try {
        // Fetch the full transaction document
        const doc = await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .get();
        
        if (!doc.exists) {
            showSnackbar('Transaction not found', 'error');
            return;
        }
        
        const data = doc.data();
        const transactionDate = data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate);
        const classDate = data.classDate?.toDate ? data.classDate.toDate() : transactionDate;
        
        selectedOnlineTransaction = {
            id: doc.id,
            date: transactionDate,
            type: data.type,
            amount: data.amountPaid || 0,
            classDate: classDate,
            paymentMethod: data.paymentMethod || 'online'
        };
        
        // Update the UI to show selected transaction
        const messagesContainer = document.getElementById('online-payment-messages');
        const confirmBtn = document.getElementById('confirm-checkin-btn');
        
        const typeLabel = selectedOnlineTransaction.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        messagesContainer.innerHTML = `
            <div class="online-payment-message success">
                <i class="fas fa-check-circle"></i>
                <span>✓ Selected: ${typeLabel} for ${formatDate(selectedOnlineTransaction.classDate)} - ${formatCurrency(selectedOnlineTransaction.amount)}</span>
                <button type="button" class="btn-change-transaction" onclick="showAllOnlineTransactions()">Change</button>
            </div>
        `;
        
        confirmBtn.disabled = false;
        showSnackbar('Transaction selected', 'success');
        
    } catch (error) {
        console.error('Error selecting transaction:', error);
        showSnackbar('Failed to select transaction', 'error');
    }
}

/**
 * Show all available transactions again (after one was selected)
 */
async function showAllOnlineTransactions() {
    const student = getSelectedStudent();
    const checkinDate = getSelectedCheckinDate();
    
    if (student && checkinDate) {
        await validateOnlinePayment(student.id, checkinDate);
    }
}

/**
 * Get the currently selected online transaction
 */
function getSelectedOnlineTransaction() {
    return selectedOnlineTransaction;
}

/**
 * Clear the selected online transaction
 */
function clearSelectedOnlineTransaction() {
    selectedOnlineTransaction = null;
}

/**
 * Show error message in the online payment section
 */
function showOnlinePaymentError(message) {
    const messagesContainer = document.getElementById('online-payment-messages');
    const confirmBtn = document.getElementById('confirm-checkin-btn');
    
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = `
        <div class="online-payment-message error">
            <i class="fas fa-exclamation-circle"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    messagesContainer.style.display = 'block';
    confirmBtn.disabled = true;
}

/**
 * Update transaction's classDate field (if needed)
 * This allows the admin to correct the date if the student paid for a different class
 * Preserves the original classDate in originalClassDate field
 */
async function updateTransactionDate(transactionId, newDate) {
    try {
        // First, get the current transaction to check if we need to preserve originalClassDate
        const doc = await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .get();
        
        if (!doc.exists) {
            console.error('Transaction not found:', transactionId);
            return false;
        }
        
        const data = doc.data();
        const updateData = {
            classDate: firebase.firestore.Timestamp.fromDate(newDate)
        };
        
        // Only set originalClassDate if it doesn't already exist
        // This preserves the very first classDate, not the most recent one
        if (!data.originalClassDate) {
            updateData.originalClassDate = data.classDate || firebase.firestore.Timestamp.fromDate(newDate);
        }
        
        await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .update(updateData);
        
        console.log('Transaction date updated:', transactionId);
        return true;
        
    } catch (error) {
        console.error('Error updating transaction date:', error);
        return false;
    }
}
