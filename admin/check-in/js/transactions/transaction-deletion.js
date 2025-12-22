/**
 * transaction-deletion.js
 * Handles transaction deletion (marking as reversed) and cleanup
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { formatCurrency } from '/js/utils/index.js';

/**
 * Confirm transaction deletion
 * @param {Object} transaction - Transaction data
 */
export function confirmDeleteCheckinTransaction(transaction) {
    // Format date as d/mm/yyyy
    const day = transaction.date.getDate();
    const month = transaction.date.getMonth() + 1;
    const year = transaction.date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    // Create and show delete confirmation modal
    const deleteModal = new ConfirmationModal({
        title: 'Delete Transaction',
        message: `
            <p>Are you sure you want to delete this transaction?</p>
            <div class="student-info-delete">
                <strong>${transaction.studentName}</strong><br>
                ${formattedDate} · ${formatCurrency(transaction.amount)}
            </div>
            <p class="text-muted" style="margin-top: 15px;">This action cannot be undone.</p>
        `,
        icon: 'fas fa-trash',
        variant: 'danger',
        confirmText: 'Delete Transaction',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            await deleteCheckinTransaction(transaction);
        }
    });
    
    deleteModal.show();
}

/**
 * Delete a transaction (mark as reversed)
 * @param {Object} transaction - Transaction data
 */
async function deleteCheckinTransaction(transaction) {
    try {
        // Mark transaction as reversed
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // If this is a concession purchase, delete the associated concession block and adjust student balance
        if (transaction.type === 'concession-purchase') {
            // Find the associated concession block
            const blocksSnapshot = await firebase.firestore()
                .collection('concessionBlocks')
                .where('transactionId', '==', transaction.id)
                .get();
            
            if (!blocksSnapshot.empty) {
                const blockDoc = blocksSnapshot.docs[0];
                const blockData = blockDoc.data();
                
                // Calculate remaining classes that were unused
                const unusedClasses = blockData.remainingQuantity;
                
                // Store the block data in the transaction for potential restoration
                await firebase.firestore()
                    .collection(transaction.collection)
                    .doc(transaction.id)
                    .update({
                        deletedBlockData: {
                            blockId: blockDoc.id,
                            ...blockData
                        }
                    });
                
                // Delete the concession block
                await firebase.firestore()
                    .collection('concessionBlocks')
                    .doc(blockDoc.id)
                    .delete();
                
                // Adjust student's concession balance (subtract unused classes)
                if (transaction.studentId && unusedClasses > 0) {
                    await firebase.firestore()
                        .collection('students')
                        .doc(transaction.studentId)
                        .update({
                            concessionBalance: firebase.firestore.FieldValue.increment(-unusedClasses),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                }
            }
        }
        
        // Reload transactions
        if (typeof window.loadCheckinTransactions === 'function') {
            await window.loadCheckinTransactions();
        }
        
        showSnackbar('Transaction reversed successfully', 'success');
        
    } catch (error) {
        console.error('Error reversing transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
    }
}

/**
 * Restore a reversed transaction (unmark as reversed)
 * @param {Object} transaction - Transaction data
 */
export async function restoreCheckinTransaction(transaction) {
    try {
        // Fetch full transaction data to check for deleted block data
        const transactionDoc = await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .get();
        
        if (!transactionDoc.exists) {
            showSnackbar('Transaction not found', 'error');
            return;
        }
        
        const transactionData = transactionDoc.data();
        
        // If this is a concession purchase, restore the concession block
        if (transaction.type === 'concession-purchase' && transactionData.deletedBlockData) {
            const blockData = transactionData.deletedBlockData;
            const unusedClasses = blockData.remainingQuantity;
            
            // Recreate the concession block
            const blockDataToRestore = { ...blockData };
            delete blockDataToRestore.blockId; // Remove blockId as it's not part of the document data
            
            await firebase.firestore()
                .collection('concessionBlocks')
                .doc(blockData.blockId)
                .set(blockDataToRestore);
            
            // Restore student's concession balance (add back unused classes)
            if (transaction.studentId && unusedClasses > 0) {
                await firebase.firestore()
                    .collection('students')
                    .doc(transaction.studentId)
                    .update({
                        concessionBalance: firebase.firestore.FieldValue.increment(unusedClasses),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }
        }
        
        // Unmark as reversed and remove deleted block data
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                reversed: false,
                reversedAt: firebase.firestore.FieldValue.delete(),
                deletedBlockData: firebase.firestore.FieldValue.delete()
            });
        
        showSnackbar('Transaction restored successfully', 'success');
        
    } catch (error) {
        console.error('Error restoring transaction:', error);
        showSnackbar('Error restoring transaction: ' + error.message, 'error');
    }
}
