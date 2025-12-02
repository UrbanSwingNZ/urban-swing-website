/**
 * email-validator.js - Email Validation Service
 * Handles checking if email addresses exist in the database
 */

/**
 * Check if an email address exists in students and/or users collections
 * @param {string} email - The email address to check
 * @returns {Promise<Object>} Object with status and student data if applicable
 * 
 * Return object structure:
 * {
 *   status: 'new' | 'existing-complete' | 'existing-incomplete',
 *   hasStudent: boolean,
 *   hasUser: boolean,
 *   studentData: Object | null - Full student data if exists
 * }
 */
async function checkEmailExists(email) {
    try {
        // Ensure db is initialized
        if (!window.db) {
            throw new Error('Database not initialized');
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        
        // Query both collections in parallel
        const [studentSnapshot, userSnapshot] = await Promise.all([
            window.db.collection('students')
                .where('email', '==', normalizedEmail)
                .limit(1)
                .get(),
            window.db.collection('users')
                .where('email', '==', normalizedEmail)
                .limit(1)
                .get()
        ]);
        
        const hasStudent = !studentSnapshot.empty;
        const hasUser = !userSnapshot.empty;
        
        console.log(`Email check for ${normalizedEmail}:`);
        console.log(`  - Student docs found: ${studentSnapshot.size}`);
        console.log(`  - User docs found: ${userSnapshot.size}`);
        
        // Extract student data if exists
        let studentData = null;
        if (hasStudent) {
            const doc = studentSnapshot.docs[0];
            studentData = {
                id: doc.id,
                ...doc.data()
            };
        }
        
        // Determine status
        let status;
        if (!hasStudent && !hasUser) {
            status = 'new';
            console.log(`  - Status: NEW (no student, no user)`);
        } else if (hasStudent && hasUser) {
            status = 'existing-complete';
            console.log(`  - Status: EXISTING-COMPLETE (has both student and user)`);
        } else if (hasStudent && !hasUser) {
            status = 'existing-incomplete';
            console.log(`  - Status: EXISTING-INCOMPLETE (has student, no user)`);
        } else {
            // Edge case: user exists but no student (shouldn't happen, but handle it)
            console.warn('User exists without student record for email:', normalizedEmail);
            status = 'existing-complete'; // Treat as complete to prevent registration
            console.log(`  - Status: EXISTING-COMPLETE (edge case - user without student)`);
        }
        
        return {
            status,
            hasStudent,
            hasUser,
            studentData
        };
        
    } catch (error) {
        console.error('Error checking email:', error);
        throw new Error('Failed to check email address');
    }
}
