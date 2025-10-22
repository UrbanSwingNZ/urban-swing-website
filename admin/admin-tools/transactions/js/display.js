/**
 * display.js
 * Handles rendering transactions in the UI
 */

/**
 * Display transactions in table
 */
function displayTransactions(transactions, currentSort) {
    const tbody = document.getElementById('transactions-tbody');
    const table = document.getElementById('transactions-table');
    const emptyState = document.getElementById('empty-state');
    
    tbody.innerHTML = '';
    
    if (transactions.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    transactions.forEach(transaction => {
        const row = createTransactionRow(transaction);
        tbody.appendChild(row);
    });
    
    updateSortIcons(currentSort);
}

/**
 * Create a table row for a transaction
 */
function createTransactionRow(transaction) {
    const row = document.createElement('tr');
    
    const typeBadgeClass = transaction.type === 'concession' ? 'concession' : transaction.paymentMethod;
    
    row.innerHTML = `
        <td>${formatDate(transaction.date)}</td>
        <td><strong>${escapeHtml(transaction.studentName)}</strong></td>
        <td><span class="type-badge ${typeBadgeClass}">${transaction.typeName}</span></td>
        <td class="amount-cell">$${transaction.amount.toFixed(2)}</td>
        <td class="payment-amount ${transaction.cash > 0 ? '' : 'empty'}">
            ${transaction.cash > 0 ? '$' + transaction.cash.toFixed(2) : '-'}
        </td>
        <td class="payment-amount ${transaction.eftpos > 0 ? '' : 'empty'}">
            ${transaction.eftpos > 0 ? '$' + transaction.eftpos.toFixed(2) : '-'}
        </td>
        <td class="payment-amount ${transaction.bankTransfer > 0 ? '' : 'empty'}">
            ${transaction.bankTransfer > 0 ? '$' + transaction.bankTransfer.toFixed(2) : '-'}
        </td>
        <td>
            <div class="action-buttons">
                <i class="fas fa-file-invoice btn-invoice ${transaction.invoiced ? 'invoiced' : ''}" 
                   title="${transaction.invoiced ? 'Mark as Not Invoiced' : 'Mark as Invoiced'}"
                   data-id="${transaction.id}"
                   data-collection="${transaction.collection}"></i>
                <button class="btn-icon btn-delete" 
                        title="Delete Transaction"
                        data-id="${transaction.id}"
                        data-collection="${transaction.collection}"
                        data-student="${escapeHtml(transaction.studentName)}"
                        data-amount="${transaction.amount}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </td>
    `;
    
    // Add event listeners
    const invoiceBtn = row.querySelector('.btn-invoice');
    invoiceBtn.addEventListener('click', () => window.toggleInvoiced(transaction));
    
    const deleteBtn = row.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => window.confirmDelete(transaction));
    
    return row;
}

/**
 * Update summary display
 */
function updateSummaryDisplay(summary) {
    document.getElementById('total-count').textContent = summary.totalCount;
    document.getElementById('total-amount').textContent = '$' + summary.totalAmount.toFixed(2);
    document.getElementById('total-cash').textContent = '$' + summary.totalCash.toFixed(2);
    document.getElementById('total-eftpos').textContent = '$' + summary.totalEftpos.toFixed(2);
    document.getElementById('total-bank').textContent = '$' + summary.totalBank.toFixed(2);
}

/**
 * Update sort icons in table headers
 */
function updateSortIcons(currentSort) {
    document.querySelectorAll('.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        icon.className = 'fas fa-sort sort-icon';
    });
    
    const activeHeader = document.querySelector(`[data-sort="${currentSort.field}"]`);
    if (activeHeader) {
        const icon = activeHeader.querySelector('.sort-icon');
        icon.className = currentSort.direction === 'asc' 
            ? 'fas fa-sort-up sort-icon active' 
            : 'fas fa-sort-down sort-icon active';
    }
}
