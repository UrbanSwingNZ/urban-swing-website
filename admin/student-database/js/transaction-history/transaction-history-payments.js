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
        // Query both transactions (concession purchases) and casual checkins (casual payments)
        const [transactionsSnapshot, checkinsSnapshot] = await Promise.all([
            firebase.firestore().collection('transactions').get(),
            firebase.firestore().collection('checkins').get()
        ]);
        
        // Get concession purchases from transactions collection
        const concessionPurchases = transactionsSnapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    studentId: data.studentId,
                    date: data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate),
                    type: 'concession-purchase',
                    packageName: data.packageName,
                    numberOfClasses: data.numberOfClasses,
                    amountPaid: data.amountPaid,
                    paymentMethod: data.paymentMethod
                };
            })
            .filter(t => t.studentId === studentId);
        
        // Get casual payments from checkins collection
        const casualPayments = checkinsSnapshot.docs
            .filter(doc => {
                const data = doc.data();
                return data.studentId === studentId && 
                       data.amountPaid && 
                       data.amountPaid > 0; // Only include check-ins where money was paid
            })
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    studentId: data.studentId,
                    date: data.checkinDate?.toDate ? data.checkinDate.toDate() : new Date(data.checkinDate),
                    type: 'casual-entry',
                    packageName: 'Casual Entry',
                    numberOfClasses: 1,
                    amountPaid: data.amountPaid || 15,
                    paymentMethod: data.paymentMethod
                };
            });
        
        // Combine and sort all payments by date (newest first)
        const allPayments = [...concessionPurchases, ...casualPayments]
            .sort((a, b) => b.date - a.date);
        
        console.log(`Found ${allPayments.length} payment(s) for student ${studentId} (${concessionPurchases.length} concession purchases, ${casualPayments.length} casual entries)`);
        
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
