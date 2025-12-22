/**
 * transaction-display.js
 * Handles rendering transactions in the table and updating summary statistics
 */

import { formatCurrency } from '/js/utils/index.js';

/**
 * Display transactions in the table
 * @param {Array} transactions - Array of normalized transactions
 */
export function displayCheckinTransactions(transactions) {
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
 * @param {Object} transaction - Transaction data
 * @returns {HTMLElement} Table row element
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
        invoiceBtn.addEventListener('click', () => window.toggleCheckinTransactionInvoiced(transaction));
    }
    
    const editBtn = row.querySelector('.btn-edit');
    if (!transaction.reversed) {
        editBtn.addEventListener('click', () => window.editCheckinTransaction(transaction));
    }
    
    const deleteBtn = row.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => window.confirmDeleteCheckinTransaction(transaction));
    }
    
    return row;
}

/**
 * Update transaction summary statistics
 * @param {Array} transactions - Array of transactions
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
 * @param {Object} transaction - Transaction data
 * @returns {string} Payment badge HTML
 */
function getCheckinPaymentBadgeHTML(transaction) {
    const paymentMethod = String(transaction.paymentMethod || '').toLowerCase();
    
    // Check for online payment (stripeCustomerId or paymentMethod is 'online')
    if (transaction.stripeCustomerId || paymentMethod === 'online') {
        return '<span class="payment-badge online"><i class="fas fa-globe"></i> Online</span>';
    }
    
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
