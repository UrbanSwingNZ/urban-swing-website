/**
 * Validation Utilities
 * Functions for form validation and data checking
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 * @example
 * isValidEmail('test@example.com') // Returns true
 * isValidEmail('invalid-email') // Returns false
 */
export function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if a form field has changed from its original value
 * @param {*} currentValue - Current form field value
 * @param {*} originalValue - Original value
 * @returns {boolean} True if changed
 * @example
 * hasFieldChanged('new value', 'old value') // Returns true
 * hasFieldChanged('same', 'same') // Returns false
 */
export function hasFieldChanged(currentValue, originalValue) {
    // Handle boolean fields
    if (typeof currentValue === 'boolean') {
        return currentValue !== (originalValue || false);
    }
    
    // Handle string fields
    return currentValue !== (originalValue || '');
}

/**
 * Check if a value is required and present
 * @param {*} value - Value to check
 * @returns {boolean} True if value is present
 * @example
 * isRequired('hello') // Returns true
 * isRequired('') // Returns false
 * isRequired(null) // Returns false
 */
export function isRequired(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'boolean') return true;
    return !!value;
}
