/**
 * refund-display.js
 * Helper functions for rendering refund UI elements
 */

/**
 * Generate refund status badge HTML
 * @param {string} refundStatus - 'none', 'partial', or 'full'
 * @returns {string} HTML for refund status badge
 */
function getRefundStatusBadgeHTML(refundStatus) {
    if (!refundStatus || refundStatus === 'none') {
        return '';
    }
    
    if (refundStatus === 'partial') {
        return '<span class="refund-status-badge partial">Partially Refunded</span>';
    }
    
    if (refundStatus === 'full') {
        return '<span class="refund-status-badge full">Fully Refunded</span>';
    }
    
    return '';
}

/**
 * Get type badge HTML including refund status
 * @param {Object} transaction - Transaction data
 * @returns {string} Complete type badge HTML
 */
function getTypeBadgeWithRefundStatus(transaction) {
    let typeBadgeClass;
    let typeName;
    
    // Handle refund transactions
    if (transaction.type === 'refund') {
        return '<span class="type-badge refund"><i class="fas fa-undo"></i> Refund</span>';
    }
    
    // Determine badge class based on transaction type
    if (transaction.type === 'concession-purchase') {
        typeBadgeClass = 'concession';
        typeName = 'Concession Purchase';
    } else if (transaction.type === 'concession-gift') {
        typeBadgeClass = 'gift';
        typeName = 'Concession Gift';
    } else if (transaction.type === 'casual') {
        typeBadgeClass = 'casual';
        typeName = 'Casual Entry';
    } else if (transaction.type === 'casual-student') {
        typeBadgeClass = 'casual-student';
        typeName = 'Casual Entry (Student)';
    } else {
        typeBadgeClass = 'other';
        typeName = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1).toLowerCase();
    }
    
    // Add reversed badge if transaction is reversed
    const reversedBadge = transaction.reversed ? 
        '<span class="type-badge reversed">Reversed</span> ' : '';
    
    // Add refund status badge
    const refundBadge = getRefundStatusBadgeHTML(transaction.refunded);
    
    return `${reversedBadge}<span class="type-badge ${typeBadgeClass}">${typeName}</span>${refundBadge}`;
}

/**
 * Apply row styling classes for refunded transactions
 * @param {HTMLElement} row - Table row element
 * @param {Object} transaction - Transaction data
 */
function applyRefundRowStyling(row, transaction) {
    // Reversed transactions (existing styling)
    if (transaction.reversed) {
        row.classList.add('reversed-transaction');
        return; // Reversed takes precedence
    }
    
    // Fully refunded transactions
    if (transaction.refunded === 'full') {
        row.classList.add('fully-refunded-transaction');
        return;
    }
    
    // Partially refunded transactions
    if (transaction.refunded === 'partial') {
        row.classList.add('partially-refunded-transaction');
    }
}

/**
 * Generate refund button HTML
 * @param {Object} transaction - Transaction data
 * @returns {string} HTML for refund button
 */
function getRefundButtonHTML(transaction) {
    // Check if user is super admin
    if (!isSuperAdmin()) {
        return '';
    }
    
    // Determine if button should be disabled
    const isDisabled = shouldDisableRefundButton(transaction);
    const disabledAttr = isDisabled ? 'disabled style="opacity: 0.3;"' : '';
    
    // Determine title/tooltip
    let title = 'Process Refund';
    if (transaction.reversed) {
        title = 'Cannot refund reversed transaction';
    } else if (transaction.refunded === 'full') {
        title = 'Transaction fully refunded';
    } else if (transaction.type === 'concession-gift') {
        title = 'Gifts cannot be refunded (non-financial transaction)';
    } else if (transaction.refunded === 'partial') {
        title = 'Process additional refund';
    }
    
    return `<button class="btn-icon btn-refund" 
            title="${title}"
            data-id="${transaction.id}"
            data-collection="${transaction.collection}"
            ${disabledAttr}>
        <i class="fas fa-undo"></i>
    </button>`;
}

/**
 * Determine if refund button should be disabled
 * @param {Object} transaction - Transaction data
 * @returns {boolean} True if button should be disabled
 */
function shouldDisableRefundButton(transaction) {
    // Refund transactions themselves cannot be refunded
    if (transaction.type === 'refund') {
        return true;
    }
    
    // Reversed transactions cannot be refunded
    if (transaction.reversed) {
        return true;
    }
    
    // Fully refunded transactions cannot be refunded again
    if (transaction.refunded === 'full') {
        return true;
    }
    
    // Concession gifts cannot be refunded (non-financial)
    if (transaction.type === 'concession-gift') {
        return true;
    }
    
    // Check if transaction has a past check-in (per BA requirement)
    // This check will be done in the modal validation
    
    return false;
}

/**
 * Format refund transaction parent reference for display
 * @param {Object} transaction - Refund transaction data
 * @returns {string} Formatted parent transaction reference
 */
function formatRefundParentReference(transaction) {
    if (transaction.type !== 'refund') {
        return '';
    }
    
    const originalDate = formatDate(transaction.originalTransactionDate);
    const originalAmount = formatCurrency(transaction.originalAmount);
    
    return `Refund of ${originalAmount} transaction from ${originalDate}`;
}

/**
 * Check if transaction has a past check-in
 * @param {Object} transaction - Transaction data
 * @returns {Promise<boolean>} True if has past check-in
 */
async function hasPastCheckin(transaction) {
    // Only applicable to casual transactions
    if (transaction.type !== 'casual' && transaction.type !== 'casual-student') {
        return false;
    }
    
    // Check if transaction has a checkinId
    if (!transaction.checkinId) {
        return false;
    }
    
    try {
        const checkinDoc = await db.collection('checkins').doc(transaction.checkinId).get();
        
        if (!checkinDoc.exists) {
            return false;
        }
        
        const checkinData = checkinDoc.data();
        const checkinDate = checkinData.date?.toDate() || new Date(checkinData.date);
        const now = new Date();
        
        // Check if check-in is in the past
        return checkinDate < now;
    } catch (error) {
        console.error('Error checking for past check-in:', error);
        return false; // Assume no past check-in on error
    }
}
