/**
 * actions.js
 * Handles transaction actions (invoice toggle, delete)
 */

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
        
        // Update the icon in the table
        const icon = document.querySelector(`.btn-invoice[data-id="${transaction.id}"]`);
        if (icon) {
            if (newStatus) {
                icon.classList.add('invoiced');
                icon.title = 'Mark as Not Invoiced';
            } else {
                icon.classList.remove('invoiced');
                icon.title = 'Mark as Invoiced';
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
    const modal = document.getElementById('delete-modal');
    const infoEl = document.getElementById('delete-transaction-info');
    
    infoEl.textContent = `${transaction.studentName} - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}`;
    
    modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', () => deleteTransaction(transaction));
}

/**
 * Delete a transaction
 */
async function deleteTransaction(transaction) {
    try {
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .delete();
        
        closeDeleteModal();
        
        // Trigger page refresh
        if (window.onTransactionDeleted) {
            window.onTransactionDeleted(transaction.id);
        }
        
        showSnackbar('Transaction deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showSnackbar('Error deleting transaction: ' + error.message, 'error');
        closeDeleteModal();
    }
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
}
