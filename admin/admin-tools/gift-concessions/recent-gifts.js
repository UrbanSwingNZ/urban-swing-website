/**
 * recent-gifts.js - Recent gifts display and deletion
 * Handles loading, displaying, and deleting recent gift transactions
 */

import { getAllStudents } from './student-search.js';
import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

/**
 * Load recent gifts (last 10)
 */
export async function loadRecentGifts() {
    try {
        const listDiv = document.getElementById('recent-gifts-list');
        listDiv.innerHTML = '<p class="loading-message"><i class="fas fa-spinner fa-spin"></i> Loading recent gifts...</p>';
        
        // Fetch all gift transactions, then sort in JavaScript to avoid needing composite index
        const snapshot = await db.collection('transactions')
            .where('type', '==', 'concession-gift')
            .get();
        
        if (snapshot.empty) {
            listDiv.innerHTML = '<p class="empty-message"><i class="fas fa-inbox"></i> No gifts have been recorded yet</p>';
            return;
        }
        
        // Get all gifts and sort by date in JavaScript
        const gifts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
                const dateA = a.transactionDate?.toDate() || new Date(0);
                const dateB = b.transactionDate?.toDate() || new Date(0);
                return dateB - dateA; // Descending order (newest first)
            })
            .slice(0, 10); // Limit to 10 most recent
        
        // Check if gifts have been reversed
        // The reversed flag is stored directly on the transaction document
        const giftStatuses = gifts.map(gift => ({
            ...gift,
            isReversed: gift.reversed === true
        }));
        
        const allStudents = getAllStudents();
        
        listDiv.innerHTML = giftStatuses.map(gift => {
            const date = gift.transactionDate?.toDate() || new Date();
            const student = allStudents.find(s => s.id === gift.studentId);
            const studentName = student ? getStudentFullName(student) : 'Unknown Student';
            const reversedClass = gift.isReversed ? ' gift-item-reversed' : '';
            
            return `
                <div class="gift-item${reversedClass}">
                    <div class="gift-item-header">
                        <h4>
                            <i class="fas fa-gift"></i> ${escapeHtml(studentName)}
                            ${gift.isReversed ? '<span class="reversed-badge">Reversed</span>' : ''}
                        </h4>
                        <div class="gift-item-actions">
                            <span class="gift-item-date">${formatDate(date)}</span>
                            ${!gift.isReversed ? `
                                <button class="btn-icon btn-delete" 
                                    onclick="deleteGift('${gift.id}', '${escapeHtml(studentName)}')" 
                                    title="Delete this gift">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <p class="gift-item-details">
                        <strong>${gift.numberOfClasses}</strong> class${gift.numberOfClasses !== 1 ? 'es' : ''} gifted
                        ${gift.giftedBy ? `by <strong>${escapeHtml(gift.giftedBy)}</strong>` : ''}
                    </p>
                    ${gift.notes ? `<p class="gift-item-notes">"${escapeHtml(gift.notes)}"</p>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent gifts:', error);
        document.getElementById('recent-gifts-list').innerHTML = 
            '<p class="error-message"><i class="fas fa-exclamation-triangle"></i> Failed to load recent gifts. Please refresh the page.</p>';
    }
}

/**
 * Delete a gift and its associated concession block
 */
export async function deleteGift(transactionId, studentName) {
    try {
        // Get the transaction to find the student
        const transactionDoc = await db.collection('transactions').doc(transactionId).get();
        if (!transactionDoc.exists) {
            showError('Transaction not found');
            return;
        }
        const transactionData = transactionDoc.data();
        const studentId = transactionData.studentId;
        
        // Find associated concessionBlock
        const blocksSnapshot = await db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('transactionId', '==', transactionId)
            .where('packageId', '==', 'gifted-concessions')
            .get();
        
        if (blocksSnapshot.empty) {
            showError('Associated concession block not found');
            return;
        }
        
        // Check if any block is locked or has been used
        let canDelete = true;
        let errorMessage = '';
        
        blocksSnapshot.forEach(doc => {
            const blockData = doc.data();
            if (blockData.isLocked === true) {
                canDelete = false;
                errorMessage = 'Cannot delete this gift - the concession block is locked. Unlock it first.';
            } else if (blockData.remainingQuantity < blockData.originalQuantity) {
                canDelete = false;
                const used = blockData.originalQuantity - blockData.remainingQuantity;
                errorMessage = `Cannot delete this gift - ${used} class${used !== 1 ? 'es have' : ' has'} already been used from this block.`;
            }
        });
        
        if (!canDelete) {
            showError(errorMessage);
            return;
        }
        
        // Show confirmation modal
        const modal = new ConfirmationModal({
            title: 'Delete Gift',
            message: `Are you sure you want to delete this gift to <strong>${studentName}</strong>?<br><br>This will permanently remove both the gift transaction and the associated concession block.`,
            confirmText: 'Yes, Delete',
            confirmClass: 'btn-danger',
            cancelText: 'Cancel',
            cancelClass: 'btn-cancel',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    showLoading(true, 'Deleting gift...');
                    
                    // Delete the concession blocks
                    const batch = db.batch();
                    blocksSnapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    
                    // Delete the transaction
                    await db.collection('transactions').doc(transactionId).delete();
                    
                    // Update student's balance
                    await updateStudentBalance(studentId);
                    
                    showLoading(false);
                    
                    // Show success message
                    showSnackbar('Gift deleted successfully', 'success');
                    
                    // Reload the gifts list
                    await loadRecentGifts();
                    
                } catch (error) {
                    showLoading(false);
                    console.error('Delete error:', error);
                    showError('Failed to delete gift: ' + error.message);
                }
            }
        });
        
        modal.show();
        
    } catch (error) {
        console.error('Error preparing to delete gift:', error);
        showError('Error: ' + error.message);
    }
}

/**
 * Get student full name
 */
function getStudentFullName(student) {
    if (!student) return 'Unknown';
    const firstName = student.firstName || '';
    const lastName = student.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
}

/**
 * Show/hide loading spinner
 */
function showLoading(show = true, message = 'Processing...') {
    if (show) {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.showGlobal(message);
        }
    } else {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.hideGlobal();
        }
    }
}

/**
 * Show error message
 */
function showError(message) {
    // Create modal using BaseModal directly to only have one button
    import('/components/modals/modal-base.js').then(({ BaseModal }) => {
        const modal = new BaseModal({
            title: '<i class="fas fa-exclamation-circle"></i> Error',
            content: message,
            size: 'small',
            buttons: [
                {
                    text: 'OK',
                    class: 'btn-cancel',
                    onClick: (m) => m.hide()
                }
            ]
        });
        
        // Add danger variant styling
        modal.element.classList.add('modal-danger');
        modal.show();
    });
}

// Import centralized utilities
import { formatDate, escapeHtml } from '/js/utils/index.js';

// Expose deleteGift to window for onclick handlers
window.deleteGift = deleteGift;
