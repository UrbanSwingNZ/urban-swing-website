/**
 * Modal Module
 * Handles student detail/edit modal
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

// Delete modal instance
let deleteStudentModal = null;

/**
 * View student details (read-only)
 */
function viewStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openStudentModal(student, 'view');
}

/**
 * View transaction history
 */
function viewTransactionHistory(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    // Open the transaction history modal
    openTransactionHistoryModal(studentId);
}

/**
 * Edit student notes (opens simplified notes modal)
 */
function editNotes(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openNotesModal(student);
}

/**
 * Edit student details
 */
function editStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openStudentModal(student, 'edit');
}

/**
 * Open student modal
 */
function openStudentModal(student, mode) {
    const modal = document.getElementById('student-modal');
    const modalTitle = document.getElementById('modal-title');
    const saveBtn = document.getElementById('save-student-btn');
    const editBtn = document.getElementById('edit-student-modal-btn');
    const form = document.getElementById('student-form');
    
    // Populate form fields
    document.getElementById('modal-student-id').value = student.id;
    document.getElementById('modal-firstName').value = student.firstName || '';
    document.getElementById('modal-lastName').value = student.lastName || '';
    document.getElementById('modal-email').value = student.email || '';
    document.getElementById('modal-phoneNumber').value = student.phoneNumber || '';
    document.getElementById('modal-pronouns').value = student.pronouns || '';
    document.getElementById('modal-emailConsent').checked = student.emailConsent || false;
    document.getElementById('modal-over16Confirmed').checked = student.over16Confirmed || false;
    document.getElementById('modal-crewMember').checked = student.crewMember || false;
    document.getElementById('modal-adminNotes').value = student.adminNotes || '';
    
    // Populate timestamps
    document.getElementById('modal-registeredAt').textContent = formatTimestamp(student.registeredAt);
    document.getElementById('modal-createdAt').textContent = formatTimestamp(student.createdAt);
    document.getElementById('modal-updatedAt').textContent = formatTimestamp(student.updatedAt);
    
    // Configure modal based on mode
    const allInputs = form.querySelectorAll('input:not([type="hidden"]), textarea');
    
    if (mode === 'view') {
        modalTitle.textContent = 'Student Details';
        allInputs.forEach(input => {
            input.readOnly = true;
            input.disabled = input.type === 'checkbox';
        });
        saveBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'inline-flex';
    } else if (mode === 'edit') {
        modalTitle.textContent = 'Edit Student - ' + student.firstName + ' ' + student.lastName;
        allInputs.forEach(input => {
            input.readOnly = false;
            input.disabled = false;
        });
        saveBtn.style.display = 'inline-flex';
        if (editBtn) editBtn.style.display = 'none';
    }
    
    modal.style.display = 'flex';
    
    // Store current mode for save handler
    form.dataset.mode = mode;
}

/**
 * Close student modal
 */
function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    modal.style.display = 'none';
}

/**
 * Save student changes
 */
async function saveStudentChanges(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('modal-student-id').value;
    
    try {
        // Update all fields (edit mode only now)
        const updateData = {
            firstName: document.getElementById('modal-firstName').value,
            lastName: document.getElementById('modal-lastName').value,
            email: document.getElementById('modal-email').value,
            phoneNumber: document.getElementById('modal-phoneNumber').value,
            pronouns: document.getElementById('modal-pronouns').value,
            emailConsent: document.getElementById('modal-emailConsent').checked,
            over16Confirmed: document.getElementById('modal-over16Confirmed').checked,
            crewMember: document.getElementById('modal-crewMember').checked,
            adminNotes: document.getElementById('modal-adminNotes').value
        };
        
        await updateStudent(studentId, updateData);
        closeStudentModal();
        
        console.log('Student updated successfully');
    } catch (error) {
        console.error('Error updating student:', error);
        alert('Error updating student. Please try again.');
    }
}

/**
 * Open notes modal (simplified)
 */
function openNotesModal(student) {
    const modal = document.getElementById('notes-modal');
    const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    
    // Populate fields
    document.getElementById('notes-student-id').value = student.id;
    document.getElementById('notes-student-name').textContent = studentName;
    document.getElementById('notes-student-email').textContent = student.email || '';
    document.getElementById('notes-content').value = student.adminNotes || '';
    
    modal.style.display = 'flex';
    
    // Focus on textarea
    setTimeout(() => {
        document.getElementById('notes-content').focus();
    }, 100);
}

