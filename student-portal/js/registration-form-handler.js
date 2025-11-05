/**
 * registration-form-handler.js - Registration Form Handler
 * Handles the registration form submission with support for new and existing-incomplete students
 */

let registrationConfig = {
    mode: 'new', // 'new' or 'existing-incomplete'
    studentData: null,
    email: null
};

document.addEventListener('DOMContentLoaded', () => {
    initializeRegistrationForm();
});

/**
 * Initialize the registration form
 */
function initializeRegistrationForm() {
    // Get registration data from sessionStorage
    const email = sessionStorage.getItem('registrationEmail');
    const mode = sessionStorage.getItem('registrationMode') || 'new';
    const studentDataJson = sessionStorage.getItem('registrationStudentData');
    
    registrationConfig.email = email;
    registrationConfig.mode = mode;
    
    if (studentDataJson) {
        try {
            registrationConfig.studentData = JSON.parse(studentDataJson);
        } catch (error) {
            console.error('Error parsing student data:', error);
        }
    }
    
    // Clear sessionStorage
    sessionStorage.removeItem('registrationEmail');
    sessionStorage.removeItem('registrationMode');
    sessionStorage.removeItem('registrationStudentData');
    
    // Configure form based on mode
    if (registrationConfig.mode === 'existing-incomplete') {
        setupExistingIncompleteMode();
    } else {
        setupNewStudentMode();
    }
    
    // Handle form submission
    const form = document.getElementById('registration-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Setup form for existing-incomplete student
 */
function setupExistingIncompleteMode() {
    const studentData = registrationConfig.studentData;
    
    if (!studentData) {
        console.error('No student data available for existing-incomplete mode');
        return;
    }
    
    // Pre-fill form fields
    document.getElementById('firstName').value = studentData.firstName || '';
    document.getElementById('lastName').value = studentData.lastName || '';
    document.getElementById('email').value = studentData.email || '';
    document.getElementById('phoneNumber').value = studentData.phoneNumber || '';
    document.getElementById('pronouns').value = studentData.pronouns || '';
    
    // Disable fields that shouldn't be changed
    document.getElementById('firstName').disabled = true;
    document.getElementById('lastName').disabled = true;
    document.getElementById('email').disabled = true;
    document.getElementById('phoneNumber').disabled = true;
    document.getElementById('pronouns').disabled = true;
    
    // Hide payment section (existing students don't need to pay to create account)
    const paymentSection = document.querySelector('.payment-section');
    if (paymentSection) {
        paymentSection.style.display = 'none';
        
        // Remove required attribute from payment-related fields
        const rateTypeInputs = document.querySelectorAll('input[name="rateType"]');
        rateTypeInputs.forEach(input => {
            input.required = false;
        });
    }
    
    // Pre-check over16Confirmed and emailConsent if they exist in student data
    if (studentData.over16Confirmed) {
        const over16Input = document.getElementById('over16Confirmed');
        if (over16Input) {
            over16Input.checked = true;
            over16Input.disabled = true;
        }
    }
    
    if (studentData.emailConsent !== undefined) {
        const emailConsentInput = document.getElementById('emailConsent');
        if (emailConsentInput) {
            emailConsentInput.checked = studentData.emailConsent;
            emailConsentInput.disabled = true;
        }
    }
    
    // Update submit button text
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-user-check"></i> Complete Account Setup';
    }
    
    console.log('Form configured for existing-incomplete student:', studentData.id);
}

/**
 * Setup form for new student
 */
function setupNewStudentMode() {
    // Pre-fill email if available
    if (registrationConfig.email) {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = registrationConfig.email;
        }
    }
    
    console.log('Form configured for new student');
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoadingSpinner(true);
        hideMessages();
        
        // Get form data
        const formData = getFormData();
        
        // Validate form data
        if (!validateFormData(formData)) {
            showLoadingSpinner(false);
            return;
        }
        
        // Process based on mode
        if (registrationConfig.mode === 'existing-incomplete') {
            await processExistingIncompleteRegistration(formData);
            
            // Show success and redirect to dashboard
            showSuccessMessage('Registration successful! Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard/index.html';
            }, 2000);
        } else {
            await processNewStudentRegistration(formData);
            
            // Debug banner is shown by processNewStudentRegistration
            // Redirect disabled for debugging
            // setTimeout(() => {
            //     window.location.href = 'index.html';
            // }, 15000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showErrorMessage(error.message || 'Registration failed. Please try again.');
        showLoadingSpinner(false);
    }
}

