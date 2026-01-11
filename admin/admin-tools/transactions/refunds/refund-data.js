/**
 * refund-data.js
 * Handles Firestore operations for refund transactions
 */

/**
 * Update the original transaction with refund information
 * @param {string} transactionId - ID of the original transaction
 * @param {number} refundAmount - Amount being refunded
 * @param {boolean} isFullRefund - Whether this completes the refund
 * @param {Object} existingData - Existing refund data from transaction
 * @returns {Promise<void>}
 */
async function updateOriginalTransaction(transactionId, refundAmount, isFullRefund, existingData = {}) {
    try {
        const transactionRef = db.collection('transactions').doc(transactionId);
        
        const currentTotalRefunded = existingData.totalRefunded || 0;
        const currentRefundCount = existingData.refundCount || 0;
        const currentRefundHistory = existingData.refundHistory || [];
        
        const newTotalRefunded = currentTotalRefunded + refundAmount;
        
        const updateData = {
            refunded: isFullRefund ? 'full' : 'partial',
            totalRefunded: newTotalRefunded,
            refundCount: currentRefundCount + 1,
            lastRefundDate: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await transactionRef.update(updateData);
    } catch (error) {
        console.error('Error updating original transaction:', error);
        throw new Error(`Failed to update original transaction: ${error.message}`);
    }
}

/**
 * Create a new refund transaction record
 * @param {Object} refundDetails - All refund transaction details
 * @returns {Promise<string>} - ID of created refund transaction
 */
async function createRefundTransaction(refundDetails) {
    try {
        const {
            studentId,
            studentName,
            amountRefunded,
            paymentMethod,
            parentTransactionId,
            originalTransactionDate,
            originalAmount,
            reason,
            refundedBy,
            refundMethod,
            stripeRefundId,
            stripeCustomerId,
            remainingRefundable
        } = refundDetails;
        
        const timestamp = Date.now();
        const refundTransactionId = `${studentId}-refund-${timestamp}`;
        
        const refundTransaction = {
            // Core identification
            type: 'refund',
            studentId,
            studentName,
            
            // Refund details
            amountRefunded,
            refundDate: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            transactionDate: firebase.firestore.FieldValue.serverTimestamp(), // For sorting
            paymentMethod,
            
            // Original transaction reference
            parentTransactionId,
            originalTransactionDate,
            originalAmount,
            
            // Additional tracking
            reason: reason || '',
            refundedBy,
            refundMethod, // 'stripe' or 'manual'
            
            // Standard fields
            invoiced: false,
            remainingRefundable,
            
            // Collection field for consistency
            collection: 'transactions'
        };
        
        // Add Stripe fields if applicable
        if (stripeRefundId) {
            refundTransaction.stripeRefundId = stripeRefundId;
        }
        if (stripeCustomerId) {
            refundTransaction.stripeCustomerId = stripeCustomerId;
        }
        
        await db.collection('transactions').doc(refundTransactionId).set(refundTransaction);
        
        return refundTransactionId;
    } catch (error) {
        console.error('Error creating refund transaction:', error);
        throw new Error(`Failed to create refund transaction: ${error.message}`);
    }
}

/**
 * Add refund to history array on original transaction
 * @param {string} transactionId - Original transaction ID
 * @param {Object} refundInfo - Refund information to add to history
 * @returns {Promise<void>}
 */
async function addToRefundHistory(transactionId, refundInfo) {
    try {
        const transactionRef = db.collection('transactions').doc(transactionId);
        
        const historyEntry = {
            refundTransactionId: refundInfo.refundTransactionId,
            amount: refundInfo.amount,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            refundedBy: refundInfo.refundedBy,
            reason: refundInfo.reason || '',
            reversed: false
        };
        
        await transactionRef.update({
            refundHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry)
        });
    } catch (error) {
        console.error('Error adding to refund history:', error);
        throw new Error(`Failed to add to refund history: ${error.message}`);
    }
}

/**
 * Get refund history for a transaction
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Array>} Array of refund history entries
 */
async function getRefundHistory(transactionId) {
    try {
        const transactionDoc = await db.collection('transactions').doc(transactionId).get();
        
        if (!transactionDoc.exists) {
            throw new Error('Transaction not found');
        }
        
        const data = transactionDoc.data();
        return data.refundHistory || [];
    } catch (error) {
        console.error('Error fetching refund history:', error);
        throw new Error(`Failed to fetch refund history: ${error.message}`);
    }
}

/**
 * Get all refund transactions for a parent transaction
 * @param {string} parentTransactionId - Parent transaction ID
 * @returns {Promise<Array>} Array of refund transaction documents
 */
async function getRefundTransactions(parentTransactionId) {
    try {
        const refundsSnapshot = await db.collection('transactions')
            .where('type', '==', 'refund')
            .where('parentTransactionId', '==', parentTransactionId)
            .get();
        
        const refunds = [];
        refundsSnapshot.forEach(doc => {
            refunds.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return refunds;
    } catch (error) {
        console.error('Error fetching refund transactions:', error);
        throw new Error(`Failed to fetch refund transactions: ${error.message}`);
    }
}
