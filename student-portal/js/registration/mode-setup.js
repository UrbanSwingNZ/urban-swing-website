/**
 * mode-setup.js - Registration Mode Setup
 * Configures the form based on user mode (admin, public new, existing-incomplete)
 */

/**
 * Setup admin mode
 */
function setupAdminMode() {
    // Show admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'block';
    });
    
    // Hide back to login link
    const backToLogin = document.getElementById('back-to-login');
    if (backToLogin) {
        backToLogin.style.display = 'none';
    }
    
    // Collapse accordions by default for admin
    const passwordSection = document.querySelector('.password-section');
    const paymentSection = document.querySelector('.payment-section');
    
    if (passwordSection) {
        passwordSection.classList.add('collapsed');
    }
    if (paymentSection) {
        paymentSection.classList.add('collapsed');
    }
    
    // Make payment fields optional for admin
    makePaymentFieldsOptional();
    
    // Update submit button text
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Register Student';
    }
    
    console.log('Admin mode enabled');
}

/**
 * Setup public mode
 */
function setupPublicMode() {
    // Get registration data from sessionStorage
    const email = sessionStorage.getItem('registrationEmail');
    const mode = sessionStorage.getItem('registrationMode') || 'new';
    const studentDataJson = sessionStorage.getItem('registrationStudentData');
    
    if (email) {
        registrationConfig.email = email;
    }
    
    setRegistrationMode(mode);
    
    if (studentDataJson) {
        try {
            setStudentData(JSON.parse(studentDataJson));
        } catch (error) {
            console.error('Error parsing student data:', error);
        }
    }
    
    // Clear sessionStorage
    sessionStorage.removeItem('registrationEmail');
    sessionStorage.removeItem('registrationMode');
    sessionStorage.removeItem('registrationStudentData');
    
    // Configure form based on mode
    if (mode === 'existing-incomplete') {
        setupExistingIncompleteMode();
    } else {
        setupNewStudentMode();
    }
    
    // Ensure accordions are expanded for public users
    const passwordSection = document.querySelector('.password-section');
    const paymentSection = document.querySelector('.payment-section');
    
    if (passwordSection) {
        passwordSection.classList.remove('collapsed');
    }
    if (paymentSection && mode === 'new') {
        paymentSection.classList.remove('collapsed');
    }
}

/**
 * Setup form for existing-incomplete student
 */
function setupExistingIncompleteMode() {
    const studentData = getStudentData();
    
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
 * Make payment fields optional (for admin mode)
 */
function makePaymentFieldsOptional() {
    const rateTypeInputs = document.querySelectorAll('input[name="rateType"]');
    rateTypeInputs.forEach(input => {
        input.removeAttribute('required');
    });
    
    const firstClassDate = document.getElementById('first-class-date');
    if (firstClassDate) firstClassDate.removeAttribute('required');
}
