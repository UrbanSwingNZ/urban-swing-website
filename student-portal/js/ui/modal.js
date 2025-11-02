/**
 * modal.js - Modal Management
 * Handles showing and hiding modals
 */

/**
 * Show the email exists warning modal
 * @param {Array} students - Array of students with matching email
 */
function showEmailExistsModal(students) {
    const modal = document.getElementById('email-exists-modal');
    if (!modal) {
        console.error('Email exists modal not found');
        return;
    }
    
    // Populate student list - only show email for privacy
    const listContainer = document.getElementById('existing-students-list');
    listContainer.innerHTML = students.map(student => `
        <div class="existing-student-item">
            <span>${escapeHtml(student.email)}</span>
        </div>
    `).join('');
    
    // Set up button handler
    const closeBtn = document.getElementById('close-modal-btn');
    
    // Remove any existing event listeners by cloning button
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    // Add new event listener
    newCloseBtn.addEventListener('click', () => {
        hideEmailExistsModal();
    });
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Hide the email exists warning modal
 */
function hideEmailExistsModal() {
    const modal = document.getElementById('email-exists-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('email-exists-modal');
    if (e.target === modal) {
        hideEmailExistsModal();
    }
});
