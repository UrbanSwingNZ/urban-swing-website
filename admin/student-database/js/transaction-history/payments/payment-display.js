/**
 * payment-display.js
 * Handles rendering payment transaction history
 */

/**
 * Display payment history
 * @param {Array} transactions - Array of transaction objects
 */
export function displayPaymentHistory(transactions) {
    const contentEl = document.getElementById('payments-content');
    
    if (transactions.length === 0) {
        contentEl.innerHTML = '<p class="text-muted">No payment history found.</p>';
        return;
    }
    
    const totalPaid = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
    
    let html = `<p class="section-summary">${transactions.length} payment${transactions.length !== 1 ? 's' : ''} • Total: $${totalPaid.toFixed(2)}</p>`;
    html += '<div class="payments-list">';
    
    transactions.forEach(transaction => {
        html += renderPaymentItem(transaction);
    });
    
    html += '</div>';
    contentEl.innerHTML = html;
}

/**
 * Render a single payment item
 * @param {object} transaction - Transaction object
 * @returns {string} HTML string
 */
function renderPaymentItem(transaction) {
    const date = formatDate(transaction.date);
    
    // Format class date if it exists
    const classDateHtml = transaction.classDate 
        ? `<div class="payment-class-date">
               <i class="fas fa-calendar"></i> Class paid for: ${formatDate(transaction.classDate)}
           </div>`
        : '';
    
    // Add edit and delete buttons - delete only for super admin
    const editButton = `<button class="btn-icon" onclick="editTransaction('${transaction.id}')" title="Edit transaction">
           <i class="fas fa-edit"></i>
       </button>`;
    
    const deleteButton = isSuperAdmin() 
        ? `<button class="btn-icon btn-delete" onclick="confirmDeleteTransaction('${transaction.id}')" title="Delete transaction">
           <i class="fas fa-trash-alt"></i>
       </button>`
        : '';
    
    return `
        <div class="payment-item">
            <div class="payment-date-info">
                <div class="payment-date-time">
                    <span class="payment-date">${date}</span>
                </div>
                <div class="payment-package">
                    <strong>${escapeHtml(transaction.packageName || 'Unknown Package')}</strong>
                    <span class="text-muted">${transaction.numberOfClasses || 0} classes</span>
                </div>
                ${classDateHtml}
            </div>
            <div class="payment-amount-method">
                <div class="payment-amount">$${(transaction.amountPaid || 0).toFixed(2)}</div>
                <div class="payment-method text-muted">${formatPaymentMethod(transaction.paymentMethod)}</div>
                <div class="payment-actions">
                    ${editButton}
                    ${deleteButton}
                </div>
            </div>
        </div>
    `;
}

/**
 * Format payment method for display
 * EFTPOS in uppercase, others in Title Case
 * @param {string} method - Payment method
 * @returns {string} Formatted payment method
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
