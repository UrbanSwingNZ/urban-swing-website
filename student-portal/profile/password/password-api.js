/**
 * Password API Module
 * Handles Firebase authentication: re-authentication and password updates
 */

/**
 * Re-authenticate user with current password
 * Required before changing password for security
 * @param {string} currentPassword - User's current password
 * @returns {Promise<boolean>} - True if re-authentication successful
 * @throws {Error} - Descriptive error message for UI display
 */
export async function reauthenticateUser(currentPassword) {
    try {
        const user = firebase.auth().currentUser;
        if (!user || !user.email) {
            throw new Error('No user logged in');
        }

        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );

        await user.reauthenticateWithCredential(credential);
        return true;
    } catch (error) {
        console.error('Re-authentication error:', error);
        
        // Provide user-friendly error messages
        if (error.code === 'auth/wrong-password') {
            throw new Error('Incorrect password.');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Too many failed attempts. Please try again later.');
        } else if (error.code === 'auth/network-request-failed') {
            throw new Error('Network error. Please check your connection.');
        } else {
            throw new Error('Incorrect password.');
        }
    }
}

/**
 * Change user's password
 * @param {string} currentPassword - Current password for re-authentication
 * @param {string} newPassword - New password to set
 * @returns {Promise<boolean>} - True if password changed successfully
 * @throws {Error} - Error from re-authentication or password update
 */
export async function changePassword(currentPassword, newPassword) {
    try {
        // Step 1: Re-authenticate with current password
        await reauthenticateUser(currentPassword);
        
        // Step 2: Update to new password
        const user = firebase.auth().currentUser;
        await user.updatePassword(newPassword);
        
        return true;
    } catch (error) {
        console.error('Change password error:', error);
        throw error;
    }
}

/**
 * Get current user's email
 * @returns {string|null} - User's email or null if not logged in
 */
export function getCurrentUserEmail() {
    const user = firebase.auth().currentUser;
    return user?.email || null;
}
