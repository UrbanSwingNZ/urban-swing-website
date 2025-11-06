/**
 * auth-service.js - Firebase Authentication Service
 * Handles all Firebase Authentication operations
 */

/**
 * Create a new user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Firebase user credential with user.uid
 */
async function createAuthUser(email, password) {
    try {
        if (!firebase.auth) {
            throw new Error('Firebase Auth not initialized');
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        
        // Create user in Firebase Authentication
        const userCredential = await firebase.auth()
            .createUserWithEmailAndPassword(normalizedEmail, password);
        
        console.log('Firebase Auth user created:', userCredential.user.uid);
        
        return {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        };
        
    } catch (error) {
        console.error('Error creating auth user:', error);
        
        // Provide user-friendly error messages
        let message = 'Failed to create account. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
            message = 'This email is already registered. Please login instead.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            message = 'Password is too weak. Please choose a stronger password.';
        } else if (error.code === 'auth/network-request-failed') {
            message = 'Network error. Please check your connection and try again.';
        }
        
        throw new Error(message);
    }
}

/**
 * Sign in an existing user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Firebase user credential with user.uid
 */
async function signInUser(email, password) {
    try {
        if (!firebase.auth) {
            throw new Error('Firebase Auth not initialized');
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        
        const userCredential = await firebase.auth()
            .signInWithEmailAndPassword(normalizedEmail, password);
        
        console.log('User signed in:', userCredential.user.uid);
        
        return {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        };
        
    } catch (error) {
        console.error('Error signing in:', error);
        
        let message = 'Failed to sign in. Please try again.';
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address.';
        } else if (error.code === 'auth/user-disabled') {
            message = 'This account has been disabled.';
        } else if (error.code === 'auth/network-request-failed') {
            message = 'Network error. Please check your connection and try again.';
        }
        
        throw new Error(message);
    }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
async function signOutUser() {
    try {
        if (!firebase.auth) {
            throw new Error('Firebase Auth not initialized');
        }
        
        await firebase.auth().signOut();
        console.log('User signed out');
        
    } catch (error) {
        console.error('Error signing out:', error);
        throw new Error('Failed to sign out. Please try again.');
    }
}

/**
 * Get the currently signed-in user
 * @returns {Object|null} Current user object or null if not signed in
 */
function getCurrentUser() {
    if (!firebase.auth) {
        console.error('Firebase Auth not initialized');
        return null;
    }
    
    return firebase.auth().currentUser;
}

/**
 * Send a password reset email
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(email) {
    try {
        if (!firebase.auth) {
            throw new Error('Firebase Auth not initialized');
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        
        await firebase.auth().sendPasswordResetEmail(normalizedEmail);
        console.log('Password reset email sent to:', normalizedEmail);
        
    } catch (error) {
        console.error('Error sending password reset email:', error);
        
        let message = 'Failed to send password reset email. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
            message = 'No account found with this email address.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address.';
        }
        
        throw new Error(message);
    }
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Callback function to execute when auth state changes
 * @returns {Function} Unsubscribe function
 */
function onAuthStateChanged(callback) {
    if (!firebase.auth) {
        console.error('Firebase Auth not initialized');
        return () => {};
    }
    
    return firebase.auth().onAuthStateChanged(callback);
}
