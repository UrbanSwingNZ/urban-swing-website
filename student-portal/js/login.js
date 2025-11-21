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

    // Note: Register button handler is now in registration-handler.js

    // Login handler function
    const loginBtn = existingStudentForm.querySelector('.action-btn');
    const loginErrorEl = document.getElementById('login-error');
    
    const handleLogin = async function(e) {
        e.preventDefault();
        
        // Clear previous error
        loginErrorEl.textContent = '';
        
        const email = document.getElementById('existingStudentEmail').value.trim();
        const password = document.getElementById('existingStudentPassword').value;
        
        // Validate inputs
        if (!email || !password) {
            loginErrorEl.textContent = 'Please enter both email and password';
            return;
        }
        
        // Disable button and show loading state
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
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
                throw new Error('Email address not registered for student portal.');
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
                error.message === 'Email address not registered for student portal.') {
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
    };
    
    // Login button click handler
    loginBtn.addEventListener('click', handleLogin);
    
    // Enter key handler for login form
    document.getElementById('existingStudentPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
    
    document.getElementById('existingStudentEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });

    // Reset Password button handler - using new modal utility
    const resetBtn = existingStudentForm.querySelector('.reset-btn');
    resetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Get email from the existing student email field
        const email = document.getElementById('existingStudentEmail').value.trim();
        
        // Show password reset modal with pre-filled email
        showPasswordResetModal(email, (sentEmail) => {
            console.log('Password reset email sent to:', sentEmail);
            // Clear the password field for security
            document.getElementById('existingStudentPassword').value = '';
        });
    });
});
