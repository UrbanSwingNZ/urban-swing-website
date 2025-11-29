/**
 * Authentication Utility Functions
 * Handles Firebase auth and student identification
 */

/**
 * Wait for auth to be ready
 * Polls for the global isAuthorized variable
 * @returns {Promise<void>}
 */
function waitForAuth() {
    return new Promise((resolve) => {
        if (typeof isAuthorized !== 'undefined') {
            resolve();
        } else {
            const checkAuth = setInterval(() => {
                if (typeof isAuthorized !== 'undefined') {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        }
    });
}

/**
 * Get the current Firebase Auth user, waiting if necessary for auth to restore from persistence
 * @returns {Promise<firebase.User|null>} - Current user or null if not logged in
 */
async function getCurrentUser() {
    return new Promise((resolve) => {
        // First check if user is already available
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            resolve(currentUser);
            return;
        }
        
        // User not immediately available, wait for auth state to restore
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max
        
        const checkUser = () => {
            const user = firebase.auth().currentUser;
            if (user) {
                resolve(user);
            } else if (attempts >= maxAttempts) {
                resolve(null);
            } else {
                attempts++;
                setTimeout(checkUser, 100);
            }
        };
        
        checkUser();
    });
}

/**
 * Get the current logged-in student's ID
 * @returns {Promise<string|null>} - Student ID or null if not found
 */
async function getCurrentStudentId() {
    try {
        // Use the centralized getCurrentUser function
        const user = await getCurrentUser();
        
        if (!user) {
            console.error('No user logged in');
            return null;
        }
        
        const email = user.email.toLowerCase();
        
        // Find student by email
        const studentSnapshot = await window.db.collection('students')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (studentSnapshot.empty) {
            console.error('Student not found for email:', email);
            return null;
        }
        
        return studentSnapshot.docs[0].id;
        
    } catch (error) {
        console.error('Error getting current student ID:', error);
        return null;
    }
}

/**
 * Get student by ID from Firestore
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} - Student data with id, or null if not found
 */
async function getStudentById(studentId) {
    try {
        const studentDoc = await window.db.collection('students').doc(studentId).get();
        
        if (!studentDoc.exists) {
            console.error('Student not found');
            return null;
        }
        
        return {
            id: studentDoc.id,
            ...studentDoc.data()
        };
        
    } catch (error) {
        console.error('Error loading student:', error);
        return null;
    }
}

/**
 * Get current student data (for logged-in students)
 * @returns {Promise<Object|null>} - Student data with id, or null if not found
 */
async function getCurrentStudent() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('No user logged in');
            return null;
        }
        
        const email = user.email.toLowerCase();
        
        // Find student by email
        const studentSnapshot = await window.db.collection('students')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (studentSnapshot.empty) {
            console.error('Student not found for email:', email);
            return null;
        }
        
        const doc = studentSnapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
        
    } catch (error) {
        console.error('Error getting current student:', error);
        return null;
    }
}

/**
 * Determine which student to load based on context
 * @returns {Promise<string|null>} - Student ID or null
 */
async function getActiveStudentId() {
    // Check if this is an admin view
    if (typeof isAuthorized !== 'undefined' && isAuthorized) {
        // Admin view - check sessionStorage for selected student
        return sessionStorage.getItem('currentStudentId');
    } else {
        // Student view - get their own ID
        return await getCurrentStudentId();
    }
}

/**
 * Check if current context is admin view
 * @returns {boolean}
 */
function isAdminView() {
    return typeof isAuthorized !== 'undefined' && isAuthorized;
}
