/**
 * actions.js
 * Handles transaction actions (invoice toggle, delete)
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

/**
 * Toggle invoiced status
 */
async function toggleInvoiced(transaction) {
    try {
        const newStatus = !transaction.invoiced;
        
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                invoiced: newStatus
            });
        
        // Update local data
        transaction.invoiced = newStatus;
        
        // Update the button in the table
        const btn = document.querySelector(`.btn-invoice[data-id="${transaction.id}"]`);
        if (btn) {
            if (newStatus) {
                btn.classList.add('invoiced');
                btn.title = 'Mark as Not Invoiced';
            } else {
                btn.classList.remove('invoiced');
                btn.title = 'Mark as Invoiced';
            }
        }
        
        showSnackbar(`Transaction marked as ${newStatus ? 'invoiced' : 'not invoiced'}`, 'success');
        
    } catch (error) {
        console.error('Error toggling invoiced status:', error);
        showSnackbar('Error updating invoice status: ' + error.message, 'error');
    }
}

/**
 * Confirm transaction deletion
 */
function confirmDelete(transaction) {
    // Special handling for refund transactions
    if (transaction.type === 'refund') {
        confirmRefundReversal(transaction);
        return;
    }
    
    // Special handling for casual transactions with check-ins
    if ((transaction.type === 'casual' || transaction.type === 'casual-student') && transaction.checkinId) {
        confirmCasualTransactionDeletion(transaction);
        return;
    }
    
    // Special handling for concession-purchase transactions
    if (transaction.type === 'concession-purchase') {
        confirmConcessionPurchaseDeletion(transaction);
        return;
    }
    
    // Standard deletion confirmation
    const modal = new ConfirmationModal({
        title: 'Delete Transaction',
        icon: 'fas fa-trash',
        message: `
            <p>Are you sure you want to delete this transaction?</p>
            <div class="student-info-delete">
                <strong>${transaction.studentName}</strong> - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}
            </div>
            <p class="text-muted" style="margin-top: 15px;">This action cannot be undone.</p>
        `,
        variant: 'danger',
        confirmText: 'Delete Transaction',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            await deleteTransaction(transaction);
        }
    });
    
    modal.show();
}

/**
 * Confirm deletion of casual transaction with optional check-in deletion
 */
function confirmCasualTransactionDeletion(transaction) {
    const modal = new ConfirmationModal({
        title: 'Delete Transaction & Check-in?',
        icon: 'fas fa-exclamation-triangle',
        message: `
            <p>This transaction has an associated check-in.</p>
            <div class="student-info-delete">
                <strong>${transaction.studentName}</strong> - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}
            </div>
            <div style="margin-top: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="delete-checkin-checkbox" style="cursor: pointer;" />
                    <span>Also delete the associated check-in record</span>
                </label>
            </div>
        `,
        variant: 'warning',
        confirmText: 'Delete Transaction',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            const deleteCheckin = document.getElementById('delete-checkin-checkbox')?.checked || false;
            await deleteCasualTransaction(transaction, deleteCheckin);
        }
    });
    
    modal.show();
}

/**
 * Confirm deletion of concession-purchase transaction
 */
async function confirmConcessionPurchaseDeletion(transaction) {
    try {
        // Check if there's an associated concession block
        let blockDoc = null;
        let blockId = null;
        let blockData = null;
        
        // First try to get block ID directly from transaction
        if (transaction.concessionBlockId) {
            try {
                blockDoc = await db.collection('concessionBlocks').doc(transaction.concessionBlockId).get();
                if (blockDoc.exists) {
                    blockId = blockDoc.id;
                    blockData = blockDoc.data();
                }
            } catch (error) {
                console.log('Block not found by concessionBlockId, trying transactionId query');
            }
        }
        
        // If not found by ID, try querying by transactionId
        if (!blockDoc || !blockDoc.exists) {
            const blocksSnapshot = await db.collection('concessionBlocks')
                .where('transactionId', '==', transaction.id)
                .get();
            
            if (!blocksSnapshot.empty) {
                blockDoc = blocksSnapshot.docs[0];
                blockId = blockDoc.id;
                blockData = blockDoc.data();
            }
        }
        
        if (!blockId) {
            // No block found - standard deletion
            const modal = new ConfirmationModal({
                title: 'Delete Transaction',
                icon: 'fas fa-trash',
                message: `
                    <p>Are you sure you want to delete this transaction?</p>
                    <div class="student-info-delete">
                        <strong>${transaction.studentName}</strong> - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}
                    </div>
                    <p class="text-muted" style="margin-top: 15px;">No associated concession block found.</p>
                `,
                variant: 'danger',
                confirmText: 'Delete Transaction',
                confirmClass: 'btn-delete',
                cancelText: 'Cancel',
                cancelClass: 'btn-cancel',
                onConfirm: async () => {
                    await deleteTransaction(transaction);
                }
            });
            modal.show();
            return;
        }
        
        const hasBeenUsed = blockData.remainingQuantity < blockData.originalQuantity;
        
        if (hasBeenUsed) {
            // Block has been used - will be locked instead of deleted
            const modal = new ConfirmationModal({
                title: 'Delete Transaction (Block Will Be Locked)',
                icon: 'fas fa-lock',
                message: `
                    <p>This transaction has an associated concession block that has been used.</p>
                    <div class="student-info-delete">
                        <strong>${transaction.studentName}</strong> - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}
                    </div>
                    <p style="margin-top: 15px;"><strong>The concession block will be locked, not deleted.</strong></p>
                    <p class="text-muted">Remaining: ${blockData.remainingQuantity} / ${blockData.originalQuantity}</p>
                `,
                variant: 'warning',
                confirmText: 'Delete & Lock Block',
                confirmClass: 'btn-delete',
                cancelText: 'Cancel',
                cancelClass: 'btn-cancel',
                onConfirm: async () => {
                    await deleteConcessionPurchaseTransaction(transaction, blockId, true);
                }
            });
            modal.show();
        } else {
            // Block is unused - will be deleted
            const modal = new ConfirmationModal({
                title: 'Delete Transaction & Block',
                icon: 'fas fa-trash',
                message: `
                    <p>This transaction has an unused concession block.</p>
                    <div class="student-info-delete">
                        <strong>${transaction.studentName}</strong> - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}
                    </div>
                    <p style="margin-top: 15px;"><strong>The concession block will be permanently deleted.</strong></p>
                `,
                variant: 'danger',
                confirmText: 'Delete Transaction & Block',
                confirmClass: 'btn-delete',
                cancelText: 'Cancel',
                cancelClass: 'btn-cancel',
                onConfirm: async () => {
                    await deleteConcessionPurchaseTransaction(transaction, blockId, false);
                }
            });
            modal.show();
        }
    } catch (error) {
        console.error('Error checking concession block:', error);
        showSnackbar('Error checking concession block: ' + error.message, 'error');
    }
}

