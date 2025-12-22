/**
 * Password Validation Module
 * Handles all password validation logic: strength, requirements, matching
 */

/**
 * Validate all password fields and requirements
 * @param {string} currentPassword - Current password input
 * @param {string} newPassword - New password input
 * @param {string} confirmPassword - Confirm password input
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export function validatePasswords(currentPassword, newPassword, confirmPassword) {
    // Check all fields filled
    if (!currentPassword || !newPassword || !confirmPassword) {
        return {
            valid: false,
            error: 'Please fill in all password fields.'
        };
    }

    // Check new password length (minimum 8 characters)
    if (newPassword.length < 8) {
        return {
            valid: false,
            error: 'New password must be at least 8 characters long.'
        };
    }

    // Check for uppercase letter
    if (!hasUppercase(newPassword)) {
        return {
            valid: false,
            error: 'New password must contain at least one uppercase letter.'
        };
    }

    // Check for lowercase letter
    if (!hasLowercase(newPassword)) {
        return {
            valid: false,
            error: 'New password must contain at least one lowercase letter.'
        };
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
        return {
            valid: false,
            error: 'New passwords do not match.'
        };
    }

    // Check new password is different from current
    if (newPassword === currentPassword) {
        return {
            valid: false,
            error: 'New password must be different from current password.'
        };
    }

    return { valid: true, error: null };
}

/**
 * Check if password contains uppercase letter
 * @param {string} password - Password to check
 * @returns {boolean}
 */
export function hasUppercase(password) {
    return /[A-Z]/.test(password);
}

/**
 * Check if password contains lowercase letter
 * @param {string} password - Password to check
 * @returns {boolean}
 */
export function hasLowercase(password) {
    return /[a-z]/.test(password);
}

/**
 * Check if password meets minimum length requirement
 * @param {string} password - Password to check
 * @param {number} minLength - Minimum required length (default: 8)
 * @returns {boolean}
 */
export function meetsMinLength(password, minLength = 8) {
    return password && password.length >= minLength;
}

/**
 * Check if two passwords match
 * @param {string} password1 - First password
 * @param {string} password2 - Second password
 * @returns {boolean}
 */
export function passwordsMatch(password1, password2) {
    return password1 === password2;
}

/**
 * Check if new password is different from current
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean}
 */
export function isDifferentPassword(currentPassword, newPassword) {
    return currentPassword !== newPassword;
}
