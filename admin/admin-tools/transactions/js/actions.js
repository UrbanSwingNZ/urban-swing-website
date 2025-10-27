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
    const modal = document.getElementById('delete-modal');
    const titleEl = document.getElementById('delete-modal-title');
    const messageEl = document.getElementById('delete-modal-message');
    const infoEl = document.getElementById('delete-modal-info');
    const btnTextEl = document.getElementById('delete-modal-btn-text');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    // Customize modal for transaction deletion
    titleEl.textContent = 'Delete Transaction';
    messageEl.textContent = 'Are you sure you want to delete this transaction?';
    infoEl.innerHTML = `<strong>${transaction.studentName}</strong> - $${transaction.amount.toFixed(2)} - ${formatDate(transaction.date)}`;
    btnTextEl.textContent = 'Delete Transaction';
    
    // Remove any existing event listeners by replacing the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add click handler for confirm button
    newConfirmBtn.addEventListener('click', () => {
        deleteTransaction(transaction);
    });
    
    modal.style.display = 'flex';
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
        
        closeDeleteModal();
        
        // Trigger page refresh
        if (window.onTransactionDeleted) {
            window.onTransactionDeleted(transaction.id);
        }
        
        showSnackbar('Transaction reversed successfully', 'success');
        
    } catch (error) {
        console.error('Error reversing transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
        closeDeleteModal();
    }
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
}
