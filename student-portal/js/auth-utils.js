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
 * Get the current logged-in student's ID
 * @returns {Promise<string|null>} - Student ID or null if not found
 */
async function getCurrentStudentId() {
    try {
        // Wait for Firebase Auth to be ready
        const user = await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
        
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
        const user = firebase.auth().currentUser;
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
