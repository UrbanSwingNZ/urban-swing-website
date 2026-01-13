/**
 * process-refund.js
 * Firebase Function for processing refunds with Stripe integration
 */

const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { refundPayment } = require('./stripe/stripe-payment');

/**
 * Process a refund for a transaction
 * Handles both Stripe and manual refunds
 */
exports.processRefund = onCall(
    { 
        region: 'us-central1',
        cors: true,
        invoker: 'public'
    },
    async (request) => {
        // Ensure user is authenticated
        if (!request.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated to process refunds'
            );
        }
        
        // Ensure user is super admin
        if (request.auth.token.email !== 'dance@urbanswing.co.nz') {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only super admin can process refunds'
            );
        }
    
        try {
            const {
                transactionId,
                transaction,
                amount,
                paymentMethod,
                reason,
                isFullRefund,
                refundedBy
            } = request.data;
            
            // Validate required fields
            if (!transactionId || !transaction || !amount || !paymentMethod || !reason) {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    'Missing required refund parameters'
                );
            }
        
        // Validate amount
        const originalAmount = transaction.amount;
        const previouslyRefunded = transaction.totalRefunded || 0;
        const availableToRefund = originalAmount - previouslyRefunded;
        
        if (amount <= 0 || amount > availableToRefund) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                `Invalid refund amount. Available to refund: $${availableToRefund.toFixed(2)}`
            );
        }
        
        const db = admin.firestore();
        const timestamp = Date.now();
        const refundTransactionId = `${transaction.studentId}-refund-${timestamp}`;
        
        // Fetch the full transaction from Firestore to get payment intent ID
        const transactionDoc = await db.collection('transactions').doc(transactionId).get();
        if (!transactionDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Transaction not found'
            );
        }
        const fullTransaction = transactionDoc.data();
        
        let stripeRefundId = null;
        let refundMethod = 'manual';
        
        // Check if this is a Stripe transaction
        const isStripeTransaction = fullTransaction.stripeCustomerId || 
                                   fullTransaction.paymentMethod === 'stripe' || 
                                   fullTransaction.paymentMethod === 'online';
        
        // Get payment intent ID from Firestore (can be stored as either field name)
        const paymentIntentId = fullTransaction.paymentIntentId || fullTransaction.stripePaymentIntentId;
        
        // ...removed verbose refund details log for security...
        
        // Process Stripe refund if applicable
        if (isStripeTransaction && paymentIntentId) {
            console.log(`Processing Stripe refund for payment intent: ${paymentIntentId}`);
            
            const stripeResult = await refundPayment(
                paymentIntentId,
                'requested_by_customer'
            );
            
            if (!stripeResult.success) {
                throw new functions.https.HttpsError(
                    'internal',
                    `Stripe refund failed: ${stripeResult.error}`
                );
            }
            
            stripeRefundId = stripeResult.refundId;
            refundMethod = 'stripe';
            console.log(`Stripe refund successful: ${stripeRefundId}`);
        } else if (isStripeTransaction) {
            console.warn(`Transaction identified as Stripe but missing payment intent ID. Processing as manual refund.`);
        }
        
        // Create refund transaction document
        const refundTransaction = {
            // Core identification
            type: 'refund',
            studentId: transaction.studentId,
            studentName: transaction.studentName,
            
            // Refund details
            amountRefunded: amount,
            refundDate: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            transactionDate: admin.firestore.FieldValue.serverTimestamp(),
            paymentMethod,
            
            // Original transaction reference
            parentTransactionId: transactionId,
            originalTransactionDate: transaction.date || admin.firestore.Timestamp.now(),
            originalAmount: originalAmount,
            
            // Additional tracking
            reason,
            refundedBy,
            refundMethod,
            
            // Standard fields
            invoiced: false,
            remainingRefundable: availableToRefund - amount,
            
            // Collection field
            collection: 'transactions'
        };
        
        // Add Stripe fields if applicable
        if (stripeRefundId) {
            refundTransaction.stripeRefundId = stripeRefundId;
        }
        if (transaction.stripeCustomerId) {
            refundTransaction.stripeCustomerId = transaction.stripeCustomerId;
        }
        
        // Create refund transaction
        await db.collection('transactions').doc(refundTransactionId).set(refundTransaction);
        console.log(`Created refund transaction: ${refundTransactionId}`);
        
        // Update original transaction
        const newTotalRefunded = previouslyRefunded + amount;
        const newRefundStatus = isFullRefund ? 'full' : 'partial';
        const currentRefundCount = transaction.refundCount || 0;
        
        const updateData = {
            refunded: newRefundStatus,
            totalRefunded: newTotalRefunded,
            refundCount: currentRefundCount + 1,
            lastRefundDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Add to refund history array (Option B from spec)
        const historyEntry = {
            refundTransactionId,
            amount,
            date: admin.firestore.Timestamp.now(),
            refundedBy,
            reason,
            reversed: false
        };
        
        updateData.refundHistory = admin.firestore.FieldValue.arrayUnion(historyEntry);
        
        await db.collection('transactions').doc(transactionId).update(updateData);
        console.log(`Updated original transaction: ${transactionId}`);
        
        // Handle concession block locking if this is a concession-purchase refund
        if (transaction.type === 'concession-purchase') {
            await handleConcessionBlockRefund(db, transactionId, amount, reason);
        }
        
        return {
            success: true,
            refundTransactionId,
            stripeRefundId,
            refundMethod
        };
        
    } catch (error) {
        console.error('Error processing refund:', error);
        
        // If it's already an HttpsError, re-throw it
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        
        // Otherwise, wrap it
        throw new functions.https.HttpsError(
            'internal',
            `Failed to process refund: ${error.message}`
        );
    }
});

/**
 * Handle concession block when refunding a concession-purchase
 */
async function handleConcessionBlockRefund(db, transactionId, refundAmount, reason) {
    try {
        // Find associated concession block
        const blocksSnapshot = await db.collection('concessionBlocks')
            .where('transactionId', '==', transactionId)
            .get();
        
        if (blocksSnapshot.empty) {
            console.log('No concession block found for transaction');
            return;
        }
        
        const blockDoc = blocksSnapshot.docs[0];
        const blockData = blockDoc.data();
        const blockId = blockDoc.id;
        const hasBeenUsed = blockData.remainingQuantity < blockData.originalQuantity;
        
        if (hasBeenUsed) {
            // Lock the block with refund note
            const refundDate = new Date().toLocaleDateString('en-NZ');
            const lockNote = `Refund of $${refundAmount.toFixed(2)} issued on ${refundDate}. Original transaction refunded. ${reason ? `Reason: ${reason}` : ''}`;
            
            await db.collection('concessionBlocks').doc(blockId).update({
                isLocked: true,
                lockedAt: admin.firestore.FieldValue.serverTimestamp(),
                lockedBy: 'system-refund',
                lockNotes: lockNote
            });
            
            console.log(`Locked concession block ${blockId} due to refund`);
        } else {
            // Delete unused block
            await db.collection('concessionBlocks').doc(blockId).delete();
            console.log(`Deleted unused concession block ${blockId}`);
        }
    } catch (error) {
        console.error('Error handling concession block refund:', error);
        // Don't throw - refund should still succeed even if block handling fails
    }
}
