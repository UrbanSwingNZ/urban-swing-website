/**
 * Change Password Functionality
 * Handles in-page password changes for logged-in students using BaseModal
 */

import { BaseModal } from '../../components/modals/modal-base.js';

(function() {
    'use strict';

    let changePasswordModal = null;
    let currentPasswordInput, newPasswordInput, confirmPasswordInput, messageEl, submitBtn;

    const formHtml = `
        <p style="margin-bottom: 20px; color: var(--text-secondary);">Enter your current password and choose a new password.</p>
        
        <form id="change-password-form" class="password-reset-form" novalidate style="display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
                <label for="current-password" style="display: block; margin-bottom: 8px; font-weight: 600;">Current Password</label>
                <div class="password-input-wrapper" style="position: relative;">
                    <input 
                        type="password" 
                        id="current-password" 
                        class="password-reset-input"
                        placeholder="Enter your current password"
                        autocomplete="current-password"
                        style="width: 100%; padding: 12px; padding-right: 45px; border: 1px solid var(--gray-450); border-radius: 8px; font-size: 1rem;"
                    >
                    <button type="button" class="toggle-password" data-target="current-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary);">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <label for="new-password" style="display: block; margin-bottom: 8px; font-weight: 600;">New Password</label>
                <div class="password-input-wrapper" style="position: relative;">
                    <input 
                        type="password" 
                        id="new-password" 
                        class="password-reset-input"
                        placeholder="Enter your new password"
                        autocomplete="new-password"
                        style="width: 100%; padding: 12px; padding-right: 45px; border: 1px solid var(--gray-450); border-radius: 8px; font-size: 1rem;"
                    >
                    <button type="button" class="toggle-password" data-target="new-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary);">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <small style="display: block; margin-top: 6px; color: var(--text-tertiary); font-size: 0.875rem;">Password must be at least 8 characters with uppercase and lowercase letters</small>
            </div>
            
            <div class="form-group">
                <label for="confirm-password" style="display: block; margin-bottom: 8px; font-weight: 600;">Confirm New Password</label>
                <div class="password-input-wrapper" style="position: relative;">
                    <input 
                        type="password" 
                        id="confirm-password" 
                        class="password-reset-input"
                        placeholder="Confirm your new password"
                        autocomplete="new-password"
                        style="width: 100%; padding: 12px; padding-right: 45px; border: 1px solid var(--gray-450); border-radius: 8px; font-size: 1rem;"
                    >
                    <button type="button" class="toggle-password" data-target="confirm-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary);">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            
            <div class="password-reset-message" id="change-password-message" style="display: none; padding: 12px; border-radius: 8px; margin-top: 10px; text-align: center;"></div>
            
            <!-- Hidden submit button to enable Enter key submission -->
            <button type="submit" style="display: none;" aria-hidden="true"></button>
            
            <div style="text-align: center; margin-top: 10px;">
                <a href="#" id="forgot-current-password" style="color: var(--accent-blue); text-decoration: none; font-size: 0.9rem;">Forgot your current password?</a>
            </div>
        </form>
    `;

    // Show message function
    function showMessage(message, type = 'info') {
        if (!messageEl) return;
        
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        messageEl.style.textAlign = 'center';
        messageEl.style.fontWeight = '600';
        
        // Apply styling based on type
        if (type === 'error') {
            messageEl.style.backgroundColor = 'var(--bg-error-light)';
            messageEl.style.color = 'var(--error)';
            messageEl.style.border = '1px solid var(--error)';
        } else if (type === 'success') {
            messageEl.style.backgroundColor = 'var(--bg-success-light)';
            messageEl.style.color = 'var(--success)';
            messageEl.style.border = '1px solid var(--success)';
        } else {
            messageEl.style.backgroundColor = 'var(--bg-info-light)';
            messageEl.style.color = 'var(--info)';
            messageEl.style.border = '1px solid var(--info)';
        }
    }

    // Hide message function
    function hideMessage() {
        if (!messageEl) return;
        messageEl.style.display = 'none';
    }

    // Toggle password visibility
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

    // Validate passwords
    function validatePasswords() {
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Check all fields filled
        if (!currentPassword || !newPassword || !confirmPassword) {
            showMessage('Please fill in all password fields.', 'error');
            return false;
        }

        // Check new password length (minimum 8 characters)
        if (newPassword.length < 8) {
            showMessage('New password must be at least 8 characters long.', 'error');
            return false;
        }

        // Check for uppercase letter
        const hasUppercase = /[A-Z]/.test(newPassword);
        if (!hasUppercase) {
            showMessage('New password must contain at least one uppercase letter.', 'error');
            return false;
        }

        // Check for lowercase letter
        const hasLowercase = /[a-z]/.test(newPassword);
        if (!hasLowercase) {
            showMessage('New password must contain at least one lowercase letter.', 'error');
            return false;
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            showMessage('New passwords do not match.', 'error');
            return false;
        }

        // Check new password is different from current
        if (newPassword === currentPassword) {
            showMessage('New password must be different from current password.', 'error');
            return false;
        }

        return true;
    }

    // Re-authenticate user
    async function reauthenticateUser(currentPassword) {
        try {
            const user = firebase.auth().currentUser;
            if (!user || !user.email) {
                throw new Error('No user logged in');
            }

            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            await user.reauthenticateWithCredential(credential);
            return true;
        } catch (error) {
            console.error('Re-authentication error:', error);
            
            if (error.code === 'auth/wrong-password') {
                throw new Error('Current password is incorrect.');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Too many failed attempts. Please try again later.');
            } else if (error.code === 'auth/network-request-failed') {
                throw new Error('Network error. Please check your connection.');
            } else {
                throw new Error('Authentication failed. Please try again.');
            }
        }
    }

    // Change password
    async function changePassword(currentPassword, newPassword) {
        try {
            // Step 1: Re-authenticate with current password
            await reauthenticateUser(currentPassword);
            
            // Step 2: Update to new password
            const user = firebase.auth().currentUser;
            await user.updatePassword(newPassword);
            
            return true;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault();
        
        // Validate inputs
        if (!validatePasswords()) {
            return;
        }

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';
        hideMessage();

        try {
            await changePassword(currentPassword, newPassword);
            
            // Success!
            showMessage('Password changed successfully!', 'success');
            
            // Close modal after delay
            setTimeout(() => {
                changePasswordModal.hide();
                
                // Show snackbar notification
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Password changed successfully!', 'success');
                }
            }, 2000);
            
        } catch (error) {
            showMessage(error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
    }

    // Handle forgot password link
    function handleForgotPassword(e) {
        e.preventDefault();
        
        // Close change password modal
        changePasswordModal.hide();
        
        // Get current user email
        const user = firebase.auth().currentUser;
        const email = user?.email || '';
        
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

    // Show modal
    function showModal() {
        // Destroy any existing modal first
        if (changePasswordModal) {
            try {
                changePasswordModal.destroy();
            } catch (e) {
                // Modal might already be destroyed
            }
            changePasswordModal = null;
        }

        // Submit handler function (shared by button click and form submit)
        const handlePasswordSubmit = async () => {
            // Validate inputs
            if (!validatePasswords()) {
                return;
            }

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;

            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';
            hideMessage();

            try {
                await changePassword(currentPassword, newPassword);
                
                // Close modal immediately
                changePasswordModal.hide();
                
                // Show snackbar notification
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Password changed successfully!', 'success');
                }
                
            } catch (error) {
                showMessage(error.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Change Password';
            }
        };

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
                currentPasswordInput = document.getElementById('current-password');
                newPasswordInput = document.getElementById('new-password');
                confirmPasswordInput = document.getElementById('confirm-password');
                messageEl = document.getElementById('change-password-message');
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
                if (form) form.reset();
                hideMessage();
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

    // Show/hide security section based on user role
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

    // Initialize
    function init() {
        const changePasswordBtn = document.getElementById('change-password-btn');
        
        if (!changePasswordBtn) {
            console.warn('Change password button not found on this page');
            return;
        }

        // Setup event listener
        changePasswordBtn.addEventListener('click', showModal);

        // Initialize security section visibility
        initSecuritySection();

        // Re-check security section visibility when student changes (for admin view)
        if (typeof window.addEventListener !== 'undefined') {
            window.addEventListener('studentLoaded', initSecuritySection);
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose globally for compatibility
    window.showChangePasswordModal = showModal;
})();
