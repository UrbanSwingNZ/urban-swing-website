/**
 * notes-modal.js
 * Handles editing student notes in a simplified modal
 */

/**
 * Edit student notes (opens simplified notes modal)
 * @param {string} studentId - Student ID
 */
export function editNotes(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openNotesModal(student);
}

/**
 * Open notes modal (simplified)
 * @param {object} student - Student object
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
export function closeNotesModal() {
    const modal = document.getElementById('notes-modal');
    modal.style.display = 'none';
}

/**
 * Save notes
 * @param {Event} event - Form submit event
 */
export async function saveNotes(event) {
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
