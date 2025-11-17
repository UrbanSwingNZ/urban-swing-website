/**
 * validation.js - Form Validation
 * Handles all form validation logic
 */

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
    
    // Password validation - if either field has content, both must be valid
    const hasPassword = formData.password && formData.password.trim() !== '';
    const hasConfirmPassword = formData.confirmPassword && formData.confirmPassword.trim() !== '';
    
    if (hasPassword || hasConfirmPassword) {
        if (!hasPassword) {
            showErrorMessage('Please enter a password');
            return false;
        }
        
        if (!hasConfirmPassword) {
            showErrorMessage('Please confirm your password');
            return false;
        }
        
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            showErrorMessage(passwordValidation.message);
            return false;
        }
        
        if (!passwordsMatch(formData.password, formData.confirmPassword)) {
            showErrorMessage('Passwords do not match');
            return false;
        }
    }
    
    // Terms acceptance
    if (!formData.termsAccepted) {
        showErrorMessage('You must accept the Terms and Conditions');
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
    if (!formData.phoneNumber) {
        showErrorMessage('Please enter a phone number');
        return false;
    }
    
    if (!formData.over16Confirmed) {
        showErrorMessage('You must confirm the student is 16 years or older');
        return false;
    }
    
    return true;
}

/**
 * Validate new student mode specific fields
 */
function validateNewStudentMode(formData) {
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
    
    if (!formData.firstClassDate) {
        showErrorMessage('Please select the date of your first class');
        return false;
    }
    
    return true;
}
