/**
 * Password Reset Utilities
 * Provides reusable password reset functionality with UI feedback using BaseModal
 * Can be used across student portal, admin portal, and other areas
 */

import { BaseModal } from '../components/modals/modal-base.js';

/**
 * Send password reset email with comprehensive error handling and user feedback
 * @param {string} email - User's email address
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback when email is sent successfully
 * @param {Function} options.onError - Callback when an error occurs
 * @param {Function} options.onValidationError - Callback for validation errors
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendPasswordReset(email, options = {}) {
    const {
        onSuccess = null,
        onError = null,
        onValidationError = null
    } = options;

    try {
        // Validate email
        const normalizedEmail = email?.toLowerCase().trim();
        
        if (!normalizedEmail) {
            const message = 'Please enter your email address.';
            if (onValidationError) {
                onValidationError(message);
            }
            return { success: false, message };
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            const message = 'Please enter a valid email address.';
            if (onValidationError) {
                onValidationError(message);
            }
            return { success: false, message };
        }

        // Check Firebase is initialized
        if (typeof firebase === 'undefined' || !firebase.auth) {
            throw new Error('Firebase Auth not initialized');
        }

        // Check if email exists in students collection (student portal specific check)
        if (firebase.firestore) {
            const studentsQuery = await firebase.firestore().collection('students')
                .where('email', '==', normalizedEmail)
                .limit(1)
                .get();
            
            if (studentsQuery.empty) {
                const message = 'No account found with this email address.';
                if (onError) {
                    onError(message);
                }
                return { success: false, message };
            }
            
            // Check if student has a user account
            const usersQuery = await firebase.firestore().collection('users')
                .where('email', '==', normalizedEmail)
                .limit(1)
                .get();
            
            if (usersQuery.empty) {
                const message = 'This email is not registered for the student portal. Please set up your portal access first.';
                if (onError) {
                    onError(message);
                }
                return { success: false, message };
            }
        }

        // Send password reset email
        await firebase.auth().sendPasswordResetEmail(normalizedEmail);
        
        console.log('Password reset email sent to:', normalizedEmail);
        
        const message = 'Password reset email sent! Please check your inbox and spam folder.';
        if (onSuccess) {
            onSuccess(message, normalizedEmail);
        }
        
        return { success: true, message };

    } catch (error) {
        console.error('Password reset error:', error);
        
        // Provide user-friendly error messages
        let message = 'Failed to send password reset email. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
            message = 'No account found with this email address.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address format.';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Too many reset attempts. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
            message = 'Network error. Please check your connection and try again.';
        }
        
        if (onError) {
            onError(message, error);
        }
        
        return { success: false, message };
    }
}

/**
 * Create a password reset modal dialog using BaseModal
 * @param {Object} options - Configuration options
 * @param {string} options.title - Modal title (default: "Reset Password")
 * @param {string} options.description - Modal description
 * @param {string} options.emailPlaceholder - Email input placeholder
 * @param {string} options.prefillEmail - Pre-fill email field with this value
 * @param {Function} options.onComplete - Callback when modal is closed after successful reset
 * @returns {BaseModal} Modal instance
 */
