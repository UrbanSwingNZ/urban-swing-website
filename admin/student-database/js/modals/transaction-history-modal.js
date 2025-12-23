/**
 * transaction-history-modal.js
 * Handles opening transaction history modal and event listeners
 */

/**
 * View transaction history
 * @param {string} studentId - Student ID
 */
export function viewTransactionHistory(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    // Open the transaction history modal
    openTransactionHistoryModal(studentId);
}

/**
 * Initialize modal event listeners
 * Sets up click outside, escape key, and button listeners
 */
export function initializeModalListeners() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        const studentModal = document.getElementById('student-modal');
        const notesModal = document.getElementById('notes-modal');
        
        if (studentModal && e.target === studentModal) {
            const closeStudentModal = window.closeStudentModal;
            if (closeStudentModal) closeStudentModal();
        }
        
        if (notesModal && e.target === notesModal) {
            const closeNotesModal = window.closeNotesModal;
            if (closeNotesModal) closeNotesModal();
        }
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const studentModal = document.getElementById('student-modal');
            const notesModal = document.getElementById('notes-modal');
            
            if (studentModal && studentModal.style.display === 'flex') {
                const closeStudentModal = window.closeStudentModal;
                if (closeStudentModal) closeStudentModal();
            }
            
            if (notesModal && notesModal.style.display === 'flex') {
                const closeNotesModal = window.closeNotesModal;
                if (closeNotesModal) closeNotesModal();
            }
        }
    });
    
    // Edit Student button in student modal
    const editStudentModalBtn = document.getElementById('edit-student-modal-btn');
    if (editStudentModalBtn) {
        editStudentModalBtn.addEventListener('click', () => {
            const studentId = document.getElementById('modal-student-id').value;
            if (studentId && window.editStudent) {
                window.editStudent(studentId);
            }
        });
    }
    
    // Transaction History button in student modal
    const transactionHistoryBtn = document.getElementById('transaction-history-btn');
    if (transactionHistoryBtn) {
        transactionHistoryBtn.addEventListener('click', () => {
            const studentId = document.getElementById('modal-student-id').value;
            if (studentId && window.viewTransactionHistory) {
                window.viewTransactionHistory(studentId);
            }
        });
    }
    
    // Purchase Concessions button in student modal
    const purchaseConcessionsBtn = document.getElementById('purchase-concessions-modal-btn');
    if (purchaseConcessionsBtn) {
        purchaseConcessionsBtn.addEventListener('click', () => {
            const studentId = document.getElementById('modal-student-id').value;
            if (studentId && typeof openPurchaseConcessionsModal === 'function') {
                openPurchaseConcessionsModal(studentId, (result) => {
                    // Refresh student data after purchase
                    console.log('Concession purchase completed');
                    // Could refresh the student's concession balance display here if needed
                });
            }
        });
    }
}
