/**
 * gift-concessions.js - Main coordinator for gift concessions tool
 * Handles initialization and coordinates between modules
 */

import { loadStudents, selectStudent, clearSelectedStudent } from './student-search.js';
import { initializeForm, applyPreset, resetForm } from './gift-form.js';
import { setCurrentUser } from './gift-api.js';
import { loadRecentGifts } from './recent-gifts.js';

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '../index.html';
                return;
            }

            // Set current user for gift-api module
            setCurrentUser(user);

            // Check if user is authorized (only dance@urbanswing.co.nz)
            if (user.email !== 'dance@urbanswing.co.nz') {
                alert('Unauthorized: This tool is only available to the super admin.');
                window.location.href = '../index.html';
                return;
            }

            // Display user email (wait for header to load)
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = user.email;
            }

            // Load students
            await loadStudents();

            // Initialize form
            await initializeForm();

            // Load recent gifts
            await loadRecentGifts();
        });

        // Logout button handler is set up by header-configurator.js

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize page: ' + error.message);
    }
});

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

// Expose functions globally for onclick handlers
window.clearSelectedStudent = clearSelectedStudent;
window.selectStudent = selectStudent;
window.resetForm = resetForm;
window.applyPreset = applyPreset;
