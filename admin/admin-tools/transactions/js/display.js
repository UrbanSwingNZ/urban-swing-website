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
        renderPagination(0);
        updatePaginationInfo(0);
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    // Get paginated data
    const paginatedTransactions = getPaginatedData(transactions);
    
    paginatedTransactions.forEach(transaction => {
        const row = createTransactionRow(transaction);
        tbody.appendChild(row);
    });
    
    updateSortIcons(currentSort);
    renderPagination(transactions.length);
    updatePaginationInfo(transactions.length);
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
    const paymentBadgeHTML = getPaymentBadgeHTML(transaction);
    
    // Get class date for casual online purchases
    const classDateHTML = getClassDateHTML(transaction);
    
    row.innerHTML = `
        <td>${formatDate(transaction.date)}</td>
        <td><strong>${escapeHtml(transaction.studentName)}</strong></td>
        <td>${reversedBadge}<span class="type-badge ${typeBadgeClass}">${transaction.typeName}</span></td>
        <td>${classDateHTML}</td>
        <td class="amount-cell">${formatCurrency(transaction.amount)}</td>
        <td>${paymentBadgeHTML}</td>
        <td>
            <div class="action-buttons">
                ${isSuperAdmin() ? `<button class="btn-icon btn-invoice ${transaction.invoiced ? 'invoiced' : ''}" 
                        title="${transaction.invoiced ? 'Mark as Not Invoiced' : 'Mark as Invoiced'}"
                        data-id="${transaction.id}"
                        data-collection="${transaction.collection}"
                        ${transaction.reversed ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-file-invoice"></i>
                </button>` : ''}
                <button class="btn-icon btn-edit" 
                        title="${transaction.type === 'concession-gift' ? 'Gifts cannot be edited' : 'Edit Transaction'}"
                        ${transaction.reversed || transaction.type === 'concession-gift' ? 'disabled style="opacity: 0.3;"' : ''}>
                    <i class="fas fa-edit"></i>
                </button>
                ${isSuperAdmin() ? `<button class="btn-icon btn-delete" 
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
        invoiceBtn.addEventListener('click', () => window.toggleInvoiced(transaction));
    }
    
    const editBtn = row.querySelector('.btn-edit');
    if (!transaction.reversed && transaction.type !== 'concession-gift') {
        editBtn.addEventListener('click', () => window.editTransaction(transaction));
    }
    
    const deleteBtn = row.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => window.confirmDelete(transaction));
    }
    
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
    document.getElementById('total-online').textContent = formatCurrency(summary.totalOnline);
    document.getElementById('total-bank').textContent = formatCurrency(summary.totalBank);
}

/**
 * Get payment method badge HTML
 */
function getPaymentBadgeHTML(transaction) {
    // Check if online payment first (has stripeCustomerId)
    if (transaction.stripeCustomerId) {
        return '<span class="payment-badge online"><i class="fas fa-globe"></i> Online</span>';
    }
    
    const paymentMethod = String(transaction.paymentMethod || '').toLowerCase();
    
    if (paymentMethod === 'cash') {
        return '<span class="payment-badge cash"><i class="fas fa-money-bill-wave"></i> Cash</span>';
    } else if (paymentMethod === 'eftpos') {
        return '<span class="payment-badge eftpos"><i class="fas fa-credit-card"></i> EFTPOS</span>';
    } else if (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') {
        return '<span class="payment-badge bank"><i class="fas fa-building-columns"></i> Bank Transfer</span>';
    } else {
        return '<span class="payment-badge unknown"><i class="fas fa-question-circle"></i> Unknown</span>';
    }
}

/**
 * Get class date HTML for casual online purchases
 */
function getClassDateHTML(transaction) {
    // Only show class date for casual transactions with online payment
    const isCasual = ['casual', 'casual-student', 'casual-entry'].includes(transaction.type);
    const isOnline = transaction.stripeCustomerId || transaction.paymentMethod === 'online';
    
    if (isCasual && isOnline && transaction.rawData && transaction.rawData.classDate) {
        const classDate = transaction.rawData.classDate?.toDate ? transaction.rawData.classDate.toDate() : new Date();
        return formatDate(classDate);
    } else {
        return '<span class="na-text">N/A</span>';
    }
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
