/**
 * Student Portal Invitation Utilities
 * Handles invitation eligibility checking and sending invitations
 */

import { BaseModal } from '/components/modals/modal-base.js';

// Icons for loading state
const ICONS = {
    LOADING: 'fa-spinner fa-spin'
};

/**
 * Check if a student is eligible for a portal invitation
 * Student is eligible if they exist in students collection but don't have a users doc AND auth user
 * @param {string} studentId - Student ID
 * @param {string} email - Student email
 * @returns {Promise<{eligible: boolean, reason: string}>}
 */
async function checkInvitationEligibility(studentId, email) {
    try {
        if (!email) {
            return { eligible: false, reason: 'No email address' };
        }

        // Check if student has a users document
        const usersSnapshot = await db.collection('users')
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        const hasUsersDoc = !usersSnapshot.empty;

        if (hasUsersDoc) {
            return { eligible: false, reason: 'Already has portal account' };
        }

        // Check if auth user exists for this email
        // We can't directly query auth from client, so we check users collection
        // and assume if no users doc exists, they don't have auth access
        return { eligible: true, reason: 'Can receive invitation' };
        
    } catch (error) {
        console.error('Error checking invitation eligibility:', error);
        return { eligible: false, reason: 'Error checking eligibility' };
    }
}

/**
 * Send portal invitation email via Firebase function
 * @param {string} studentId - Student ID
 * @returns {Promise<{success: boolean, message: string, email?: string}>}
 */
async function sendPortalInvitation(studentId) {
    try {
        if (typeof firebase === 'undefined' || !firebase.functions) {
            throw new Error('Firebase Functions not initialized');
        }

        const sendInvitation = firebase.functions().httpsCallable('sendPortalInvitationEmail');
        const result = await sendInvitation({ studentId });

        return {
            success: true,
            message: result.data.message || 'Invitation sent successfully',
            email: result.data.email
        };
        
    } catch (error) {
        console.error('Error sending portal invitation:', error);
        
        let message = 'Failed to send invitation. Please try again.';
        
        if (error.message) {
            if (error.message.includes('already has a portal account')) {
                message = 'This student already has a portal account.';
            } else if (error.message.includes('not found')) {
                message = 'Student not found.';
            } else if (error.message.includes('email address')) {
                message = 'Student does not have an email address.';
            } else if (error.message.includes('auth account already exists')) {
                message = 'An account already exists for this email.';
            } else {
                message = error.message;
            }
        }
        
        return {
            success: false,
            message
        };
    }
}

/**
 * Show confirmation modal for sending portal invitation
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student name for display
 * @param {string} email - Student email
 * @returns {BaseModal} Modal instance
 */
function showPortalInvitationModal(studentId, studentName, email) {
    let messageEl, submitBtn;

    const formHtml = `
        <p style="margin-bottom: 20px; color: var(--text-secondary);">
            Send an invitation to <strong>${studentName}</strong> to join the Student Portal?
        </p>
        
        <div style="background: var(--info-bg); padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid var(--info-border);">
            <p style="margin: 0; color: var(--text-primary); font-size: 0.95rem;">
                <strong>Email:</strong> ${email}
            </p>
            <p style="margin: 10px 0 0 0; color: var(--text-primary); font-size: 0.9rem;">
                The student will receive an email with instructions to create their portal account.
            </p>
        </div>
        
        <div class="invitation-message" id="invitation-message" style="display: none; padding: 12px; border-radius: 8px; margin-top: 20px;"></div>
    `;

    // Show message function
    const showMessage = (message, type = 'info') => {
        if (!messageEl) return;
        
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        // Apply styling based on type
        if (type === 'error') {
            messageEl.style.backgroundColor = 'var(--error-bg)';
            messageEl.style.color = 'var(--error-text)';
            messageEl.style.border = '1px solid var(--error-border)';
        } else if (type === 'success') {
            messageEl.style.backgroundColor = 'var(--success-bg)';
            messageEl.style.color = 'var(--success-text)';
            messageEl.style.border = '1px solid var(--success-border)';
        } else {
            messageEl.style.backgroundColor = 'var(--info-bg)';
            messageEl.style.color = 'var(--info-text)';
            messageEl.style.border = '1px solid var(--info-border)';
        }
    };

    // Create modal
    const modal = new BaseModal({
        title: `<i class="fas fa-user-plus"></i> Invite to Student Portal`,
        content: formHtml,
        size: 'medium',
        buttons: [
            {
                text: 'Cancel',
                class: 'btn-cancel',
                onClick: () => modal.hide()
            },
            {
                text: 'Send Invitation',
                class: 'btn-primary',
                id: 'invitation-submit',
                onClick: async () => {
                    // Get elements directly in case they weren't set yet
                    const submitBtn = document.getElementById('invitation-submit');
                    const messageEl = document.getElementById('invitation-message');
                    
                    if (!submitBtn || !messageEl) {
                        console.error('Invitation modal elements not found');
                        return;
                    }
                    
                    // Disable submit button
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `<i class="fas ${ICONS.LOADING}"></i> Sending...`;
                    messageEl.style.display = 'none';

                    const result = await sendPortalInvitation(studentId);

                    if (result.success) {
                        showMessage(result.message, 'success');
                        
                        // Close modal after 2 seconds
                        setTimeout(() => {
                            modal.hide();
                            // Show success snackbar if available
                            if (typeof showSnackbar === 'function') {
                                showSnackbar(`Invitation sent to ${email}`, 'success');
                            }
                        }, 2000);
                    } else {
                        showMessage(result.message, 'error');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Send Invitation';
                    }
                }
            }
        ],
        onOpen: () => {
            // Get elements after modal is created
            messageEl = document.getElementById('invitation-message');
            submitBtn = document.getElementById('invitation-submit');
        },
        onClose: () => {
            // Reset form when closed
            if (messageEl) messageEl.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Invitation';
            }
        }
    });

    modal.show();
    return modal;
}

/**
 * Simple wrapper function to show invitation modal
 * Convenience function for quick implementation
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student name for display
 * @param {string} email - Student email
 */
function inviteToPortal(studentId, studentName, email) {
    return showPortalInvitationModal(studentId, studentName, email);
}

// Expose functions globally for non-module scripts
if (typeof window !== 'undefined') {
    window.checkInvitationEligibility = checkInvitationEligibility;
    window.sendPortalInvitation = sendPortalInvitation;
    window.showPortalInvitationModal = showPortalInvitationModal;
    window.inviteToPortal = inviteToPortal;
}

// Export for module imports
export {
    checkInvitationEligibility,
    sendPortalInvitation,
    showPortalInvitationModal,
    inviteToPortal
};
