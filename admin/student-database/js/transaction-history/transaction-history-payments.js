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
        // Query concession blocks (purchases) for this student
        // We'll get purchases from concessionBlocks collection since that's where payment info is stored
        // Query by studentId only, then sort client-side to avoid composite index requirement
        const snapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .get();
        
        const transactions = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    studentId: data.studentId,
                    date: data.purchaseDate?.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate),
                    type: 'purchase',
                    packageName: data.packageName,
                    numberOfClasses: data.originalQuantity,
                    amountPaid: data.price,
                    paymentMethod: data.paymentMethod
                };
            })
            .sort((a, b) => b.date - a.date); // Sort by date descending (newest first)
        
        console.log(`Found ${transactions.length} payment(s) for student ${studentId}`);
        
        displayPaymentHistory(transactions);
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
        const time = transaction.date.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="payment-item">
                <div class="payment-date-info">
                    <div class="payment-date-time">
                        <span class="payment-date">${date}</span>
                        <span class="payment-time text-muted">${time}</span>
                    </div>
                    <div class="payment-package">
                        <strong>${escapeHtml(transaction.packageName || 'Unknown Package')}</strong>
                        <span class="text-muted">${transaction.numberOfClasses || 0} classes</span>
                    </div>
                </div>
                <div class="payment-amount-method">
                    <div class="payment-amount">$${(transaction.amountPaid || 0).toFixed(2)}</div>
                    <div class="payment-method text-muted">${escapeHtml(transaction.paymentMethod || 'Unknown')}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    contentEl.innerHTML = html;
}
