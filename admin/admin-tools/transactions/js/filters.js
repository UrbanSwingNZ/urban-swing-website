/**
 * filters.js
 * Handles filtering and sorting transactions
 */

/**
 * Apply filters to transactions
 */
function applyTransactionFilters(allTransactions, dateFrom, dateTo, typeFilter, paymentMethodFilter, showReversed = false, studentId = null, showOnlyNonInvoiced = false) {
    return allTransactions.filter(transaction => {
        // Filter out reversed transactions unless showReversed is true
        if (!showReversed && transaction.reversed) {
            return false;
        }
        
        // Filter by invoice status if toggle is on
        if (showOnlyNonInvoiced && transaction.invoiced === true) {
            return false;
        }
        
        // Date filter
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (transaction.date < fromDate) return false;
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (transaction.date > toDate) return false;
        }
        
        // Type filter
        if (typeFilter !== 'all') {
            if (typeFilter === 'concession-purchase' && transaction.type !== 'concession-purchase') return false;
            if (typeFilter === 'concession-gift' && transaction.type !== 'concession-gift') return false;
            // Match all casual entry types: 'casual-entry', 'casual', 'casual-student'
            if (typeFilter === 'casual-entry' && !['casual-entry', 'casual', 'casual-student'].includes(transaction.type)) return false;
        }
        
        // Payment method filter
        if (paymentMethodFilter && paymentMethodFilter !== 'all') {
            // Check if transaction is online (has stripeCustomerId)
            if (paymentMethodFilter === 'online') {
                if (!transaction.stripeCustomerId && transaction.paymentMethod !== 'stripe') return false;
            } else {
                // For other payment methods, check the paymentMethod field
                const transactionPaymentMethod = transaction.paymentMethod?.toLowerCase().replace(/\s+/g, '-') || '';
                if (transactionPaymentMethod !== paymentMethodFilter) return false;
            }
        }
        
        // Student filter
        if (studentId && transaction.studentId !== studentId) {
            return false;
        }
        
        return true;
    });
}

/**
 * Sort transactions based on field and direction
 */
function sortTransactions(transactions, field, direction) {
    return transactions.sort((a, b) => {
        let aVal, bVal;
        
        switch (field) {
            case 'date':
                aVal = a.date.getTime();
                bVal = b.date.getTime();
                break;
            case 'student':
                aVal = a.studentName.toLowerCase();
                bVal = b.studentName.toLowerCase();
                break;
            case 'type':
                aVal = a.typeName.toLowerCase();
                bVal = b.typeName.toLowerCase();
                break;
            case 'amount':
                aVal = a.amount;
                bVal = b.amount;
                break;
            case 'cash':
                aVal = a.cash;
                bVal = b.cash;
                break;
            case 'eftpos':
                aVal = a.eftpos;
                bVal = b.eftpos;
                break;
            case 'bank':
                aVal = a.bankTransfer;
                bVal = b.bankTransfer;
                break;
            default:
                return 0;
        }
        
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return direction === 'asc' ? comparison : -comparison;
    });
}

/**
 * Calculate summary statistics
 */
function calculateSummary(transactions) {
    return {
        totalCount: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        totalCash: transactions.reduce((sum, t) => sum + t.cash, 0),
        totalEftpos: transactions.reduce((sum, t) => sum + t.eftpos, 0),
        totalBank: transactions.reduce((sum, t) => sum + t.bankTransfer, 0),
        totalOnline: transactions.reduce((sum, t) => sum + (t.paymentMethod === 'stripe' || t.paymentMethod === 'online' ? t.amount : 0), 0)
    };
}
