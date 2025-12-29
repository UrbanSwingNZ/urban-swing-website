/**
 * Form Validation Helpers
 * Centralized utilities for consistent form validation across the application
 * Provides standardized error display with accessibility support
 */

/**
 * Display an error message for a specific field with ARIA attributes
 * @param {string} fieldId - ID of the form field
 * @param {string} message - Error message to display
 * @example
 * showFieldError('email', 'Please enter a valid email address.');
 */
export function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}-error`);
    
    if (!field || !errorEl) {
        console.warn(`Field or error element not found for: ${fieldId}`);
        return;
    }
    
    // Display error message
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Set ARIA attributes for accessibility
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `${fieldId}-error`);
    
    // Add error styling to field
    field.classList.add('invalid');
    
    // Hide any hint text (small tags) in the same form-group to avoid duplication
    const formGroup = field.closest('.form-group');
    if (formGroup) {
        const hints = formGroup.querySelectorAll('small');
        hints.forEach(hint => {
            hint.style.display = 'none';
        });
    }
    
    // Move focus to the invalid field
    field.focus();
}

/**
 * Clear error message for a specific field
 * @param {string} fieldId - ID of the form field
 * @example
 * clearFieldError('email');
 */
export function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}-error`);
    
    if (!field || !errorEl) {
        return;
    }
    
    // Hide error message
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    
    // Remove ARIA attributes
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    
    // Remove error styling from field
    field.classList.remove('invalid');
    
    // Restore hint text visibility
    const formGroup = field.closest('.form-group');
    if (formGroup) {
        const hints = formGroup.querySelectorAll('small');
        hints.forEach(hint => {
            hint.style.display = 'block';
        });
    }
}

/**
 * Clear all error messages in a form
 * @param {string} formId - ID of the form element
 * @example
 * clearAllFieldErrors('login-form');
 */
export function clearAllFieldErrors(formId) {
    const form = document.getElementById(formId);
    
    if (!form) {
        console.warn(`Form not found: ${formId}`);
        return;
    }
    
    // Find all error message elements
    const errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(errorEl => {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    });
    
    // Remove ARIA attributes and styling from all fields
    const fields = form.querySelectorAll('[aria-invalid="true"]');
    fields.forEach(field => {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        field.classList.remove('invalid');
    });
}

/**
 * Validate password strength and requirements
 * Consolidated from multiple password validation implementations
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum password length (default: 8)
 * @param {boolean} options.requireUppercase - Require uppercase letter (default: true)
 * @param {boolean} options.requireLowercase - Require lowercase letter (default: true)
 * @param {boolean} options.requireNumber - Require number (default: false)
 * @param {boolean} options.requireSpecial - Require special character (default: false)
 * @returns {Object} - { isValid: boolean, message: string }
 * @example
 * validatePasswordStrength('Test1234') // { isValid: true, message: '' }
 * validatePasswordStrength('test') // { isValid: false, message: 'Password must be at least 8 characters long.' }
 */
export function validatePasswordStrength(password, options = {}) {
    const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireNumber = false,
        requireSpecial = false
    } = options;
    
    // Check if password is provided
    if (!password) {
        return {
            isValid: false,
            message: 'Password is required.'
        };
    }
    
    // Check minimum length
    if (password.length < minLength) {
        return {
            isValid: false,
            message: `Password must be at least ${minLength} characters long.`
        };
    }
    
    // Check for uppercase letter
    if (requireUppercase && !/[A-Z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one uppercase letter.'
        };
    }
    
    // Check for lowercase letter
    if (requireLowercase && !/[a-z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one lowercase letter.'
        };
    }
    
    // Check for number
    if (requireNumber && !/[0-9]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one number.'
        };
    }
    
    // Check for special character
    if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one special character.'
        };
    }
    
    return {
        isValid: true,
        message: ''
    };
}

/**
 * Validate that two passwords match
 * @param {string} password - First password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} - { isValid: boolean, message: string }
 * @example
 * validatePasswordMatch('test123', 'test123') // { isValid: true, message: '' }
 * validatePasswordMatch('test123', 'test456') // { isValid: false, message: 'Passwords do not match.' }
 */
export function validatePasswordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
        return {
            isValid: false,
            message: 'Passwords do not match.'
        };
    }
    
    return {
        isValid: true,
        message: ''
    };
}

/**
 * Validate password change (current, new, confirm)
 * Includes all checks: strength, matching, different from current
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @param {string} confirmPassword - Confirmation of new password
 * @param {Object} options - Password strength options (passed to validatePasswordStrength)
 * @returns {Object} - { isValid: boolean, message: string, field: string }
 * @example
 * validatePasswordChange('old', 'NewPass123', 'NewPass123')
 */
export function validatePasswordChange(currentPassword, newPassword, confirmPassword, options = {}) {
    // Check all fields filled
    if (!currentPassword) {
        return {
            isValid: false,
            message: 'Please enter your current password.',
            field: 'currentPassword'
        };
    }
    
    if (!newPassword) {
        return {
            isValid: false,
            message: 'Please enter a new password.',
            field: 'newPassword'
        };
    }
    
    if (!confirmPassword) {
        return {
            isValid: false,
            message: 'Please confirm your new password.',
            field: 'confirmPassword'
        };
    }
    
    // Validate new password strength
    const strengthCheck = validatePasswordStrength(newPassword, options);
    if (!strengthCheck.isValid) {
        return {
            isValid: false,
            message: strengthCheck.message,
            field: 'newPassword'
        };
    }
    
    // Check passwords match
    const matchCheck = validatePasswordMatch(newPassword, confirmPassword);
    if (!matchCheck.isValid) {
        return {
            isValid: false,
            message: matchCheck.message,
            field: 'confirmPassword'
        };
    }
    
    // Check new password is different from current
    if (newPassword === currentPassword) {
        return {
            isValid: false,
            message: 'New password must be different from current password.',
            field: 'newPassword'
        };
    }
    
    return {
        isValid: true,
        message: '',
        field: null
    };
}

/**
 * Setup real-time validation for a field
 * Validates on blur, clears error on input
 * @param {string} fieldId - ID of the field
 * @param {Function} validationFn - Function that returns { isValid: boolean, message: string }
 * @example
 * setupFieldValidation('email', (value) => {
 *   if (!isValidEmail(value)) {
 *     return { isValid: false, message: 'Invalid email address.' };
 *   }
 *   return { isValid: true, message: '' };
 * });
 */
export function setupFieldValidation(fieldId, validationFn) {
    const field = document.getElementById(fieldId);
    
    if (!field) {
        console.warn(`Field not found: ${fieldId}`);
        return;
    }
    
    // Validate on blur (when user leaves field)
    field.addEventListener('blur', () => {
        const value = field.value.trim();
        
        // Skip validation if field is empty and not required
        if (!value && !field.hasAttribute('required')) {
            clearFieldError(fieldId);
            return;
        }
        
        const result = validationFn(value);
        
        if (!result.isValid) {
            showFieldError(fieldId, result.message);
        } else {
            clearFieldError(fieldId);
        }
    });
    
    // Clear error on input (as user types)
    field.addEventListener('input', () => {
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl && errorEl.style.display === 'block') {
            clearFieldError(fieldId);
        }
    });
}
