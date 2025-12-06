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

// Expose functions globally
window.toggleInvoiced = toggleInvoiced;
window.confirmDelete = confirmDelete;
