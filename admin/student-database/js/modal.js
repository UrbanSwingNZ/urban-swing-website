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
    } else if (mode === 'edit') {
        modalTitle.textContent = 'Edit Student - ' + student.firstName + ' ' + student.lastName;
        allInputs.forEach(input => {
            input.readOnly = false;
            input.disabled = false;
        });
        saveBtn.style.display = 'inline-flex';
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
}
