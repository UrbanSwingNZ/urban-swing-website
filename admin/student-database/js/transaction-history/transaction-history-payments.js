/**
 * transaction-history-payments.js
 * Handles loading and displaying payment history (transactions)
 */

/**
 * Load payment history for a student
 */
async function loadTransactionHistoryPayments(studentId) {
    const contentEl = document.getElementById('payments-content');
    
    // Show loading
    contentEl.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading payment history...</p>';
    
    try {
        // Query transactions collection only (includes both concession purchases and casual entries)
        const transactionsSnapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Get all transactions for this student
        const allPayments = transactionsSnapshot.docs
            .filter(doc => {
                const data = doc.data();
                // Exclude reversed transactions
                return !data.reversed;
            })
            .map(doc => {
                const data = doc.data();
                
                // Determine transaction type and package name
                let transactionType, packageName, numberOfClasses;
                
                if (data.type === 'casual-entry') {
                    transactionType = 'casual-entry';
                    packageName = 'Casual Entry';
                    numberOfClasses = 1;
                } else {
                    // Concession purchase
                    transactionType = 'concession-purchase';
                    packageName = data.packageName;
                    numberOfClasses = data.numberOfClasses;
                }
                
                return {
                    id: doc.id,
                    studentId: data.studentId,
                    date: data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate),
                    type: transactionType,
                    packageName: packageName,
                    numberOfClasses: numberOfClasses,
                    amountPaid: data.amountPaid,
                    paymentMethod: data.paymentMethod
                };
            })
            .sort((a, b) => b.date - a.date);
        
        console.log(`Found ${allPayments.length} payment(s) for student ${studentId}`);
        
        displayPaymentHistory(allPayments);
    } catch (error) {
        console.error('Error loading payment history:', error);
        contentEl.innerHTML = '<p class="text-error">Error loading payment history. Please try again.</p>';
    }
}

/**
 * Display payment history
 */
function displayPaymentHistory(transactions) {
    const contentEl = document.getElementById('payments-content');
    
    if (transactions.length === 0) {
        contentEl.innerHTML = '<p class="text-muted">No payment history found.</p>';
        return;
    }
    
    const totalPaid = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
    
    let html = `<p class="section-summary">${transactions.length} payment${transactions.length !== 1 ? 's' : ''} • Total: $${totalPaid.toFixed(2)}</p>`;
    html += '<div class="payments-list">';
    
    transactions.forEach(transaction => {
        const date = formatDate(transaction.date);
        
        html += `
            <div class="payment-item">
                <div class="payment-date-info">
                    <div class="payment-date-time">
                        <span class="payment-date">${date}</span>
                    </div>
                    <div class="payment-package">
                        <strong>${escapeHtml(transaction.packageName || 'Unknown Package')}</strong>
                        <span class="text-muted">${transaction.numberOfClasses || 0} classes</span>
                    </div>
                </div>
                <div class="payment-amount-method">
                    <div class="payment-amount">$${(transaction.amountPaid || 0).toFixed(2)}</div>
                    <div class="payment-method text-muted">${formatPaymentMethod(transaction.paymentMethod)}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    contentEl.innerHTML = html;
}

/**
 * Format payment method for display
 * EFTPOS in uppercase, others in Title Case
 */
function formatPaymentMethod(method) {
    if (!method) return 'Unknown';
    
    const lowerMethod = method.toLowerCase();
    
    if (lowerMethod === 'eftpos') {
        return 'EFTPOS';
    }
    
    // Title Case for other methods (e.g., "Cash", "Bank Transfer")
    return escapeHtml(method.replace(/\b\w/g, char => char.toUpperCase()));
}
