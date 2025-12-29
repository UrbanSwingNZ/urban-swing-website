/**
 * Password UI Module
 * Handles modal display, form rendering, UI interactions, and state management
 */

import { BaseModal } from '../../../components/modals/modal-base.js';
import { changePassword, getCurrentUserEmail } from './password-api.js';
import { 
    showFieldError, 
    clearFieldError, 
    clearAllFieldErrors,
    validatePasswordChange 
} from '../../../js/utils/form-validation-helpers.js';

// Modal instance and form elements
let changePasswordModal = null;
let currentPasswordInput, newPasswordInput, confirmPasswordInput, submitBtn;

/**
 * HTML template for the password change form
 */
const formHtml = `
    <p style="margin-bottom: 20px; color: var(--text-secondary);">Enter your current password and choose a new password.</p>
    
    <form id="change-password-form" class="password-reset-form" novalidate style="display: flex; flex-direction: column; gap: 20px;">
        <div class="form-group">
            <label for="currentPassword" style="display: block; margin-bottom: 8px; font-weight: 600;">Current Password</label>
            <div class="password-input-wrapper" style="position: relative;">
                <input 
                    type="password" 
                    id="currentPassword" 
                    class="password-reset-input"
                    placeholder="Enter your current password"
                    autocomplete="current-password"
                    style="width: 100%; padding: 12px; padding-right: 45px; border: 1px solid var(--gray-450); border-radius: 8px; font-size: 1rem;"
                >
                <button type="button" class="toggle-password" data-target="currentPassword" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary);">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div id="currentPassword-error" class="error-message" style="display: none; color: var(--error); font-weight: 500;"></div>
        </div>
        
        <div class="form-group">
            <label for="newPassword" style="display: block; margin-bottom: 8px; font-weight: 600;">New Password</label>
            <div class="password-input-wrapper" style="position: relative;">
                <input 
                    type="password" 
                    id="newPassword" 
                    class="password-reset-input"
                    placeholder="Enter your new password"
                    autocomplete="new-password"
                    style="width: 100%; padding: 12px; padding-right: 45px; border: 1px solid var(--gray-450); border-radius: 8px; font-size: 1rem;"
                >
                <button type="button" class="toggle-password" data-target="newPassword" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary);">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <small style="display: block; margin-top: 6px; color: var(--text-tertiary); font-size: 0.875rem;">Password must be at least 8 characters with uppercase and lowercase letters</small>
            <div id="newPassword-error" class="error-message" style="display: none; color: var(--error); font-weight: 500;"></div>
        </div>
        
        <div class="form-group">
            <label for="confirmPassword" style="display: block; margin-bottom: 8px; font-weight: 600;">Confirm New Password</label>
            <div class="password-input-wrapper" style="position: relative;">
                <input 
                    type="password" 
                    id="confirmPassword" 
                    class="password-reset-input"
                    placeholder="Confirm your new password"
                    autocomplete="new-password"
                    style="width: 100%; padding: 12px; padding-right: 45px; border: 1px solid var(--gray-450); border-radius: 8px; font-size: 1rem;"
                >
                <button type="button" class="toggle-password" data-target="confirmPassword" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary);">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div id="confirmPassword-error" class="error-message" style="display: none; color: var(--error); font-weight: 500;"></div>
        </div>
        
        <!-- Hidden submit button to enable Enter key submission -->
        <button type="submit" style="display: none;" aria-hidden="true"></button>
        
        <div style="text-align: center; margin-top: 10px;">
            <a href="#" id="forgot-current-password" style="color: var(--accent-blue); text-decoration: none; font-size: 0.9rem;">Forgot your current password?</a>
        </div>
    </form>
`;

/**
 * Setup password visibility toggle buttons
 */
function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (!input) return;
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

/**
 * Handle forgot password link click
 * @param {Event} e - Click event
 */
function handleForgotPassword(e) {
    e.preventDefault();
    
    // Close change password modal
    changePasswordModal.hide();
    
    // Get current user email
    const email = getCurrentUserEmail();
    
    // Show password reset modal (from password-reset-utils.js)
    if (typeof showPasswordResetModal === 'function') {
        showPasswordResetModal(email, (sentEmail) => {
            console.log('Password reset email sent to:', sentEmail);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Password reset email sent! Check your inbox.', 'success');
            }
        });
    } else {
        alert('Password reset functionality not available. Please contact support.');
    }
}

