/**
 * checkin-modal.js - Main orchestrator for check-in modal
 * Handles opening/closing modal and coordinating between modules
 */

/**
 * Open check-in modal
 */
function openCheckinModal(studentId = null) {
    const modal = document.getElementById('checkin-modal');
    const studentSelection = document.getElementById('student-selection');
    const selectedInfo = document.getElementById('selected-student-info');
    
    // Reset form
    resetCheckinForm();
    
    if (studentId) {
        // Student pre-selected
        const student = findStudentById(studentId);
        if (student) {
            setSelectedStudent(student);
            studentSelection.style.display = 'none';
            showSelectedStudent(student);
        }
    } else {
        // No student selected, show search
        studentSelection.style.display = 'block';
        selectedInfo.style.display = 'none';
        initializeModalSearch();
        
        // Focus on search input after modal is displayed
        setTimeout(() => {
            const searchInput = document.getElementById('modal-student-search');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    }
    
    modal.style.display = 'flex';
}

/**
 * Open check-in modal with prepopulated data (for editing)
 */
function openCheckinModalWithData(student, checkinData, checkinId) {
    const modal = document.getElementById('checkin-modal');
    const studentSelection = document.getElementById('student-selection');
    
    // Reset form first
    resetCheckinForm();
    
    // Set editing mode
    setEditingCheckin(checkinId);
    
    // Set selected student
    setSelectedStudent(student);
    studentSelection.style.display = 'none';
    showSelectedStudent(student);
    
    // Wait for concession info to load before prepopulating entry type
    // This prevents the auto-selection logic from overwriting our edit data
    setTimeout(() => {
    
    // Prepopulate entry type
    const entryTypeRadio = document.querySelector(`input[name="entry-type"][value="${checkinData.entryType}"]`);
    if (entryTypeRadio) {
        entryTypeRadio.checked = true;
        // Trigger change event to show relevant sections
        entryTypeRadio.dispatchEvent(new Event('change'));
        
        // After triggering change event, set the payment method or reason
        setTimeout(() => {
            // Prepopulate payment method if casual or casual-student
            if ((checkinData.entryType === 'casual' || checkinData.entryType === 'casual-student') && checkinData.paymentMethod) {
                document.getElementById('payment-method').value = checkinData.paymentMethod;
                // Enable the submit button
                document.getElementById('confirm-checkin-btn').disabled = false;
            }
            
            // Prepopulate free entry reason if free
            if (checkinData.entryType === 'free' && checkinData.freeEntryReason) {
                document.getElementById('free-entry-reason').value = checkinData.freeEntryReason;
                // Enable the submit button
                document.getElementById('confirm-checkin-btn').disabled = false;
            }
        }, 0);
    }
    
    // Prepopulate notes
    if (checkinData.notes) {
        document.getElementById('checkin-notes').value = checkinData.notes;
    }
    
    }, 150); // Wait for concession info to load
    
    modal.style.display = 'flex';
}

/**
 * Close check-in modal
 */
function closeCheckinModal() {
    const modal = document.getElementById('checkin-modal');
    modal.style.display = 'none';
    clearSelectedStudent();
    clearEditingCheckin();
}



/**
 * Initialize modal listeners
 */
function initializeCheckinModalListeners() {
    // View student details button
    const viewStudentDetailsBtn = document.getElementById('view-student-details-btn');
    
    if (viewStudentDetailsBtn) {
        viewStudentDetailsBtn.addEventListener('click', () => {
            const student = getSelectedStudent();
            if (student) {
                // Open student details modal
                openStudentModal(student, 'view');
            }
        });
    }
    
    // Purchase concessions button
    const purchaseBtn = document.getElementById('purchase-concessions-btn');
    
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', () => {
            // Hide check-in modal before opening purchase modal
            document.getElementById('checkin-modal').style.display = 'none';
            
            // Get the selected check-in date
            const selectedDate = getSelectedCheckinDateString();
            
            const student = getSelectedStudent();
            if (student) {
                // Open reusable purchase modal with student ID, callback, parent modal ID, student object, and check-in date
                openPurchaseConcessionsModal(student.id, async (result) => {
                    // Re-set the selected student (state may have been lost)
                    setSelectedStudent(student);
                    // Refresh concession info after purchase
                    await updateConcessionInfo(student);
                }, 'checkin-modal', student, selectedDate);
            } else {
                // Fallback: Try to get the student ID from the hidden field
                const studentIdField = document.getElementById('selected-student-id');
                if (studentIdField && studentIdField.value) {
                    const fallbackStudent = findStudentById(studentIdField.value);
                    if (fallbackStudent) {
                        openPurchaseConcessionsModal(fallbackStudent.id, async (result) => {
                            // Re-set the selected student (state may have been lost)
                            setSelectedStudent(fallbackStudent);
                            await updateConcessionInfo(fallbackStudent);
                        }, 'checkin-modal', fallbackStudent, selectedDate);
                    }
                }
            }
        });
    }
    
    // Confirm check-in button
    const confirmBtn = document.getElementById('confirm-checkin-btn');
    confirmBtn.addEventListener('click', (e) => {
        handleCheckinSubmit();
    });
    
    // Close modal when clicking outside
    document.getElementById('checkin-modal').addEventListener('click', (e) => {
        if (e.target.id === 'checkin-modal') {
            closeCheckinModal();
        }
    });
}