/**
 * Process registration for existing-incomplete student
 */
async function processExistingIncompleteRegistration(formData) {
    const studentData = registrationConfig.studentData;
    const studentId = studentData.id;
    
    // 1. Create Firebase Auth user
    const authUser = await createAuthUser(formData.email, formData.password);
    console.log('Firebase Auth user created:', authUser.uid);
    
    // 2. Update student document (add termsAccepted)
    await updateStudentTerms(studentId);
    console.log('Student document updated with terms acceptance');
    
    // 3. Create user document
    const userData = {
        email: formData.email,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        authUid: authUser.uid
    };
    
    await createUser(userData, studentId);
    console.log('User document created');
}

/**
 * Process registration for new student
 */
async function processNewStudentRegistration(formData) {
    // Step 1: Call backend Firebase Function to process payment and create documents
    // Backend creates: student document, user document (authUid: null), transaction document
    // Backend also: processes Stripe payment, creates Stripe customer
    const result = await processRegistrationWithPayment({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phoneNumber
    });
    
    if (!result.success) {
        throw new Error('Payment processing failed');
    }
    
    console.log('Payment successful. Documents created:', result);
    
    // Step 2: Create Firebase Auth user with their chosen password
    const authUser = await createAuthUser(formData.email, formData.password);
    console.log('Firebase Auth user created:', authUser.uid);
    
    // Step 3: Update user document with authUid (backend created it with null)
    await window.db.collection('users').doc(result.studentId).update({
        authUid: authUser.uid
    });
    console.log('User document updated with authUid');
    
    // Step 4: Redirect to dashboard (user is now fully registered and signed in)
    window.location.href = 'dashboard/index.html';
}

/**
 * Get form data
 */
function getFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        pronouns: document.getElementById('pronouns').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        over16Confirmed: document.getElementById('over16Confirmed').checked,
        termsAccepted: document.getElementById('termsAccepted').checked,
        emailConsent: document.getElementById('emailConsent').checked,
        rateType: document.querySelector('input[name="rateType"]:checked')?.value || ''
    };
}

/**
 * Validate form data
 */
function validateFormData(formData) {
    // Basic validation
    if (!formData.firstName || !formData.lastName) {
        showErrorMessage('Please enter your first and last name');
        return false;
    }
    
    if (!formData.email) {
        showErrorMessage('Please enter your email address');
        return false;
    }
    
    if (!formData.password || !formData.confirmPassword) {
        showErrorMessage('Please enter your password');
        return false;
    }
    
    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
        showErrorMessage(passwordValidation.message);
        return false;
    }
    
    // Password match validation
    if (!passwordsMatch(formData.password, formData.confirmPassword)) {
        showErrorMessage('Passwords do not match');
        return false;
    }
    
    // Terms acceptance
    if (!formData.termsAccepted) {
        showErrorMessage('You must accept the Terms and Conditions');
        return false;
    }
    
    // Mode-specific validation
    if (registrationConfig.mode === 'new') {
        if (!formData.phoneNumber) {
            showErrorMessage('Please enter your phone number');
            return false;
        }
        
        if (!formData.over16Confirmed) {
            showErrorMessage('You must confirm you are 16 years or older');
            return false;
        }
        
        if (!formData.rateType) {
            showErrorMessage('Please select a payment option');
            return false;
        }
    }
    
    return true;
}

/**
 * Show loading spinner
 */
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loading-spinner');
    const submitBtn = document.getElementById('submit-btn');
    
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        const span = successDiv.querySelector('span');
        if (span) {
            span.textContent = message;
        }
        successDiv.style.display = 'flex';
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Scroll to error message
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Hide all messages
 */
function hideMessages() {
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    
    if (successDiv) successDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
}
