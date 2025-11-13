/**
 * Modal Module
 * Handles student detail/edit modal
 */

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
        const deleteModal = document.getElementById('delete-modal');
        
        if (studentModal && e.target === studentModal) {
            closeStudentModal();
        }
        
        if (notesModal && e.target === notesModal) {
            closeNotesModal();
        }
        
        if (deleteModal && e.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const studentModal = document.getElementById('student-modal');
            const notesModal = document.getElementById('notes-modal');
            const deleteModal = document.getElementById('delete-modal');
            
            if (studentModal && studentModal.style.display === 'flex') {
                closeStudentModal();
            }
            
            if (notesModal && notesModal.style.display === 'flex') {
                closeNotesModal();
            }
            
            if (deleteModal && deleteModal.style.display === 'flex') {
                closeDeleteModal();
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
    
    // Show loading state in modal
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'flex';
    
    const titleEl = document.getElementById('delete-modal-title');
    const messageEl = document.getElementById('delete-modal-message');
    const infoDiv = document.getElementById('delete-modal-info');
    const btnTextEl = document.getElementById('delete-modal-btn-text');
    
    titleEl.textContent = 'Checking student data...';
    messageEl.textContent = 'Please wait...';
    infoDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    try {
        // Query for transactions
        const transactionsSnapshot = await db.collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        studentTransactions = [];
        transactionsSnapshot.forEach(doc => {
            studentTransactions.push({ id: doc.id, ...doc.data() });
        });
        
        // Query for free check-ins
        const checkInsSnapshot = await db.collection('checkins')
            .where('studentId', '==', studentId)
            .where('entryType', '==', 'free')
            .get();
        
        studentFreeCheckIns = [];
        checkInsSnapshot.forEach(doc => {
            studentFreeCheckIns.push({ id: doc.id, ...doc.data() });
        });
        
        // Determine delete mode
        const hasActivity = studentTransactions.length > 0 || studentFreeCheckIns.length > 0;
        deleteMode = hasActivity ? 'soft' : 'hard';
        
        // Format name
        const firstName = toTitleCase(student.firstName || '');
        const lastName = toTitleCase(student.lastName || '');
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Update modal based on delete mode
        if (deleteMode === 'hard') {
            // Hard delete - no activity
            titleEl.textContent = 'Permanently Delete Student';
            messageEl.textContent = `Are you sure you want to permanently delete ${fullName}?`;
            btnTextEl.textContent = 'Permanently Delete';
            
            infoDiv.innerHTML = `
                <p><strong>Email:</strong> ${escapeHtml(student.email || 'N/A')}</p>
                <p><strong>Phone:</strong> ${escapeHtml(student.phoneNumber || 'N/A')}</p>
                <p class="warning-text" style="margin-top: 15px; color: #ff8800;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    This student has no transaction or free class history and will be permanently deleted from the database.
                </p>
            `;
        } else {
            // Soft delete - has activity
            titleEl.textContent = 'Soft Delete Student';
            messageEl.textContent = `${fullName} has activity history. They will be soft-deleted (can be restored later).`;
            btnTextEl.textContent = 'Soft Delete';
            
            // Build activity list HTML
            let activityHTML = '<div class="activity-list">';
            activityHTML += '<h4>Activity History:</h4>';
            
            // Combine transactions and free check-ins
            const allActivity = [];
            
            // Add transactions
            studentTransactions.forEach(txn => {
                const date = txn.createdAt?.toDate ? txn.createdAt.toDate() : new Date(txn.createdAt);
                allActivity.push({
                    date: date,
                    type: getTransactionTypeLabel(txn.type),
                    paymentMethod: txn.paymentMethod || 'N/A',
                    amount: txn.amount ? `$${txn.amount.toFixed(2)}` : 'N/A',
                    status: txn.reversed ? 'Reversed' : 'Active'
                });
            });
            
            // Add free check-ins
            studentFreeCheckIns.forEach(checkIn => {
                const date = checkIn.checkInTime?.toDate ? checkIn.checkInTime.toDate() : new Date(checkIn.checkInTime);
                allActivity.push({
                    date: date,
                    type: 'Free Class',
                    paymentMethod: 'N/A',
                    amount: 'Free',
                    status: 'N/A'
                });
            });
            
            // Sort by date (newest first)
            allActivity.sort((a, b) => b.date - a.date);
            
            // Build table
            activityHTML += '<table class="activity-table">';
            activityHTML += '<thead><tr><th>Date</th><th>Type</th><th>Payment Method</th><th>Amount</th><th>Status</th></tr></thead>';
            activityHTML += '<tbody>';
            
            allActivity.forEach(activity => {
                const dateStr = activity.date.toLocaleDateString('en-NZ', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
                activityHTML += `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${escapeHtml(activity.type)}</td>
                        <td>${escapeHtml(activity.paymentMethod)}</td>
                        <td>${escapeHtml(activity.amount)}</td>
                        <td>${escapeHtml(activity.status)}</td>
                    </tr>
                `;
            });
            
            activityHTML += '</tbody></table>';
            activityHTML += '</div>';
            
            infoDiv.innerHTML = activityHTML;
        }
        
        // Set up delete button click handler
        const deleteBtn = document.getElementById('confirm-delete-btn');
        deleteBtn.onclick = () => deleteStudent(student.id);
        
    } catch (error) {
        console.error('Error checking student data:', error);
        closeDeleteModal();
        showError('Failed to check student data. Please try again.');
    }
}

/**
 * Get readable label for transaction type
 */
function getTransactionTypeLabel(type) {
    const labels = {
        'casual': 'Casual Entry',
        'concession': 'Concession Purchase',
        'package': 'Class Package',
        'refund': 'Refund'
    };
    return labels[type] || type;
}

/**
 * Close delete confirmation modal
 */
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'none';
    studentToDelete = null;
}

/**
 * Delete student from Firestore (hard or soft delete based on mode)
 */
async function deleteStudent(studentId) {
    const deleteBtn = document.getElementById('confirm-delete-btn');
    const originalText = deleteBtn.innerHTML;
    
    try {
        // Disable button and show loading state
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
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
                
                // Disable Firebase Auth user via Cloud Function
                try {
                    const disableUserAccount = firebase.functions().httpsCallable('disableUserAccount');
                    await disableUserAccount({ authUid: authUid });
                    console.log('Disabled Firebase Auth user:', authUid);
                } catch (authError) {
                    console.error('Error disabling auth user:', authError);
                    // Continue even if auth disable fails
                }
            }
            
            console.log('Soft delete completed');
        }
        
        // Close modal
        closeDeleteModal();
        
        // Data will update automatically via onSnapshot listener
        
    } catch (error) {
        console.error('Error deleting student:', error);
        showError('Failed to delete student: ' + error.message);
        
        // Reset button
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    }
}

/**
 * Restore Student Functionality
 */

/**
 * Confirm restore student (simple confirmation)
 */
function confirmRestoreStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    const firstName = toTitleCase(student.firstName || '');
    const lastName = toTitleCase(student.lastName || '');
    const fullName = `${firstName} ${lastName}`.trim();
    
    const confirmed = confirm(`Are you sure you want to restore ${fullName}?\n\nThis will reactivate their account and they will be able to log in to the student portal.`);
    
    if (confirmed) {
        restoreStudent(studentId);
    }
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
            
            // Re-enable Firebase Auth user via Cloud Function
            try {
                const enableUserAccount = firebase.functions().httpsCallable('enableUserAccount');
                await enableUserAccount({ authUid: authUid });
                console.log('Enabled Firebase Auth user:', authUid);
            } catch (authError) {
                console.error('Error enabling auth user:', authError);
                showError('Student restored but failed to enable login. Please contact support.');
            }
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

