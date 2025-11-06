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
    const handleLogin = async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('existingStudentEmail').value.trim();
        const password = document.getElementById('existingStudentPassword').value;
        
        // Validate inputs
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        // Disable button and show loading state
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
        try {
            // Sign in with Firebase Auth
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            console.log('Login successful:', userCredential.user.uid);
            
            // Check if user document exists and has student role
            const userDoc = await firebase.firestore().collection('users').doc(userCredential.user.uid).get();
            
            if (!userDoc.exists) {
                throw new Error('User profile not found');
            }
            
            const userData = userDoc.data();
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
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Invalid email or password';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
            
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

    // Reset Password button handler
    const resetBtn = existingStudentForm.querySelector('.reset-btn');
    resetBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('existingStudentEmail').value.trim();
        
        if (!email) {
            alert('Please enter your email address');
            return;
        }
        
        // Disable button and show loading state
        resetBtn.disabled = true;
        resetBtn.textContent = 'Sending...';
        
        try {
            await firebase.auth().sendPasswordResetEmail(email);
            alert('Password reset email sent! Please check your inbox.');
            resetBtn.disabled = false;
            resetBtn.textContent = 'Reset Password';
        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMessage = 'Failed to send reset email. Please try again.';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            }
            
            alert(errorMessage);
            resetBtn.disabled = false;
            resetBtn.textContent = 'Reset Password';
        }
    });
});
