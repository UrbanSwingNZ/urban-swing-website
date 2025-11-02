/**
 * registration-form-handler.js - Registration Form Handler
 * Handles the registration form submission and pre-fills email if available
 */

document.addEventListener('DOMContentLoaded', () => {
    // Pre-fill email if available from previous step
    const registrationEmail = sessionStorage.getItem('registrationEmail');
    if (registrationEmail) {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = registrationEmail;
        }
        // Clear from sessionStorage after using
        sessionStorage.removeItem('registrationEmail');
    }
    
    // Handle form submission (no functionality yet as requested)
    const form = document.getElementById('registration-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Registration form submitted - functionality to be implemented');
        });
    }
});
