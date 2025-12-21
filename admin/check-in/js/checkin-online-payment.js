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
        
        // Clear the current transaction ID UNLESS we're showing all transactions via the Change button
        // This prevents showing already-used transactions when changing dates or creating new check-ins,
        // but allows seeing the current transaction when clicking Change in edit mode
        if (!window.checkinOnlinePayment) window.checkinOnlinePayment = {};
        if (!window.checkinOnlinePayment.showingAllTransactions) {
            window.checkinOnlinePayment.currentTransactionId = null;
        }
        // Reset the flag
        window.checkinOnlinePayment.showingAllTransactions = false;
        
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
        
        // Get currently used transaction ID if editing
        const currentTransactionId = window.checkinOnlinePayment?.currentTransactionId || null;
        
        // Filter transactions in JavaScript to avoid needing a compound index
        const validTransactions = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const transactionDate = data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate);
            
            // Check if this transaction qualifies:
            // 1. Type is 'casual' or 'casual-student' (not 'concession-purchase')
            // 2. Payment method includes 'online' or has stripeCustomerId
            // 3. Not reversed
            // 4. Not already used for check-in (OR is the currently selected one when editing)
            // 5. Within ±30 days of check-in date
            
            const isCasualType = data.type === 'casual' || data.type === 'casual-student';
            const isOnlinePayment = data.paymentMethod === 'online' || data.stripeCustomerId;
            const isNotReversed = !data.reversed;
            const isNotUsed = !data.usedForCheckin || doc.id === currentTransactionId;
            const isInDateRange = transactionDate >= searchStartDate && transactionDate <= searchEndDate;
            
            if (isCasualType && isOnlinePayment && isNotReversed && isNotUsed && isInDateRange) {
                validTransactions.push({
                    id: doc.id,
                    date: transactionDate,
                    type: data.type,
                    amount: data.amountPaid || 0,
                    classDate: data.classDate?.toDate ? data.classDate.toDate() : transactionDate,
                    originalClassDate: data.originalClassDate?.toDate ? data.originalClassDate.toDate() : null,
                    isCurrent: doc.id === currentTransactionId
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
        // Don't consider current transaction as an auto-match
        if (t.isCurrent) return false;
        
        const tDate = new Date(t.classDate);
        tDate.setHours(0, 0, 0, 0);
        const cDate = new Date(checkinDate);
        cDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === cDate.getTime();
    });
    
    const currentTransactionId = window.checkinOnlinePayment?.currentTransactionId || null;
    
    // If we have a current transaction (editing mode), always show the list
    if (currentTransactionId) {
        messagesContainer.innerHTML = `
            <div class="online-payment-message ${exactMatch ? 'success' : 'warning'}">
                <i class="fas ${exactMatch ? ICONS.SUCCESS : ICONS.WARNING}"></i>
                <span>${exactMatch ? 'Found match for' : 'No match for'} ${formatDate(checkinDate)}. Available online payments:</span>
            </div>
        `;
        
        transactions.forEach(t => {
            const typeLabel = t.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
            const transactionDiv = document.createElement('div');
            transactionDiv.className = t.isCurrent ? 'online-payment-transaction current-transaction' : 'online-payment-transaction';
            
            // Use originalClassDate if it exists (means the date was changed), otherwise use classDate
            const displayDate = t.originalClassDate || t.classDate;
            
            if (t.isCurrent) {
                transactionDiv.innerHTML = `
                    <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                    <span class="current-badge">✓ Currently Using</span>
                `;
            } else {
                transactionDiv.innerHTML = `
                    <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                    <button type="button" class="btn-use-transaction" onclick="selectOnlineTransaction('${t.id}')">Use This</button>
                `;
            }
            
            messagesContainer.appendChild(transactionDiv);
        });
        
        messagesContainer.style.display = 'block';
        confirmBtn.disabled = false;
        return;
    }
    
    if (exactMatch) {
        // Exact match found (new check-in mode) - auto-select it
        const typeLabel = exactMatch.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        messagesContainer.innerHTML = `
            <div class="online-payment-message success">
                <i class="fas fa-check-circle"></i>
                <span>Using: ${typeLabel} for ${formatDate(exactMatch.classDate)} - ${formatCurrency(exactMatch.amount)}</span>
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
        transactionDiv.className = t.isCurrent ? 'online-payment-transaction current-transaction' : 'online-payment-transaction';
        
        // Use originalClassDate if it exists (means the date was changed), otherwise use classDate
        const displayDate = t.originalClassDate || t.classDate;
        
        if (t.isCurrent) {
            transactionDiv.innerHTML = `
                <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                <span class="current-badge">✓ Currently Using</span>
            `;
        } else {
            transactionDiv.innerHTML = `
                <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                <button type="button" class="btn-use-transaction" onclick="selectOnlineTransaction('${t.id}')">Use This</button>
            `;
        }
        
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
        // Set flag to prevent clearing currentTransactionId
        if (!window.checkinOnlinePayment) window.checkinOnlinePayment = {};
        window.checkinOnlinePayment.showingAllTransactions = true;
        
        await validateOnlinePayment(student.id, checkinDate);
    }
}

/**
 * Check if student has any available online payments
 * Hide/show the Online Payment radio button accordingly
 */
async function checkStudentHasOnlinePayments(studentId) {
    try {
        const onlinePaymentRadio = document.getElementById('entry-online-payment');
        const onlinePaymentContainer = onlinePaymentRadio?.closest('label.radio-option');
        if (!onlinePaymentContainer) return;
        
        // Query all transactions for this student
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Check if any valid unused online payments exist
        let hasAvailablePayments = false;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            const isCasualType = data.type === 'casual' || data.type === 'casual-student';
            const isOnlinePayment = data.paymentMethod === 'online' || data.stripeCustomerId;
            const isNotReversed = !data.reversed;
            const isNotUsed = !data.usedForCheckin;
            
            if (isCasualType && isOnlinePayment && isNotReversed && isNotUsed) {
                hasAvailablePayments = true;
                break;
            }
        }
        
        // Show or hide the Online Payment option
        if (hasAvailablePayments) {
            onlinePaymentContainer.style.display = 'block';
        } else {
            onlinePaymentContainer.style.display = 'none';
            // If it was selected, deselect it
            const onlinePaymentRadio = document.getElementById('entry-online-payment');
            if (onlinePaymentRadio && onlinePaymentRadio.checked) {
                onlinePaymentRadio.checked = false;
            }
        }
    } catch (error) {
        console.error('Error checking for online payments:', error);
    }
}

/**
 * Check if student has a matching online payment for the current check-in date
 * If yes, auto-select the Online Payment radio and the transaction
 */
async function checkAndAutoSelectOnlinePayment(studentId, checkinDate) {
    try {
        // Don't auto-select if we're editing an existing check-in
        if (isEditMode && isEditMode()) {
            return;
        }
        
        // Format the check-in date
        const checkinDateStart = new Date(checkinDate);
        checkinDateStart.setHours(0, 0, 0, 0);
        
        const checkinDateEnd = new Date(checkinDate);
        checkinDateEnd.setHours(23, 59, 59, 999);
        
        // Query transactions for this student
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Find exact match
        let exactMatch = null;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Only check valid casual/casual-student transactions
            const isCasualType = data.type === 'casual' || data.type === 'casual-student';
            const isOnlinePayment = data.paymentMethod === 'online' || data.stripeCustomerId;
            const isNotReversed = !data.reversed;
            const isNotUsed = !data.usedForCheckin;
            
            if (!isCasualType || !isOnlinePayment || !isNotReversed || !isNotUsed) {
                continue;
            }
            
            // Check for exact date match
            const classDate = data.classDate?.toDate ? data.classDate.toDate() : (data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate));
            classDate.setHours(0, 0, 0, 0);
            
            if (classDate.getTime() === checkinDateStart.getTime()) {
                exactMatch = {
                    id: doc.id,
                    ...data,
                    classDate: classDate
                };
                break;
            }
        }
        
        // If exact match found, auto-select Online Payment radio
        if (exactMatch) {
            const onlinePaymentRadio = document.getElementById('entry-online-payment');
            if (onlinePaymentRadio) {
                onlinePaymentRadio.checked = true;
                // Trigger the change event to update UI
                const event = new Event('change', { bubbles: true });
                onlinePaymentRadio.dispatchEvent(event);
            }
        }
    } catch (error) {
        console.error('Error checking for auto-select online payment:', error);
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