/**
 * Close notes modal
 */
function closeNotesModal() {
    const modal = document.getElementById('notes-modal');
    modal.style.display = 'none';
}

/**
 * Save notes
 */
async function saveNotes(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('notes-student-id').value;
    const notes = document.getElementById('notes-content').value;
    
    try {
        const updateData = {
            adminNotes: notes
        };
        
        await updateStudent(studentId, updateData);
        closeNotesModal();
        
        console.log('Notes saved successfully');
    } catch (error) {
        console.error('Error saving notes:', error);
        alert('Error saving notes. Please try again.');
    }
}

/**
 * Initialize modal event listeners
 */
function initializeModalListeners() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        const studentModal = document.getElementById('student-modal');
        const notesModal = document.getElementById('notes-modal');
        
        if (studentModal && e.target === studentModal) {
            closeStudentModal();
        }
        
        if (notesModal && e.target === notesModal) {
            closeNotesModal();
        }
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const studentModal = document.getElementById('student-modal');
            const notesModal = document.getElementById('notes-modal');
            
            if (studentModal && studentModal.style.display === 'flex') {
                closeStudentModal();
            }
            
            if (notesModal && notesModal.style.display === 'flex') {
                closeNotesModal();
            }
        }
    });
    
    // Edit Student button in student modal
    const editStudentModalBtn = document.getElementById('edit-student-modal-btn');
    if (editStudentModalBtn) {
        editStudentModalBtn.addEventListener('click', () => {
            const studentId = document.getElementById('modal-student-id').value;
            if (studentId) {
                editStudent(studentId);
            }
        });
    }
    
    // Transaction History button in student modal
    const transactionHistoryBtn = document.getElementById('transaction-history-btn');
    if (transactionHistoryBtn) {
        transactionHistoryBtn.addEventListener('click', () => {
            const studentId = document.getElementById('modal-student-id').value;
            if (studentId) {
                viewTransactionHistory(studentId);
            }
        });
    }
    
    // Purchase Concessions button in student modal
    const purchaseConcessionsBtn = document.getElementById('purchase-concessions-modal-btn');
    if (purchaseConcessionsBtn) {
        purchaseConcessionsBtn.addEventListener('click', () => {
            const studentId = document.getElementById('modal-student-id').value;
            if (studentId) {
                openPurchaseConcessionsModal(studentId, (result) => {
                    // Refresh student data after purchase
                    console.log('Concession purchase completed');
                    // Could refresh the student's concession balance display here if needed
                });
            }
        });
    }
}

/**
 * Delete Student Functionality
 */

let studentToDelete = null;
let deleteMode = 'soft'; // 'soft' or 'hard'
let studentTransactions = [];
let studentFreeCheckIns = [];

/**
 * Confirm delete student (opens confirmation modal)
 */
