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
    
    // Hide return to home link
    const returnToHome = document.getElementById('return-to-home');
    if (returnToHome) {
        returnToHome.style.display = 'none';
    }
    
    // Hide password section for admin (students can create portal accounts themselves)
    const passwordSection = document.querySelector('.password-section');
    if (passwordSection) {
        passwordSection.style.display = 'none';
    }
    
    // Collapse payment accordion by default for admin
    const paymentSection = document.querySelector('.payment-section');
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
    
    // Show public-only elements (like create portal account checkbox)
    document.querySelectorAll('.public-only').forEach(el => {
        el.style.display = 'block';
    });
    
    // Configure form based on mode
    if (mode === 'existing-incomplete') {
        setupExistingIncompleteMode();
    } else {
        setupNewStudentMode();
    }
    
    // For new students, hide password section by default
    // It will be shown when they check "Create portal account"
    if (mode === 'new') {
        const passwordSection = document.querySelector('.password-section');
        if (passwordSection) {
            passwordSection.style.display = 'none';
        }
        
        // Setup checkbox listener
        setupCreatePortalAccountCheckbox();
        
        // Payment section should be expanded for new students
        const paymentSection = document.querySelector('.payment-section');
        if (paymentSection) {
            paymentSection.classList.remove('collapsed');
        }
    }
}

/**
 * Setup create portal account checkbox listener
 */
function setupCreatePortalAccountCheckbox() {
    const checkbox = document.getElementById('createPortalAccount');
    const passwordSection = document.querySelector('.password-section');
    
    if (!checkbox || !passwordSection) {
        return;
    }
    
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            // Show password section
            passwordSection.style.display = 'block';
            // Expand it
            passwordSection.classList.remove('collapsed');
        } else {
            // Hide password section
            passwordSection.style.display = 'none';
            // Clear password fields
            document.getElementById('password').value = '';
            document.getElementById('confirmPassword').value = '';
        }
    });
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
    
    // Hide create portal account checkbox (they must create account)
    const createPortalAccountGroup = document.getElementById('create-portal-account-group');
    if (createPortalAccountGroup) {
        createPortalAccountGroup.style.display = 'none';
    }
    
    // Show password section (they need to create their password)
    const passwordSection = document.querySelector('.password-section');
    if (passwordSection) {
        passwordSection.style.display = 'block';
        passwordSection.classList.remove('collapsed');
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