function createPasswordResetModal(options = {}) {
    const {
        title = 'Reset Password',
        description = 'Enter your email address and we\'ll send you a link to reset your password.',
        emailPlaceholder = 'Enter your email address',
        prefillEmail = '',
        onComplete = null
    } = options;

    let emailInput, messageEl, submitBtn;

    const formHtml = `
        <p style="margin-bottom: 20px; color: var(--text-secondary);">${description}</p>
        
        <form id="password-reset-form" style="display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
                <label for="password-reset-email" style="display: block; margin-bottom: 8px; font-weight: 600;">Email Address</label>
                <input 
                    type="email" 
                    id="password-reset-email" 
                    placeholder="${emailPlaceholder}"
                    value="${prefillEmail}"
                    required
                    autocomplete="email"
                    style="width: 100%; padding: 12px; border: 1px solid var(--gray-450); border-radius: 8px; font-size: 1rem;"
                >
            </div>
            
            <div class="password-reset-message" id="password-reset-message" style="display: none; padding: 12px; border-radius: 8px;"></div>
        </form>
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
        title: `<i class="fas fa-key"></i> ${title}`,
        content: formHtml,
        size: 'medium',
        buttons: [
            {
                text: 'Cancel',
                class: 'btn-cancel',
                onClick: () => modal.hide()
            },
            {
                text: 'Send Reset Email',
                class: 'btn-primary',
                id: 'password-reset-submit',
                onClick: async () => {
                    // Get elements directly in case they weren't set yet
                    const emailInput = document.getElementById('password-reset-email');
                    const submitBtn = document.getElementById('password-reset-submit');
                    const messageEl = document.getElementById('password-reset-message');
                    
                    if (!emailInput || !submitBtn || !messageEl) {
                        console.error('Password reset form elements not found');
                        return;
                    }
                    
                    const email = emailInput.value.trim();
                    
                    // Disable submit button
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                    messageEl.style.display = 'none';

                    const result = await sendPasswordReset(email, {
                        onSuccess: (message) => {
                            showMessage(message, 'success');
                            emailInput.value = '';
                            
                            // Close modal after 3 seconds
                            setTimeout(() => {
                                modal.hide();
                                if (onComplete) {
                                    onComplete(email);
                                }
                            }, 3000);
                        },
                        onError: (message) => {
                            showMessage(message, 'error');
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Send Reset Email';
                        },
                        onValidationError: (message) => {
                            showMessage(message, 'error');
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Send Reset Email';
                        }
                    });

                    // Re-enable button if not successful
                    if (!result.success) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Send Reset Email';
                    }
                }
            }
        ],
        onOpen: () => {
            // Get elements after modal is created
            emailInput = document.getElementById('password-reset-email');
            messageEl = document.getElementById('password-reset-message');
            submitBtn = document.getElementById('password-reset-submit');
            const form = document.getElementById('password-reset-form');

            // Setup form submit handler for Enter key
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    // Trigger the button click
                    if (submitBtn) {
                        submitBtn.click();
                    }
                });
            }

            // Focus email input
            setTimeout(() => emailInput?.focus(), 100);
        },
        onClose: () => {
            // Reset form when closed
            const form = document.getElementById('password-reset-form');
            if (form) form.reset();
            if (messageEl) messageEl.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Reset Email';
            }
        }
    });

    modal.show();
    return modal;
}

/**
 * Create a simple password reset button handler
 * Handles inline password reset without a modal
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.button - The button element to attach handler to
 * @param {HTMLElement|Function} options.emailInput - Email input element or function that returns email
 * @param {HTMLElement} options.messageElement - Element to display messages (optional)
 * @param {Function} options.onSuccess - Callback when email is sent successfully
 * @param {Function} options.onError - Callback when an error occurs
 */
function attachPasswordResetHandler(options = {}) {
    const {
        button,
        emailInput,
        messageElement = null,
        onSuccess = null,
        onError = null
    } = options;

    if (!button) {
        console.error('Password reset handler requires a button element');
        return;
    }

    const originalText = button.textContent;

    button.addEventListener('click', async (e) => {
        e.preventDefault();

        // Get email value
        let email = '';
        if (typeof emailInput === 'function') {
            email = emailInput();
        } else if (emailInput && emailInput.value !== undefined) {
            email = emailInput.value;
        } else {
            console.error('Invalid emailInput configuration');
            return;
        }

        // Update button state
        button.disabled = true;
        button.textContent = 'Sending...';

        // Clear previous message
        if (messageElement) {
            messageElement.textContent = '';
            messageElement.className = 'password-reset-message';
        }

        await sendPasswordReset(email, {
            onSuccess: (message, sentEmail) => {
                if (messageElement) {
                    messageElement.textContent = message;
                    messageElement.className = 'password-reset-message success';
                }
                button.disabled = false;
                button.textContent = originalText;
                
                if (onSuccess) {
                    onSuccess(message, sentEmail);
                }
            },
            onError: (message, error) => {
                if (messageElement) {
                    messageElement.textContent = message;
                    messageElement.className = 'password-reset-message error';
                }
                button.disabled = false;
                button.textContent = originalText;
                
                if (onError) {
                    onError(message, error);
                }
            },
            onValidationError: (message) => {
                if (messageElement) {
                    messageElement.textContent = message;
                    messageElement.className = 'password-reset-message error';
                }
                button.disabled = false;
                button.textContent = originalText;
                
                if (onError) {
                    onError(message);
                }
            }
        });
    });
}

/**
 * Simple function to show password reset modal
 * Convenience function for quick implementation
 * @param {string} prefillEmail - Email to prefill (optional)
 * @param {Function} onComplete - Callback when reset is complete
 */
function showPasswordResetModal(prefillEmail = '', onComplete = null) {
    return createPasswordResetModal({
        prefillEmail,
        onComplete
    });
}

// Expose functions globally for non-module scripts
if (typeof window !== 'undefined') {
    window.sendPasswordReset = sendPasswordReset;
    window.createPasswordResetModal = createPasswordResetModal;
    window.attachPasswordResetHandler = attachPasswordResetHandler;
    window.showPasswordResetModal = showPasswordResetModal;
}
