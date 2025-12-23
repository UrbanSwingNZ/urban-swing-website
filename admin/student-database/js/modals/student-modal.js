/**
 * student-modal.js
 * Handles viewing and editing student details
 */

/**
 * View student details (read-only)
 * @param {string} studentId - Student ID
 */
export function viewStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openStudentModal(student, 'view');
}

/**
 * Edit student details
 * @param {string} studentId - Student ID
 */
export function editStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openStudentModal(student, 'edit');
}

/**
 * Open student modal
 * @param {object} student - Student object
 * @param {string} mode - 'view' or 'edit'
 */
export function openStudentModal(student, mode) {
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
export function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    modal.style.display = 'none';
}

/**
 * Save student changes
 * @param {Event} event - Form submit event
 */
export async function saveStudentChanges(event) {
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