/**
 * Confirm refund reversal (prevent Stripe refunds from being reversed)
 */
function confirmRefundReversal(transaction) {
    // Check if this is a Stripe refund
    if (transaction.refundMethod === 'stripe') {
        showSnackbar('Stripe refunds cannot be reversed. Money has already been returned to the customer.', 'error');
        return;
    }
    
    const modal = new ConfirmationModal({
        title: 'Reverse Refund',
        icon: 'fas fa-undo-alt',
        message: `
            <p>Are you sure you want to reverse this refund?</p>
            <div class="student-info-delete">
                <strong>${transaction.studentName}</strong> - Refund of $${transaction.amountRefunded.toFixed(2)}
            </div>
            <p style="margin-top: 15px;">This will restore the refundable amount on the original transaction.</p>
        `,
        variant: 'warning',
        confirmText: 'Reverse Refund',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            await reverseRefund(transaction.id);
        }
    });
    
    modal.show();
}

/**
 * Delete a transaction (mark as reversed instead of permanently deleting)
 */
async function deleteTransaction(transaction) {
    try {
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Trigger page refresh
        if (window.onTransactionDeleted) {
            window.onTransactionDeleted(transaction.id);
        }
        
        showSnackbar('Transaction reversed successfully', 'success');
        
    } catch (error) {
        console.error('Error reversing transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
    }
}

/**
 * Delete casual transaction with optional check-in deletion
 */
async function deleteCasualTransaction(transaction, deleteCheckin) {
    try {
        // First, reverse the transaction
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // If requested, delete the check-in
        if (deleteCheckin && transaction.checkinId) {
            await db.collection('checkins').doc(transaction.checkinId).delete();
            showSnackbar('Transaction reversed and check-in deleted successfully', 'success');
        } else {
            showSnackbar('Transaction reversed successfully', 'success');
        }
        
        // Trigger page refresh
        if (window.onTransactionDeleted) {
            window.onTransactionDeleted(transaction.id);
        }
        
    } catch (error) {
        console.error('Error reversing casual transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
    }
}

/**
 * Delete concession-purchase transaction and handle associated block
 */
async function deleteConcessionPurchaseTransaction(transaction, blockId, lockBlock) {
    try {
        // First, reverse the transaction
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        if (lockBlock) {
            // Lock the concession block
            const lockNote = `Transaction reversed on ${new Date().toLocaleDateString('en-NZ')}. Original purchase of $${transaction.amount.toFixed(2)}.`;
            await db.collection('concessionBlocks').doc(blockId).update({
                isLocked: true,
                lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lockedBy: auth.currentUser.uid,
                lockNotes: lockNote
            });
            showSnackbar('Transaction reversed and concession block locked successfully', 'success');
        } else {
            // Delete the concession block
            await db.collection('concessionBlocks').doc(blockId).delete();
            showSnackbar('Transaction reversed and concession block deleted successfully', 'success');
        }
        
        // Trigger page refresh
        if (window.onTransactionDeleted) {
            window.onTransactionDeleted(transaction.id);
        }
        
    } catch (error) {
        console.error('Error reversing concession transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
    }
}

// Expose functions globally
window.toggleInvoiced = toggleInvoiced;
window.confirmDelete = confirmDelete;
