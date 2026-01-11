/**
 * refund-handler.js
 * Main refund logic module for processing refunds
 * Note: RefundModal will be available globally after its module loads
 */

/**
 * Open the refund modal for a transaction
 * @param {Object} transaction - Transaction data
 */
function openRefundModal(transaction) {
    // Validate transaction can be refunded
    const validation = validateRefundEligibility(transaction);
    if (!validation.canRefund) {
        showSnackbar(validation.reason, 'error');
        return;
    }
    
    // Check if RefundModal is available
    if (typeof RefundModal === 'undefined') {
        console.error('RefundModal is not loaded');
        showSnackbar('Error: Refund modal not available', 'error');
        return;
    }
    
    // Remove any existing refund modals from DOM
    document.querySelectorAll('[id^="refund-modal-"]').forEach(el => el.remove());
    
    // Create and show modal
    const modal = new RefundModal({
        transaction,
        onRefund: (refundData) => processRefund(refundData)
    });
    
    modal.show();
}

/**
 * Validate if a transaction can be refunded
 * @param {Object} transaction - Transaction data
 * @returns {Object} {canRefund: boolean, reason: string}
 */
function validateRefundEligibility(transaction) {
    // Reversed transactions cannot be refunded
    if (transaction.reversed) {
        return {
            canRefund: false,
            reason: 'Cannot refund reversed transactions'
        };
    }
    
    // Fully refunded transactions cannot be refunded again
    if (transaction.refunded === 'full') {
        return {
            canRefund: false,
            reason: 'Transaction has already been fully refunded'
        };
    }
    
    // Concession gifts cannot be refunded (non-financial)
    if (transaction.type === 'concession-gift') {
        return {
            canRefund: false,
            reason: 'Concession gifts cannot be refunded (non-financial transaction)'
        };
    }
    
    // Refund transactions themselves cannot be refunded
    if (transaction.type === 'refund') {
        return {
            canRefund: false,
            reason: 'Refund transactions cannot be refunded'
        };
    }
    
    return {
        canRefund: true,
        reason: ''
    };
}

/**
 * Process a refund
 * @param {Object} refundData - Refund details from modal
 */
async function processRefund(refundData) {
    try {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.showGlobal('Processing refund...');
        }
        
        const { transactionId, transaction, amount, paymentMethod, reason, isFullRefund } = refundData;
        
        // Prepare data for Firebase Function
        const requestData = {
            transactionId,
            transaction,
            amount,
            paymentMethod,
            reason,
            isFullRefund,
            refundedBy: auth.currentUser.email
        };
        
        // Call Firebase Function to process refund
        const processRefundFunction = firebase.functions().httpsCallable('processRefund');
        const result = await processRefundFunction(requestData);
        
        if (result.data.success) {
            if (window.LoadingSpinner) {
                window.LoadingSpinner.hideGlobal();
            }
            showSnackbar(`Refund of $${amount.toFixed(2)} processed successfully`, 'success');
            
            // Reload transactions to show updated data
            await loadTransactions();
        } else {
            if (window.LoadingSpinner) {
                window.LoadingSpinner.hideGlobal();
            }
            showSnackbar(`Refund failed: ${result.data.error}`, 'error');
        }
    } catch (error) {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.hideGlobal();
        }
        console.error('Error processing refund:', error);
        showSnackbar(`Error processing refund: ${error.message}`, 'error');
    }
}

/**
 * Validate refund amount
 * @param {number} amount - Refund amount
 * @param {number} maxRefundable - Maximum refundable amount
 * @returns {Object} {isValid: boolean, error: string}
 */
function validateRefundAmount(amount, maxRefundable) {
    if (!amount || isNaN(amount)) {
        return {
            isValid: false,
            error: 'Please enter a valid refund amount'
        };
    }
    
    if (amount <= 0) {
        return {
            isValid: false,
            error: 'Refund amount must be greater than $0'
        };
    }
    
    if (amount > maxRefundable) {
        return {
            isValid: false,
            error: `Refund amount cannot exceed $${maxRefundable.toFixed(2)}`
        };
    }
    
    return {
        isValid: true,
        error: ''
    };
}

/**
 * Validate refund payment method
 * @param {string} paymentMethod - Selected payment method
 * @returns {Object} {isValid: boolean, error: string}
 */
function validateRefundPaymentMethod(paymentMethod) {
    const validMethods = ['cash', 'eftpos', 'online', 'bank-transfer'];
    
    if (!paymentMethod) {
        return {
            isValid: false,
            error: 'Please select a payment method'
        };
    }
    
    if (!validMethods.includes(paymentMethod)) {
        return {
            isValid: false,
            error: 'Invalid payment method selected'
        };
    }
    
    return {
        isValid: true,
        error: ''
    };
}

/**
 * Calculate refund status (partial vs full)
 * @param {number} originalAmount - Original transaction amount
 * @param {number} totalRefunded - Total amount refunded so far
 * @returns {string} 'none', 'partial', or 'full'
 */
function calculateRefundStatus(originalAmount, totalRefunded) {
    if (totalRefunded === 0) {
        return 'none';
    }
    
    if (Math.abs(totalRefunded - originalAmount) < 0.01) {
        return 'full';
    }
    
    return 'partial';
}

// Make function available globally for display.js
window.openRefundModal = openRefundModal;
