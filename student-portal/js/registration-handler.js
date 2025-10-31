/**
 * registration-handler.js - New Student Registration Handler
 * Manages the registration process for new students
 */

let registrationState = {
    emailCheckPassed: false,
    formData: null
};

/**
 * Initialize registration form
 */
function initializeRegistrationForm() {
    const registerBtn = document.querySelector('#newStudentForm .action-btn');
    const emailInput = document.getElementById('newStudentEmail');
    
    if (!registerBtn || !emailInput) {
        console.error('Registration form elements not found');
        return;
    }
    
    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleRegistrationSubmit();
    });
    
    // Allow enter key to submit
    emailInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleRegistrationSubmit();
        }
    });
}

/**
 * Handle registration form submission
 */
async function handleRegistrationSubmit() {
    const emailInput = document.getElementById('newStudentEmail');
    const email = emailInput.value.trim();
    
    // Validate email
    if (!email) {
        showError('Please enter your email address');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    try {
        showLoading(true);
        
        // Check if email exists
        const result = await checkEmailExists(email);
        
        showLoading(false);
        
        if (result.exists) {
            // Show warning modal
            showEmailExistsModal(
                result.students,
                () => {
                    // Continue callback - will be implemented later
                    console.log('User chose to continue with registration');
                },
                () => {
                    // Cancel callback - return to login page
                    returnToLoginPage();
                }
            );
        } else {
            // Email doesn't exist - proceed with registration
            // This will be implemented in the happy path
            console.log('Email available - proceed with registration');
        }
        
    } catch (error) {
        showLoading(false);
        console.error('Registration error:', error);
        showError('An error occurred. Please try again.');
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Return to login page
 */
function returnToLoginPage() {
    // Clear the email input
    const emailInput = document.getElementById('newStudentEmail');
    if (emailInput) {
        emailInput.value = '';
    }
    
    // Switch to existing student form (login)
    const existingStudentBtn = document.getElementById('existingStudentBtn');
    if (existingStudentBtn) {
        existingStudentBtn.click();
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    // Simple alert for now - can be enhanced with better UI
    alert('Error: ' + message);
}

/**
 * Show/hide loading spinner
 * @param {boolean} show - Whether to show the spinner
 */
function showLoading(show) {
    const registerBtn = document.querySelector('#newStudentForm .action-btn');
    if (!registerBtn) return;
    
    if (show) {
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    } else {
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Register';
    }
}

// Initialize when DOM is ready and Firebase is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
        if (window.db) {
            initializeRegistrationForm();
        } else {
            console.error('Firebase not ready, retrying...');
            setTimeout(() => {
                if (window.db) {
                    initializeRegistrationForm();
                } else {
                    console.error('Failed to initialize Firebase');
                    showError('System not ready. Please refresh the page.');
                }
            }, 1000);
        }
    }, 100);
});
