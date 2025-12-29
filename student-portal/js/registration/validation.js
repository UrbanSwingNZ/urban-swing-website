/**
 * validation.js - Form Validation
 * Handles all form validation logic
 */

/**
 * Validate form data
 */
function validateFormData(formData) {
    // Import validation helpers from global scope
    const { 
        showFieldError, 
        clearAllFieldErrors,
        validatePasswordStrength,
        validatePasswordMatch 
    } = window.FormValidationHelpers || {};
    
    // Fallback check
    if (!showFieldError || !clearAllFieldErrors) {
        console.error('Form validation helpers not loaded');
        showErrorMessage('Validation system error. Please refresh the page.');
        return false;
    }
    
    // Clear all previous errors
    clearAllFieldErrors('registration-form');
    
    // Basic validation - First Name
    if (!formData.firstName) {
        showFieldError('firstName', 'Please enter your first name.');
        return false;
    }
    
    // Last Name
    if (!formData.lastName) {
        showFieldError('lastName', 'Please enter your last name.');
        return false;
    }
    
    // Email
    if (!formData.email) {
        showFieldError('email', 'Please enter your email address.');
        return false;
    }
    
    // Phone Number
    if (!formData.phoneNumber) {
        showFieldError('phoneNumber', 'Please enter your phone number.');
        return false;
    }
    
    // Password validation - if either field has content, both must be valid
    const hasPassword = formData.password && formData.password.trim() !== '';
    const hasConfirmPassword = formData.confirmPassword && formData.confirmPassword.trim() !== '';
    
    if (hasPassword || hasConfirmPassword) {
        if (!hasPassword) {
            showFieldError('password', 'Please enter a password.');
            return false;
        }
        
        if (!hasConfirmPassword) {
            showFieldError('confirmPassword', 'Please confirm your password.');
            return false;
        }
        
        const passwordValidation = validatePasswordStrength(formData.password);
        if (!passwordValidation.isValid) {
            showFieldError('password', passwordValidation.message);
            return false;
        }
        
        const matchValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
        if (!matchValidation.isValid) {
            showFieldError('confirmPassword', matchValidation.message);
            return false;
        }
    }
    
    // Age confirmation
    if (!formData.over16Confirmed) {
        showFieldError('over16Confirmed', 'You must confirm you are 16 years or older.');
        return false;
    }
    
    // Terms acceptance
    if (!formData.termsAccepted) {
        showFieldError('termsAccepted', 'You must accept the Terms and Conditions.');
        return false;
    }
    
    // Mode-specific validation
    const mode = getRegistrationMode();
    
    if (mode === 'admin') {
        return validateAdminMode(formData);
    }
    
    if (mode === 'new') {
        return validateNewStudentMode(formData);
    }
    
    return true;
}

/**
 * Validate admin mode specific fields
 */
function validateAdminMode(formData) {
    // Admin mode doesn't require payment option or first class date
    return true;
}

/**
 * Validate new student mode specific fields
 */
function validateNewStudentMode(formData) {
    const { showFieldError } = window.FormValidationHelpers || {};
    
    if (!formData.rateType) {
        showFieldError('rateType', 'Please select a payment option.');
        return false;
    }
    
    if (!formData.firstClassDate) {
        showFieldError('first-class-date', 'Please select the date of your first class.');
        return false;
    }
    
    return true;
}
