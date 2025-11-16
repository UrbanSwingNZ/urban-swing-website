/**
 * registration-form-handler.js - Registration Form Handler
 * Handles the registration form submission with support for new, existing-incomplete students, and admin mode
 */

let registrationConfig = {
    mode: 'new', // 'new', 'existing-incomplete', or 'admin'
    studentData: null,
    email: null,
    isAdmin: false,
    userRole: null
};

// Date picker instance
let firstClassDatePicker = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeRegistrationForm();
    
    // Initialize date picker for first class date
    firstClassDatePicker = new DatePicker('first-class-date', 'first-class-calendar', {
        allowedDays: [4], // Thursday only
        disablePastDates: true,
        onDateSelected: (date, formattedDate) => {
            console.log('First class date selected:', date);
        }
    });

    // Initialize accordion functionality
    initializeAccordions();
});

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
                        registrationConfig.isAdmin = true;
                        registrationConfig.mode = 'admin';
                        setupAdminMode();
                        console.log('Admin mode enabled');
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
    
    // Make password and payment fields optional for admin
    makeFieldsOptional();
    
    // Update submit button text
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Register Student';
    }
    
    // Handle form submission
    const form = document.getElementById('registration-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Setup public mode
 */
function setupPublicMode() {
    // Get registration data from sessionStorage
    const email = sessionStorage.getItem('registrationEmail');
    const mode = sessionStorage.getItem('registrationMode') || 'new';
    const studentDataJson = sessionStorage.getItem('registrationStudentData');
    
    registrationConfig.email = email;
    registrationConfig.mode = mode;
    
    if (studentDataJson) {
        try {
            registrationConfig.studentData = JSON.parse(studentDataJson);
        } catch (error) {
            console.error('Error parsing student data:', error);
        }
    }
    
    // Clear sessionStorage
    sessionStorage.removeItem('registrationEmail');
    sessionStorage.removeItem('registrationMode');
    sessionStorage.removeItem('registrationStudentData');
    
    // Configure form based on mode
    if (registrationConfig.mode === 'existing-incomplete') {
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
    if (paymentSection && registrationConfig.mode === 'new') {
        paymentSection.classList.remove('collapsed');
    }
    
    // Handle form submission
    const form = document.getElementById('registration-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Make password and payment fields optional (for admin mode)
 */
function makeFieldsOptional() {
    // Password fields
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (passwordInput) passwordInput.removeAttribute('required');
    if (confirmPasswordInput) confirmPasswordInput.removeAttribute('required');
    
    // Payment fields
    const rateTypeInputs = document.querySelectorAll('input[name="rateType"]');
    rateTypeInputs.forEach(input => {
        input.removeAttribute('required');
    });
    
    const firstClassDate = document.getElementById('first-class-date');
    if (firstClassDate) firstClassDate.removeAttribute('required');
}

/**
 * Setup form for existing-incomplete student
 */
function setupExistingIncompleteMode() {
    const studentData = registrationConfig.studentData;
    
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
        if (registrationConfig.mode === 'admin') {
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
            
        } else if (registrationConfig.mode === 'existing-incomplete') {
            await processExistingIncompleteRegistration(formData);
            
            // Show success and redirect to dashboard
            showSuccessMessage('Registration successful! Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard/index.html';
            }, 2000);
        } else {
            await processNewStudentRegistration(formData);
            
            // Debug banner is shown by processNewStudentRegistration
            // Redirect disabled for debugging
            // setTimeout(() => {
            //     window.location.href = 'index.html';
            // }, 15000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showErrorMessage(error.message || 'Registration failed. Please try again.');
        showLoadingSpinner(false);
    }
}

/**
 * Process admin registration
 */
async function processAdminRegistration(formData) {
    // Check if password was provided
    const hasPassword = formData.password && formData.password.trim() !== '';
    
    // Check if payment was provided
    const hasPayment = formData.rateType && formData.rateType !== '';
    
    // Generate student ID
    const studentId = generateStudentId(formData.firstName, formData.lastName);
    
    // Create student document
    const studentData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        pronouns: formData.pronouns,
        over16Confirmed: formData.over16Confirmed,
        termsAccepted: formData.termsAccepted,
        emailConsent: formData.emailConsent,
        adminNotes: formData.adminNotes || '',
        registeredAt: firebase.firestore.Timestamp.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await window.db.collection('students').doc(studentId).set(studentData);
    console.log('Student document created:', studentId);
    
    // If password provided, create auth user and user document
    if (hasPassword) {
        const authUser = await createAuthUser(formData.email, formData.password);
        console.log('Firebase Auth user created:', authUser.uid);
        
        await window.db.collection('users').doc(authUser.uid).set({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            studentId: studentId,
            role: 'student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('User document created:', authUser.uid);
        
        // Sign out the newly created user (so admin stays signed in)
        await firebase.auth().signOut();
        
        // Re-authenticate the admin
        // (Note: This is a simplified approach. In production, you might want to use admin SDK on backend)
        console.log('Admin should re-authenticate if needed');
    }
    
    // If payment provided, process payment
    if (hasPayment && formData.firstClassDate) {
        // For admin registration with payment, we still use the payment handler
        // but we don't create auth user again
        console.log('Processing payment for admin-registered student...');
        // Note: This would need special handling to avoid creating duplicate auth users
        // For now, we'll just log this case
        console.warn('Admin payment processing not fully implemented - student document created without payment');
    }
}

/**
 * Generate human-readable student ID
 */
function generateStudentId(firstName, lastName) {
    // Normalize names: lowercase, remove special characters, replace spaces with hyphens
    const cleanFirst = firstName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const cleanLast = lastName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    // Generate a short random suffix (6 characters)
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `${cleanFirst}-${cleanLast}-${randomSuffix}`;
}

/**
 * Process registration for existing-incomplete student
 */
async function processExistingIncompleteRegistration(formData) {
    const studentData = registrationConfig.studentData;
    const studentId = studentData.id;
    
    // 1. Create Firebase Auth user
    const authUser = await createAuthUser(formData.email, formData.password);
    console.log('Firebase Auth user created:', authUser.uid);
    
    // 2. Update student document (add termsAccepted)
    await updateStudentTerms(studentId);
    console.log('Student document updated with terms acceptance');
    
    // 3. Create user document
    const userData = {
        email: formData.email,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        authUid: authUser.uid
    };
    
    await createUser(userData, studentId);
    console.log('User document created');
}

/**
 * Process registration for new student
 */
async function processNewStudentRegistration(formData) {
    // Step 1: Call backend Firebase Function to process payment and create documents
    // Backend creates: student document, transaction document
    // Backend also: processes Stripe payment, creates Stripe customer
    const result = await processRegistrationWithPayment({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        pronouns: formData.pronouns,
        over16Confirmed: formData.over16Confirmed,
        termsAccepted: formData.termsAccepted,
        emailConsent: formData.emailConsent,
        firstClassDate: formData.firstClassDate
    });
    
    if (!result.success) {
        throw new Error('Payment processing failed');
    }
    
    console.log('Payment successful. Documents created:', result);
    
    // Step 2: Create Firebase Auth user (frontend)
    const authUser = await createAuthUser(formData.email, formData.password);
    console.log('Firebase Auth user created:', authUser.uid);
    
    // Step 3: Create user document with authUid as document ID
    await window.db.collection('users').doc(authUser.uid).set({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentId: result.studentId,
        role: 'student',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('User document created:', authUser.uid);
    
    // Step 4: Redirect to dashboard (user is now fully registered and signed in)
    window.location.href = 'dashboard/index.html';
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
        firstClassDate: firstClassDatePicker ? firstClassDatePicker.getSelectedDate() : null,
        adminNotes: registrationConfig.isAdmin ? (document.getElementById('adminNotes')?.value.trim() || '') : ''
    };
}

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
    
    // Admin mode: password and payment are optional
    if (registrationConfig.mode === 'admin') {
        // If password is provided, validate it
        if (formData.password || formData.confirmPassword) {
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
        
        // If payment is provided, first class date must also be provided
        if (formData.rateType && !formData.firstClassDate) {
            showErrorMessage('Please select the date of your first class');
            return false;
        }
        
        // Phone number required for admin
        if (!formData.phoneNumber) {
            showErrorMessage('Please enter your phone number');
            return false;
        }
        
        // Over 16 confirmation required
        if (!formData.over16Confirmed) {
            showErrorMessage('You must confirm you are 16 years or older');
            return false;
        }
        
        // Terms acceptance required
        if (!formData.termsAccepted) {
            showErrorMessage('You must accept the Terms and Conditions');
            return false;
        }
        
        return true;
    }
    
    // Public mode: password required
    if (!formData.password || !formData.confirmPassword) {
        showErrorMessage('Please enter your password');
        return false;
    }
    
    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
        showErrorMessage(passwordValidation.message);
        return false;
    }
    
    // Password match validation
    if (!passwordsMatch(formData.password, formData.confirmPassword)) {
        showErrorMessage('Passwords do not match');
        return false;
    }
    
    // Terms acceptance
    if (!formData.termsAccepted) {
        showErrorMessage('You must accept the Terms and Conditions');
        return false;
    }
    
    // Mode-specific validation
    if (registrationConfig.mode === 'new') {
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
    }
    
    return true;
}

/**
 * Show loading spinner
 */
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loading-spinner');
    const submitBtn = document.getElementById('submit-btn');
    
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        const span = successDiv.querySelector('span');
        if (span) {
            span.textContent = message;
        }
        successDiv.style.display = 'flex';
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Scroll to error message
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Hide all messages
 */
function hideMessages() {
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    
    if (successDiv) successDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
}

/**
 * Initialize accordion functionality
 */
function initializeAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const section = this.closest('.accordion-section');
            section.classList.toggle('collapsed');
        });
    });
}

/**
 * Show snackbar notification
 */
function showSnackbar(message, type = 'success', duration = 3000) {
    // Remove any existing snackbar
    const existingSnackbar = document.getElementById('snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }
    
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.id = 'snackbar';
    snackbar.className = `snackbar snackbar-${type}`;
    
    // Add icon based on type
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';
    
    snackbar.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    // Add to body
    document.body.appendChild(snackbar);
    
    // Trigger animation
    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10);
    
    // Auto-hide after duration
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => {
            snackbar.remove();
        }, 300);
    }, duration);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

