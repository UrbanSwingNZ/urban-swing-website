/**
 * refund-reversal.js
 * Handles reversal of refund transactions
 */

/**
 * Check if a refund can be reversed
 * @param {Object} refundTransaction - Refund transaction data
 * @returns {Object} {canReverse: boolean, reason: string}
 */
function canReverseRefund(refundTransaction) {
    // Stripe refunds cannot be reversed
    if (refundTransaction.refundMethod === 'stripe') {
        return {
            canReverse: false,
            reason: 'Stripe refunds cannot be reversed. Money has already been returned to the customer\'s card.'
        };
    }
    
    // Already reversed
    if (refundTransaction.reversed) {
        return {
            canReverse: false,
            reason: 'This refund has already been reversed.'
        };
    }
    
    return {
        canReverse: true,
        reason: ''
    };
}

/**
 * Reverse a refund transaction
 * @param {string} refundTransactionId - ID of refund transaction to reverse
 * @returns {Promise<void>}
 */
async function reverseRefund(refundTransactionId) {
    try {
        const refundRef = db.collection('transactions').doc(refundTransactionId);
        const refundDoc = await refundRef.get();
        
        if (!refundDoc.exists) {
            throw new Error('Refund transaction not found');
        }
        
        const refundData = refundDoc.data();
        
        // Check if can reverse
        const canReverse = canReverseRefund(refundData);
        if (!canReverse.canReverse) {
            throw new Error(canReverse.reason);
        }
        
        // Mark refund as reversed
        await refundRef.update({
            reversed: true,
            reversedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update original transaction
        await updateTransactionAfterReversal(
            refundData.parentTransactionId,
            refundData.amountRefunded,
            refundTransactionId
        );
        
        // Show success message
        showSnackbar('Refund reversed successfully', 'success');
        
        // Reload transactions to update the UI
        if (typeof loadTransactions === 'function') {
            await loadTransactions();
        }
    } catch (error) {
        console.error('Error reversing refund:', error);
        showSnackbar(`Failed to reverse refund: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Update original transaction after refund reversal
 * @param {string} transactionId - Original transaction ID
 * @param {number} refundAmount - Amount that was refunded (now being reversed)
 * @param {string} refundTransactionId - ID of reversed refund transaction
 * @returns {Promise<void>}
 */
async function updateTransactionAfterReversal(transactionId, refundAmount, refundTransactionId) {
    try {
        const transactionRef = db.collection('transactions').doc(transactionId);
        const transactionDoc = await transactionRef.get();
        
        if (!transactionDoc.exists) {
            throw new Error('Original transaction not found');
        }
        
        const data = transactionDoc.data();
        const originalAmount = parseFloat(data.amount) || parseFloat(data.amountPaid) || 0;
        
        // First, mark this refund as reversed in the history
        const refundHistory = data.refundHistory || [];
        const updatedHistory = refundHistory.map(entry => {
            if (entry.refundTransactionId === refundTransactionId) {
                return {
                    ...entry,
                    reversed: true,
                    reversedAt: firebase.firestore.Timestamp.now()
                };
            }
            return entry;
        });
        
        // Recalculate totalRefunded by summing only non-reversed refunds
        const newTotalRefunded = updatedHistory.reduce((sum, entry) => {
            return entry.reversed ? sum : sum + (parseFloat(entry.amount) || 0);
        }, 0);
        
        // Recalculate refund count (only non-reversed refunds)
        const newRefundCount = updatedHistory.filter(entry => !entry.reversed).length;
        
        // Determine new refund status
        let newRefundStatus;
        if (newTotalRefunded === 0) {
            newRefundStatus = 'none';
        } else if (newTotalRefunded < originalAmount) {
            newRefundStatus = 'partial';
        } else {
            newRefundStatus = 'full';
        }
        
        const updateData = {
            refunded: newRefundStatus,
            totalRefunded: newTotalRefunded,
            refundCount: newRefundCount,
            refundHistory: updatedHistory,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await transactionRef.update(updateData);
    } catch (error) {
        console.error('Error updating transaction after reversal:', error);
        throw new Error(`Failed to update transaction after reversal: ${error.message}`);
    }
}

/**
 * Mark a specific refund in the history array as reversed
 * @param {string} transactionId - Original transaction ID
 * @param {string} refundTransactionId - ID of reversed refund
 * @returns {Promise<void>}
 * @deprecated This function is no longer needed as updateTransactionAfterReversal now handles history updates
 */
async function updateRefundHistoryReversalStatus(transactionId, refundTransactionId) {
    // This function is no longer used - history update is handled in updateTransactionAfterReversal
    console.log('updateRefundHistoryReversalStatus is deprecated');
}