async function confirmDeleteStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    studentToDelete = student;
    
    try {
        // Query for transactions
        const transactionsSnapshot = await db.collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        const studentTransactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Query for free check-ins
        const checkInsSnapshot = await db.collection('checkins')
            .where('studentId', '==', studentId)
            .where('entryType', '==', 'free')
            .get();
        
        studentFreeCheckIns = checkInsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Determine delete mode
        const hasActivity = studentTransactions.length > 0 || studentFreeCheckIns.length > 0;
        deleteMode = hasActivity ? 'soft' : 'hard';
        
        // Format name
        const firstName = toTitleCase(student.firstName || '');
        const lastName = toTitleCase(student.lastName || '');
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Build modal content based on delete mode
        let title, message, confirmText, confirmClass;
        
        if (deleteMode === 'hard') {
            // Hard delete - no activity
            title = 'Permanently Delete Student';
            confirmText = 'Permanently Delete';
            confirmClass = 'btn-delete';
            
            message = `
                <p>Are you sure you want to permanently delete <strong>${escapeHtml(fullName)}</strong>?</p>
                <div class="student-info-delete">
                    <p><strong>Email:</strong> ${escapeHtml(student.email || 'N/A')}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(student.phoneNumber || 'N/A')}</p>
                </div>
                <p class="warning-text" style="margin-top: 15px; color: #ff8800;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    This student has no transaction or free class history and will be permanently deleted from the database.
                </p>
                <p class="text-muted" style="margin-top: 15px;">This action cannot be undone.</p>
            `;
        } else {
            // Soft delete - has activity
            title = 'Soft Delete Student';
            confirmText = 'Soft Delete';
            confirmClass = 'btn-delete';
            
            // Build activity list HTML
            let activityHTML = '<div class="activity-list">';
            activityHTML += '<h4>Activity History:</h4>';
            
            // Combine transactions and free check-ins
            const allActivity = [];
            
            // Add transactions
            studentTransactions.forEach(txn => {
                const date = txn.createdAt?.toDate ? txn.createdAt.toDate() : new Date(txn.createdAt);
                const amount = txn.amountPaid !== undefined ? `$${txn.amountPaid.toFixed(2)}` : (txn.amount ? `$${txn.amount.toFixed(2)}` : '$0.00');
                
                // Determine payment method display - show "Online" if stripeCustomerId exists
                const paymentMethod = txn.stripeCustomerId ? 'Online' : formatPaymentMethod(txn.paymentMethod);
                
                allActivity.push({
                    date: date,
                    type: getTransactionTypeLabel(txn.type),
                    paymentMethod: paymentMethod,
                    amount: amount
                });
            });
            
            // Add free check-ins
            studentFreeCheckIns.forEach(checkIn => {
                const date = checkIn.checkinDate?.toDate ? checkIn.checkinDate.toDate() : new Date(checkIn.checkinDate);
                
                allActivity.push({
                    date: date,
                    type: 'Free Class',
                    paymentMethod: 'N/A',
                    amount: '$0.00'
                });
            });
            
            // Sort by date (newest first)
            allActivity.sort((a, b) => b.date - a.date);
            
            // Build table
            activityHTML += '<table class="activity-table">';
            activityHTML += '<thead style="background: linear-gradient(135deg, var(--blue-primary), var(--purple-primary));"><tr><th style="color: white;">Date</th><th style="color: white;">Type</th><th style="color: white;">Payment Method</th><th style="color: white;">Amount</th></tr></thead>';
            activityHTML += '<tbody>';
            
            allActivity.forEach(activity => {
                // Safely format date, with fallback for invalid dates
                let dateStr = 'N/A';
                if (activity.date && activity.date instanceof Date && !isNaN(activity.date)) {
                    dateStr = activity.date.toLocaleDateString('en-NZ', { 
                        day: 'numeric',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }
                
                activityHTML += `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${escapeHtml(activity.type)}</td>
                        <td>${escapeHtml(activity.paymentMethod)}</td>
                        <td>${escapeHtml(activity.amount)}</td>
                    </tr>
                `;
            });
            
            activityHTML += '</tbody></table>';
            activityHTML += '</div>';
            
            message = `
                <p><strong>${escapeHtml(fullName)}</strong> has activity history. They will be soft-deleted.</p>
                ${activityHTML}
                <p style="margin-top: 15px; color: var(--purple-primary);">
                    <i class="fas fa-info-circle"></i> This student can be restored later from the "Show deleted students" filter.
                </p>
            `;
        }
        
        // Create and show the modal
        deleteStudentModal = new ConfirmationModal({
            title: title,
            message: message,
            icon: 'fas fa-trash',
            variant: 'danger',
            confirmText: confirmText,
            confirmClass: confirmClass,
            cancelText: 'Cancel',
            cancelClass: 'btn-cancel',
            onConfirm: async () => {
                await deleteStudent(student.id);
            }
        });
        
        deleteStudentModal.show();
        
    } catch (error) {
        console.error('Error checking student data:', error);
        console.error('Error details:', error.message, error.stack);
        showError('Failed to check student data: ' + (error.message || 'Please try again.'));
    }
}

/**
 * Get readable label for transaction type
 */
function getTransactionTypeLabel(type) {
    const labels = {
        'casual': 'Casual Entry',
        'casual-entry': 'Casual Entry',
        'concession': 'Concession Purchase',
        'concession-purchase': 'Concession Purchase',
        'package': 'Class Package',
        'refund': 'Refund'
    };
    return labels[type] || type;
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method) {
    if (!method) return '-';
    
    // EFTPOS stays uppercase
    if (method.toUpperCase() === 'EFTPOS') {
        return 'EFTPOS';
    }
    
    // Everything else in Title Case
    return toTitleCase(method);
}

/**
 * Delete student from Firestore (hard or soft delete based on mode)
 */
async function deleteStudent(studentId) {
    try {
        if (deleteMode === 'hard') {
            // Hard delete - remove everything
            console.log('Performing hard delete for student:', studentId);
            
            // Delete from students collection
            await db.collection('students').doc(studentId).delete();
            
            // Check for user document (query by studentId field)
            const userSnapshot = await db.collection('users')
                .where('studentId', '==', studentId)
                .limit(1)
                .get();
            
            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const authUid = userDoc.id;
                
                // Delete user document
                await db.collection('users').doc(authUid).delete();
                
                // Delete Firebase Auth user
                try {
                    await firebase.auth().deleteUser(authUid);
                    console.log('Deleted Firebase Auth user:', authUid);
                } catch (authError) {
                    // Auth deletion might fail if user doesn't exist - that's okay
                    console.warn('Could not delete auth user (may not exist):', authError);
                }
            }
            
            console.log('Hard delete completed');
            
        } else {
            // Soft delete - mark as deleted
            console.log('Performing soft delete for student:', studentId);
            
            const currentUser = firebase.auth().currentUser;
            const deletedBy = currentUser ? currentUser.email : 'unknown';
            
            // Update student document
            await db.collection('students').doc(studentId).update({
                deleted: true,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deletedBy: deletedBy
            });
            
            // Check for user document
            const userSnapshot = await db.collection('users')
                .where('studentId', '==', studentId)
                .limit(1)
                .get();
            
            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const authUid = userDoc.id;
                
                // Update user document
                await db.collection('users').doc(authUid).update({
                    deleted: true,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deletedBy: deletedBy
                });
                
                console.log('Soft delete completed - user document marked as deleted');
            }
            
            console.log('Soft delete completed');
        }
        
        // Close modal and reset state
        if (deleteStudentModal) {
            deleteStudentModal.hide();
        }
        studentToDelete = null;
        
        // Data will update automatically via onSnapshot listener
        
    } catch (error) {
        console.error('Error deleting student:', error);
        showError('Failed to delete student: ' + error.message);
    }
}

