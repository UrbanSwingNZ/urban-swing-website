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
    invoiceBtn.addEventListener('click', () => window.toggleInvoiced(transaction));
    
    const editBtn = row.querySelector('.btn-edit');
    if (!transaction.reversed) {
        editBtn.addEventListener('click', () => window.editTransaction(transaction));
    }
    
    const deleteBtn = row.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => window.confirmDelete(transaction));
    
    return row;
}

/**
 * Update summary display
 */
function updateSummaryDisplay(summary) {
    document.getElementById('total-count').textContent = summary.totalCount;
    document.getElementById('total-amount').textContent = formatCurrency(summary.totalAmount);
    document.getElementById('total-cash').textContent = formatCurrency(summary.totalCash);
    document.getElementById('total-eftpos').textContent = formatCurrency(summary.totalEftpos);
    document.getElementById('total-bank').textContent = formatCurrency(summary.totalBank);
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
