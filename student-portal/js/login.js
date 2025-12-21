// ========================================
// STUDENT PORTAL - LOGIN PAGE JAVASCRIPT
// Card-based UI with three options
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize card click handlers
    initializeOptionCards();
    
    // Initialize login form
    initializeLoginForm();
    
    // Initialize password reset
    initializePasswordReset();
    
    // Initialize new student (brand new) handler
    initializeNewStudentHandler();
});

/**
 * Initialize option card click handlers to expand/collapse forms
 */
function initializeOptionCards() {
    const optionCards = document.querySelectorAll('.option-card');
    
    optionCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't toggle if clicking on form elements inside
            if (e.target.closest('.option-form')) {
                return;
            }
            
            const option = card.dataset.option;
            
            // Handle "new student" card - direct navigation
            if (option === 'new-student') {
                // Store mode in sessionStorage for registration page
                sessionStorage.setItem('registrationMode', 'new');
                sessionStorage.removeItem('registrationEmail');
                sessionStorage.removeItem('registrationStudentData');
                window.location.href = 'register.html';
                return;
            }
            
            // For other options, toggle the card active state
            const isActive = card.classList.contains('active');
            
            // Close all other cards
            optionCards.forEach(c => c.classList.remove('active'));
            
            // Toggle this card
            if (!isActive) {
                card.classList.add('active');
                
                // Focus on first input in the form
                setTimeout(() => {
                    const firstInput = card.querySelector('.option-form input');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 100);
            }
        });
    });
}

/**
 * Initialize new student handler (brand new to Urban Swing)
 */
function initializeNewStudentHandler() {
    // This is now handled by the card click event
    // which navigates directly to register.html
}

/**
 * Initialize login form handlers
 */
function initializeLoginForm() {
    const loginBtn = document.getElementById('loginSubmit');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginErrorEl = document.getElementById('login-error');
    
    if (!loginBtn || !loginEmail || !loginPassword) {
        console.error('Login form elements not found');
        return;
    }
    
    // Login button click handler
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleLogin();
    });
    
    // Allow enter key to submit from email field
    loginEmail.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginPassword.focus();
        }
    });
    
    // Allow enter key to submit from password field
    loginPassword.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleLogin();
        }
    });
}

/**
 * Handle login form submission
 */
async function handleLogin() {
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginErrorEl = document.getElementById('login-error');
    const loginBtn = document.getElementById('loginSubmit');
    
    // Clear previous error
    loginErrorEl.textContent = '';
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    // Validate inputs
    if (!email || !password) {
        loginErrorEl.textContent = 'Please enter both email and password';
        return;
    }
    
    // Disable button and show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<i class="fas ${ICONS.LOADING}"></i> Logging in...`;
    
    try {
        // First, check if email exists in students collection
        const normalizedEmail = email.toLowerCase().trim();
        const studentsQuery = await firebase.firestore().collection('students')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();
        
        if (studentsQuery.empty) {
            // Email not found in students collection
            throw new Error('Email address not found.');
        }
        
        // Email exists in students - now check if they have a users document
        const usersQuery = await firebase.firestore().collection('users')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();
        
        if (usersQuery.empty) {
            // Student exists but no user account
            throw new Error('Email address not registered for student portal. Please use "I\'m an existing student" to set up portal access.');
        }
        
        // Both student and user exist - now try to sign in (password check)
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.uid);
        
        // Check if user document exists and has student role
        const userDoc = await firebase.firestore().collection('users').doc(userCredential.user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('User profile not found');
        }
        
        const userData = userDoc.data();
        
        // Check if user has been soft-deleted
        if (userData.deleted === true) {
            await firebase.auth().signOut();
            throw new Error('No account found with this email address');
        }
        
        if (userData.role !== 'student') {
            // Not a student - sign them out
            await firebase.auth().signOut();
            throw new Error('This portal is for students only. Please use the admin portal.');
        }
        
        // Redirect to dashboard
        window.location.href = 'dashboard/index.html';
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Show user-friendly error messages
        let errorMessage = 'Login failed. Please try again.';
        
        // Check for custom error messages first
        if (error.message === 'Email address not found.' || 
            error.message.includes('not registered for student portal')) {
            errorMessage = error.message;
        } else if (error.code === 'auth/invalid-login-credentials' || 
                   error.code === 'auth/wrong-password') {
            // Password is wrong (student and user exist, but wrong password)
            errorMessage = 'Invalid password. Please try again.';
        } else if (error.code === 'auth/user-not-found') {
            // This shouldn't happen since we checked above, but handle it
            errorMessage = 'Email address not found.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/user-disabled') {
            // Show "email not found" instead of "account disabled" for soft-deleted students
            errorMessage = 'No account found with this email address';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (error.message && !error.code) {
            // Custom error messages (like from our checks above)
            errorMessage = error.message;
        }
        
        loginErrorEl.textContent = errorMessage;
        
        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

/**
 * Initialize password reset handler
 */
function initializePasswordReset() {
    const resetBtn = document.getElementById('resetPasswordBtn');
    
    if (!resetBtn) {
        console.error('Reset password button not found');
        return;
    }
    
    resetBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const loginEmail = document.getElementById('loginEmail');
        const email = loginEmail.value.trim();
        
        // Use the password reset modal utility if available
        if (window.showPasswordResetModal) {
            window.showPasswordResetModal(email, (sentEmail) => {
                console.log('Password reset email sent to:', sentEmail);
                // Clear the password field for security
                const loginPassword = document.getElementById('loginPassword');
                if (loginPassword) {
                    loginPassword.value = '';
                }
            });
        } else {
            // Fallback to basic Firebase password reset with validation
            if (!email) {
                const loginErrorEl = document.getElementById('login-error');
                loginErrorEl.textContent = 'Please enter your email address first';
                return;
            }
            
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                alert('Password reset email sent! Please check your inbox.');
            } catch (error) {
                console.error('Password reset error:', error);
                alert('Error sending password reset email. Please try again.');
            }
        }
    });
}
