/**
 * registration-handler.js - Student Registration Handler
 * Manages the registration process for new and existing students
 */

// Import centralized utilities
import { isValidEmail } from '/js/utils/index.js';

let registrationState = {
    emailCheckPassed: false,
    formData: null
};

/**
 * Initialize registration handlers
 */
function initializeRegistrationForm() {
    // Handle existing student (setup portal) flow
    const existingStudentSubmit = document.getElementById('existingStudentSubmit');
    const existingStudentEmail = document.getElementById('existingStudentEmail');
    
    if (existingStudentSubmit && existingStudentEmail) {
        existingStudentSubmit.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleExistingStudentSubmit();
        });
        
        existingStudentEmail.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await handleExistingStudentSubmit();
            }
        });
    }
}

/**
 * Handle existing student portal setup submission
 */
async function handleExistingStudentSubmit() {
    const emailInput = document.getElementById('existingStudentEmail');
    const errorEl = document.getElementById('existing-student-error');
    const email = emailInput.value.trim();
    
    // Clear previous errors
    if (errorEl) errorEl.textContent = '';
    
    // Validate email
    if (!email) {
        showErrorInElement('existing-student-error', 'Please enter your email address');
        return;
    }
    
    if (!isValidEmail(email)) {
        showErrorInElement('existing-student-error', 'Please enter a valid email address');
        return;
    }
    
    try {
        showLoadingButton('existingStudentSubmit', true);
        
        // Check if email exists in students and/or users collections
        const result = await checkEmailExists(email);
        
        console.log('Status:', result.status);
        console.log('Has student:', result.hasStudent);
        console.log('Has user:', result.hasUser);
        
        showLoadingButton('existingStudentSubmit', false);
        
        // Route based on status
        if (result.status === 'existing-complete') {
            // Both student and user exist - they should use login option
            showErrorInElement('existing-student-error', 
                'You already have a portal account. Please use "I have a portal account" to login.');
        } else if (result.status === 'existing-incomplete') {
            // Student exists but no user - proceed to registration with pre-filled data
            console.log('Redirecting to registration form - existing student without portal account');
            redirectToRegistrationForm(email, 'existing-incomplete', result.studentData);
        } else {
            // New student - they should use the new student option
            showErrorInElement('existing-student-error', 
                'We can\'t find you in our system. Please use "I\'m brand new to Urban Swing" to register.');
        }
        
    } catch (error) {
        showLoadingButton('existingStudentSubmit', false);
        console.error('Registration error:', error);
        showErrorInElement('existing-student-error', 'An error occurred. Please try again.');
    }
}

/**
 * Redirect to registration form with email and mode
 * @param {string} email - Email address to pre-fill
 * @param {string} mode - Registration mode: 'new' or 'existing-incomplete'
 * @param {Object|null} studentData - Existing student data if mode is 'existing-incomplete'
 */
function redirectToRegistrationForm(email, mode, studentData) {
    // Store registration data in sessionStorage
    sessionStorage.setItem('registrationEmail', email);
    sessionStorage.setItem('registrationMode', mode);
    
    if (mode === 'existing-incomplete' && studentData) {
        sessionStorage.setItem('registrationStudentData', JSON.stringify(studentData));
    }
    
    // Redirect to registration form
    window.location.href = 'register.html';
}

/**
 * Show error message in specific element
 * @param {string} elementId - ID of error element
 * @param {string} message - Error message to display
 */
function showErrorInElement(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
    }
}

/**
 * Show/hide loading state on button
 * @param {string} buttonId - ID of button element
 * @param {boolean} show - Whether to show loading state
 */
function showLoadingButton(buttonId, show) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (show) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Continue';
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
                }
            }, 1000);
        }
    }, 100);
});