/**
 * Handle password change submission
 * Validates inputs, calls API, shows success/error messages
 */
async function handlePasswordSubmit() {
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    
    // Clear any previous errors
    clearAllFieldErrors('change-password-form');
    
    // Validate inputs using consolidated validation
    const validation = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (!validation.isValid) {
        showFieldError(validation.field, validation.message);
        return;
    }

    // Disable submit button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';

    try {
        await changePassword(currentPassword, newPassword);
        
        // Close modal immediately
        changePasswordModal.hide();
        
        // Show snackbar notification
        if (typeof showSnackbar === 'function') {
            showSnackbar('Password changed successfully!', 'success');
        }
        
    } catch (error) {
        // Show API error as inline error on current password field
        showFieldError('currentPassword', error.message || 'Failed to change password. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change Password';
    }
}

/**
 * Show the change password modal
 */
export function showChangePasswordModal() {
    // Destroy any existing modal first
    if (changePasswordModal) {
        try {
            changePasswordModal.destroy();
        } catch (e) {
            // Modal might already be destroyed
        }
        changePasswordModal = null;
    }

    changePasswordModal = new BaseModal({
        title: '<i class="fas fa-key"></i> Change Password',
        content: formHtml,
        size: 'medium',
        buttons: [
            {
                text: 'Cancel',
                class: 'btn-cancel',
                onClick: () => changePasswordModal.hide()
            },
            {
                text: 'Change Password',
                class: 'btn-primary',
                id: 'submit-change-password',
                onClick: handlePasswordSubmit
            }
        ],
        onOpen: () => {
            // Get elements after modal is created
            currentPasswordInput = document.getElementById('currentPassword');
            newPasswordInput = document.getElementById('newPassword');
            confirmPasswordInput = document.getElementById('confirmPassword');
            submitBtn = document.getElementById('submit-change-password');
            const form = document.getElementById('change-password-form');
            const forgotLink = document.getElementById('forgot-current-password');

            // Setup form submit handler for Enter key
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    handlePasswordSubmit();
                });
            }
            
            if (forgotLink) {
                forgotLink.addEventListener('click', handleForgotPassword);
            }

            // Setup password visibility toggles
            setupPasswordToggles();

            // Focus first input
            setTimeout(() => currentPasswordInput?.focus(), 100);
        },
        onClose: () => {
            // Reset form when closed
            const form = document.getElementById('change-password-form');
            if (form) {
                form.reset();
                clearAllFieldErrors('change-password-form');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Change Password';
            }
            // Destroy the modal instance so DOM is cleaned up
            if (changePasswordModal) {
                setTimeout(() => {
                    changePasswordModal.destroy();
                    changePasswordModal = null;
                }, 100);
            }
        }
    });

    changePasswordModal.show();
}

/**
 * Show/hide security section based on user role
 * Hides section if admin is viewing student profile
 */
function initSecuritySection() {
    const securitySection = document.getElementById('security-section');
    
    // Only show to logged-in students (not admins viewing other profiles)
    if (typeof window.isViewingAsAdmin !== 'undefined' && window.isViewingAsAdmin) {
        // Admin viewing student profile - hide security section
        if (securitySection) {
            securitySection.style.display = 'none';
        }
    } else {
        // Student viewing their own profile - show security section
        if (securitySection) {
            securitySection.style.display = 'block';
        }
    }
}

/**
 * Initialize change password functionality
 * Sets up event listeners and security section visibility
 */
export function initChangePassword() {
    const changePasswordBtn = document.getElementById('change-password-btn');
    
    if (!changePasswordBtn) {
        console.warn('Change password button not found on this page');
        return;
    }

    // Setup event listener
    changePasswordBtn.addEventListener('click', showChangePasswordModal);

    // Initialize security section visibility
    initSecuritySection();

    // Re-check security section visibility when student changes (for admin view)
    if (typeof window.addEventListener !== 'undefined') {
        window.addEventListener('studentLoaded', initSecuritySection);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChangePassword);
} else {
    initChangePassword();
}

// Expose globally for compatibility (legacy support)
window.showChangePasswordModal = showChangePasswordModal;
