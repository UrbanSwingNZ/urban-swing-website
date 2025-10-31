/**
 * Concessions Actions Module
 * Handles delete confirmation modal and related utilities
 */

/**
 * Format date for display
 */
function formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-NZ', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmationModal(blockId, studentId) {
    const modal = document.getElementById('delete-modal');
    const titleEl = document.getElementById('delete-modal-title');
    const messageEl = document.getElementById('delete-modal-message');
    const infoEl = document.getElementById('delete-modal-info');
    const btnTextEl = document.getElementById('delete-modal-btn-text');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    // Customize modal for concession block deletion
    titleEl.textContent = 'Delete Concession';
    messageEl.textContent = 'Are you sure you want to delete this concession block?';
    infoEl.innerHTML = ''; // Clear any student info
    infoEl.style.display = 'none'; // Hide the empty info box
    btnTextEl.textContent = 'Delete Block';
    
    // Remove any existing event listeners by replacing the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add click handler for confirm button
    newConfirmBtn.addEventListener('click', async () => {
        try {
            await deleteConcessionBlock(blockId);
            closeDeleteModal();
            showSnackbar('Concession block deleted successfully', 'success');
            // Small delay to ensure Firestore propagates the delete
            await new Promise(resolve => setTimeout(resolve, 100));
            // Refresh the concessions detail modal
            await showConcessionsDetail(studentId);
        } catch (error) {
            closeDeleteModal();
            showSnackbar('Error deleting block: ' + error.message, 'error');
        }
    });
    
    modal.style.display = 'flex';
}

/**
 * Close delete confirmation modal (uses existing closeDeleteModal function)
 */
function closeDeleteConfirmationModal() {
    closeDeleteModal();
}
