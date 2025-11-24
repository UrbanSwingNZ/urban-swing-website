/**
 * Change Password Functionality
 * Handles in-page password changes for logged-in students
 */

(function() {
    'use strict';

    // DOM Elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const closeModalBtn = document.getElementById('close-change-password-modal');
    const cancelBtn = document.getElementById('cancel-change-password');
    const overlay = changePasswordModal?.querySelector('.password-reset-overlay');
    const forgotPasswordLink = document.getElementById('forgot-current-password');
    const messageEl = document.getElementById('change-password-message');
    const submitBtn = changePasswordForm?.querySelector('.btn-submit');
    const securitySection = document.getElementById('security-section');

    // Password inputs
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Show message function
    function showMessage(message, type = 'info') {
        if (!messageEl) return;
        
        messageEl.textContent = message;
        messageEl.className = `password-reset-message ${type}`;
        messageEl.style.display = 'block';
    }

    // Hide message function
    function hideMessage() {
        if (!messageEl) return;
        messageEl.style.display = 'none';
    }

    // Show modal
    function showModal() {
        if (!changePasswordModal) return;
        changePasswordModal.style.display = 'flex';
        hideMessage();
        changePasswordForm.reset();
        
        // Focus first input after a brief delay
        setTimeout(() => currentPasswordInput?.focus(), 100);
    }

    // Close modal
    function closeModal() {
        if (!changePasswordModal) return;
        changePasswordModal.style.display = 'none';
        changePasswordForm.reset();
        hideMessage();
        
        // Reset submit button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
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
        submitBtn.textContent = 'Changing Password...';
        hideMessage();

        try {
            await changePassword(currentPassword, newPassword);
            
            // Success!
            showMessage('Password changed successfully!', 'success');
            
            // Close modal after delay
            setTimeout(() => {
                closeModal();
                
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
        closeModal();
        
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

    // Show/hide security section based on user role
    function initSecuritySection() {
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
        if (!changePasswordBtn || !changePasswordModal || !changePasswordForm) {
            console.warn('Change password elements not found on this page');
            return;
        }

        // Setup event listeners
        changePasswordBtn.addEventListener('click', showModal);
        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
        changePasswordForm.addEventListener('submit', handleSubmit);

        // Setup password visibility toggles
        setupPasswordToggles();

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
})();