/**
 * Restore Student Functionality
 */

/**
 * Confirm restore student (show modal)
 */
function confirmRestoreStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    const firstName = toTitleCase(student.firstName || '');
    const lastName = toTitleCase(student.lastName || '');
    const fullName = `${firstName} ${lastName}`.trim();
    const email = student.email || '';
    
    // Populate modal
    document.getElementById('restore-modal-info').innerHTML = `
        <strong>${fullName}</strong><br>
        ${email}
    `;
    
    // Show modal
    document.getElementById('restore-modal').style.display = 'flex';
    
    // Set up confirm button
    const confirmBtn = document.getElementById('confirm-restore-btn');
    confirmBtn.onclick = () => {
        closeRestoreModal();
        restoreStudent(studentId);
    };
}

/**
 * Close restore modal
 */
function closeRestoreModal() {
    document.getElementById('restore-modal').style.display = 'none';
}

/**
 * Restore a soft-deleted student
 */
async function restoreStudent(studentId) {
    try {
        showLoading(true);
        
        console.log('Restoring student:', studentId);
        
        // Update student document
        await db.collection('students').doc(studentId).update({
            deleted: false,
            deletedAt: null,
            deletedBy: null
        });
        
        // Check for user document
        const userSnapshot = await db.collection('users')
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const authUid = userDoc.id;
            
            // Update user document
            await db.collection('users').doc(authUid).update({
                deleted: false,
                deletedAt: null,
                deletedBy: null
            });
            
            console.log('Restore completed - user document restored');
        }
        
        console.log('Restore completed');
        
        // Data will update automatically via onSnapshot listener
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error restoring student:', error);
        showError('Failed to restore student: ' + error.message);
        showLoading(false);
    }
}

// Expose functions globally for onclick handlers
window.viewStudent = viewStudent;
window.editStudent = editStudent;
window.editNotes = editNotes;
window.confirmDeleteStudent = confirmDeleteStudent;
window.confirmRestoreStudent = confirmRestoreStudent;
window.restoreStudent = restoreStudent;
window.viewTransactionHistory = viewTransactionHistory;
window.closeStudentModal = closeStudentModal;
window.initializeModalListeners = initializeModalListeners;


