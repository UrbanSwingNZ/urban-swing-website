/**
 * modal.js - Modal Management
 * Handles showing and hiding modals using BaseModal system
 */

import { BaseModal } from '../../../components/modals/modal-base.js';

let emailExistsModal = null;

/**
 * Show the email exists warning modal
 * @param {Array} students - Array of students with matching email
 */
function showEmailExistsModal(students) {
    // Build student list HTML
    const studentListHtml = students.map(student => `
        <div class="existing-student-item">
            <span>${escapeHtml(student.email)}</span>
        </div>
    `).join('');
    
    const content = `
        <p>This email address is already registered in our system:</p>
        <div class="existing-students-list">
            ${studentListHtml}
        </div>
        <p>If you have already registered, please use the "Existing Student" login.</p>
    `;
    
    // Create and show modal
    emailExistsModal = new BaseModal({
        title: '<i class="fas fa-exclamation-triangle"></i> Email Already Registered',
        content: content,
        size: 'medium',
        buttons: [
            {
                text: '<i class="fas fa-times"></i> Close',
                class: 'btn-primary',
                onClick: () => emailExistsModal.hide()
            }
        ]
    });
    
    emailExistsModal.show();
}

/**
 * Hide the email exists warning modal
 */
function hideEmailExistsModal() {
    if (emailExistsModal) {
        emailExistsModal.hide();
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

// Expose functions globally for non-module scripts immediately
if (typeof window !== 'undefined') {
    window.showEmailExistsModal = showEmailExistsModal;
    window.hideEmailExistsModal = hideEmailExistsModal;
}
