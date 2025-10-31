// ========================================
// STUDENT PORTAL - LOGIN PAGE JAVASCRIPT
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const newStudentBtn = document.getElementById('newStudentBtn');
    const existingStudentBtn = document.getElementById('existingStudentBtn');
    const newStudentForm = document.getElementById('newStudentForm');
    const existingStudentForm = document.getElementById('existingStudentForm');

    // Toggle to New Student view
    newStudentBtn.addEventListener('click', function() {
        // Update button states
        newStudentBtn.classList.add('active');
        existingStudentBtn.classList.remove('active');
        
        // Show/hide forms
        newStudentForm.classList.add('active');
        existingStudentForm.classList.remove('active');
    });

    // Toggle to Existing Student view
    existingStudentBtn.addEventListener('click', function() {
        // Update button states
        existingStudentBtn.classList.add('active');
        newStudentBtn.classList.remove('active');
        
        // Show/hide forms
        existingStudentForm.classList.add('active');
        newStudentForm.classList.remove('active');
    });

    // Placeholder: Register button (non-functional for now)
    const registerBtn = newStudentForm.querySelector('.action-btn');
    registerBtn.addEventListener('click', function() {
        console.log('Register button clicked - functionality coming soon');
        // TODO: Navigate to registration page
    });

    // Placeholder: Login button (non-functional for now)
    const loginBtn = existingStudentForm.querySelector('.action-btn');
    loginBtn.addEventListener('click', function() {
        console.log('Login button clicked - functionality coming soon');
        // TODO: Implement Firebase authentication
    });

    // Placeholder: Reset Password button (non-functional for now)
    const resetBtn = existingStudentForm.querySelector('.reset-btn');
    resetBtn.addEventListener('click', function() {
        console.log('Reset Password button clicked - functionality coming soon');
        // TODO: Implement password reset
    });
});
