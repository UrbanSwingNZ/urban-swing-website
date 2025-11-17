/**
 * form-handler.js - Main Form Handler
 * Orchestrates the registration form flow
 */

/**
 * Initialize the registration form
 */
async function initializeRegistrationForm() {
    // Check for admin authentication first
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in - check if they're an admin
            try {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    registrationConfig.userRole = userData.role;
                    
                    if (userData.role === 'admin') {
                        setAdminStatus(true);
                        setRegistrationMode('admin');
                        setupAdminMode();
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking user role:', error);
            }
        }
        
        // Not admin - check for public registration modes
        setupPublicMode();
    });
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
        const mode = getRegistrationMode();
        
        if (mode === 'admin') {
            await processAdminRegistration(formData);
            
            // Show success snackbar
            showSnackbar('Student registered successfully!', 'success');
            
            // Scroll to bottom to show back buttons
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
            
            // Reset form
            document.getElementById('registration-form').reset();
            
            // Re-check the email consent box (default is checked)
            document.getElementById('emailConsent').checked = true;
            
            showLoadingSpinner(false);
            
        } else if (mode === 'existing-incomplete') {
            await processExistingIncompleteRegistration(formData);
            
            // Show success and redirect to dashboard
            showSuccessMessage('Registration successful! Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard/index.html';
            }, 2000);
        } else {
            await processNewStudentRegistration(formData);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showErrorMessage(error.message || 'Registration failed. Please try again.');
        showLoadingSpinner(false);
    }
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
        rateType: document.querySelector('input[name="rateType"]:checked')?.value || '',
        firstClassDate: getDatePicker() ? getDatePicker().getSelectedDate() : null,
        adminNotes: isAdminUser() ? (document.getElementById('adminNotes')?.value.trim() || '') : ''
    };
}

/**
 * Initialize form on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeRegistrationForm();
    
    // Initialize date picker for first class date
    const datePicker = new DatePicker('first-class-date', 'first-class-calendar', {
        allowedDays: [4], // Thursday only
        disablePastDates: true,
        onDateSelected: (date, formattedDate) => {
            console.log('First class date selected:', date);
        }
    });
    setDatePicker(datePicker);

    // Initialize accordion functionality
    initializeAccordions();
    
    // Handle form submission
    const form = document.getElementById('registration-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});
