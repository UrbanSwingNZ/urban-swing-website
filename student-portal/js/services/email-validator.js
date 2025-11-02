/**
 * email-validator.js - Email Validation Service
 * Handles checking if email addresses exist in the database
 */

/**
 * Check if an email address already exists in the students collection
 * @param {string} email - The email address to check
 * @returns {Promise<Object>} Object with exists flag and matching students array
 */
async function checkEmailExists(email) {
    try {
        // Ensure db is initialized
        if (!window.db) {
            throw new Error('Database not initialized');
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        
        const snapshot = await window.db.collection('students')
            .where('email', '==', normalizedEmail)
            .limit(10)
            .get();
        
        if (snapshot.empty) {
            return {
                exists: false,
                students: []
            };
        }
        
        const students = snapshot.docs.map(doc => ({
            id: doc.id,
            firstName: doc.data().firstName || '',
            lastName: doc.data().lastName || '',
            email: doc.data().email || '',
            phoneNumber: doc.data().phoneNumber || ''
        }));
        
        return {
            exists: true,
            students: students
        };
    } catch (error) {
        console.error('Error checking email:', error);
        throw new Error('Failed to check email address');
    }
}
