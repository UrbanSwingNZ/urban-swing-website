/**
 * Concessions Actions Module
 * Handles delete confirmation modal and related utilities
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

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
    const modal = new ConfirmationModal({
        title: 'Delete Concession',
        message: 'Are you sure you want to delete this concession block?',
        icon: 'fas fa-trash-alt',
        confirmText: 'Delete Block',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        variant: 'danger',
        onConfirm: async () => {
            try {
                await deleteConcessionBlock(blockId);
                showSnackbar('Concession block deleted successfully', 'success');
                // Small delay to ensure Firestore propagates the delete
                await new Promise(resolve => setTimeout(resolve, 100));
                // Refresh the concessions detail modal
                await showConcessionsDetail(studentId);
            } catch (error) {
                showSnackbar('Error deleting block: ' + error.message, 'error');
            }
        }
    });
    
    modal.show();
}

/**
 * Close delete confirmation modal (uses existing closeDeleteModal function)
 */
function closeDeleteConfirmationModal() {
    // No longer needed with ConfirmationModal
}

// Expose functions globally for non-module scripts
window.formatDate = formatDate;
window.showDeleteConfirmationModal = showDeleteConfirmationModal;
window.closeDeleteConfirmationModal = closeDeleteConfirmationModal;
