/**
 * Password Reset Utilities
 * Provides reusable password reset functionality with UI feedback
 * Can be used across student portal, admin portal, and other areas
 */

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

        // Send password reset email
        await firebase.auth().sendPasswordResetEmail(normalizedEmail);
        
        console.log('Password reset email sent to:', normalizedEmail);
        
        const message = 'Password reset email sent! Please check your inbox.';
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
 * Create a password reset modal dialog
 * @param {Object} options - Configuration options
 * @param {string} options.title - Modal title (default: "Reset Password")
 * @param {string} options.description - Modal description
 * @param {string} options.emailPlaceholder - Email input placeholder
 * @param {string} options.prefillEmail - Pre-fill email field with this value
 * @param {Function} options.onComplete - Callback when modal is closed after successful reset
 * @returns {HTMLElement} Modal element
 */
function createPasswordResetModal(options = {}) {
    const {
        title = 'Reset Password',
        description = 'Enter your email address and we\'ll send you a link to reset your password.',
        emailPlaceholder = 'Enter your email address',
        prefillEmail = '',
        onComplete = null
    } = options;

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'password-reset-modal';
    modal.innerHTML = `
        <div class="password-reset-overlay"></div>
        <div class="password-reset-content">
            <button class="password-reset-close" aria-label="Close">&times;</button>
            <h2>${title}</h2>
            <p class="password-reset-description">${description}</p>
            
            <form class="password-reset-form">
                <div class="form-group">
                    <label for="password-reset-email">Email Address</label>
                    <input 
                        type="email" 
                        id="password-reset-email" 
                        class="password-reset-input"
                        placeholder="${emailPlaceholder}"
                        value="${prefillEmail}"
                        required
                        autocomplete="email"
                    >
                </div>
                
                <div class="password-reset-message" style="display: none;"></div>
                
                <div class="password-reset-buttons">
                    <button type="button" class="btn-cancel">Cancel</button>
                    <button type="submit" class="btn-submit">Send Reset Email</button>
                </div>
            </form>
        </div>
    `;

    // Add modal to DOM
    document.body.appendChild(modal);

    // Get elements
    const overlay = modal.querySelector('.password-reset-overlay');
    const closeBtn = modal.querySelector('.password-reset-close');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const form = modal.querySelector('.password-reset-form');
    const emailInput = modal.querySelector('#password-reset-email');
    const submitBtn = modal.querySelector('.btn-submit');
    const messageEl = modal.querySelector('.password-reset-message');

    // Close modal function
    const closeModal = () => {
        modal.remove();
    };

    // Show message function
    const showMessage = (message, type = 'info') => {
        messageEl.textContent = message;
        messageEl.className = `password-reset-message ${type}`;
        messageEl.style.display = 'block';
    };

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        messageEl.style.display = 'none';

        const result = await sendPasswordReset(email, {
            onSuccess: (message) => {
                showMessage(message, 'success');
                emailInput.value = '';
                
                // Close modal after 3 seconds
                setTimeout(() => {
                    closeModal();
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
    });

    // Close button handlers
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Focus email input
    setTimeout(() => emailInput.focus(), 100);

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
