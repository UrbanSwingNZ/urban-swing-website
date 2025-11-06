/**
 * student-service.js - Student and User Database Service
 * Handles creating and updating student and user documents in Firestore
 */

/**
 * Generate human-readable student/user ID
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Generated ID in format: firstname-lastname-abc123
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
 * Create a new student document (for brand new students)
 * @param {Object} formData - Student form data
 * @returns {Promise<string>} The generated student ID
 */
async function createStudent(formData) {
    try {
        if (!window.db) {
            throw new Error('Database not initialized');
        }
        
        // Generate student ID
        const studentId = generateStudentId(formData.firstName, formData.lastName);
        
        // Prepare student data
        const studentData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email.toLowerCase().trim(),
            phoneNumber: formData.phoneNumber,
            pronouns: formData.pronouns || '',
            over16Confirmed: formData.over16Confirmed,
            termsAccepted: formData.termsAccepted,
            emailConsent: formData.emailConsent,
            registeredAt: new Date().toISOString(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to students collection
        await window.db.collection('students').doc(studentId).set(studentData);
        
        console.log('Student document created:', studentId);
        return studentId;
        
    } catch (error) {
        console.error('Error creating student:', error);
        throw new Error('Failed to create student record. Please try again.');
    }
}

/**
 * Update an existing student document (for existing-incomplete students)
 * Only updates the termsAccepted field and updatedAt timestamp
 * @param {string} studentId - The student document ID
 * @returns {Promise<void>}
 */
async function updateStudentTerms(studentId) {
    try {
        if (!window.db) {
            throw new Error('Database not initialized');
        }
        
        // Update only termsAccepted and updatedAt, preserve all other fields
        await window.db.collection('students').doc(studentId).update({
            termsAccepted: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Student terms accepted:', studentId);
        
    } catch (error) {
        console.error('Error updating student terms:', error);
        throw new Error('Failed to update student record. Please try again.');
    }
}

/**
 * Create a user document linked to a student
 * @param {Object} userData - User data including authUid, email, firstName, lastName
 * @param {string} studentId - The student document ID to link to
 * @returns {Promise<void>}
 */
async function createUser(userData, studentId) {
    try {
        if (!window.db) {
            throw new Error('Database not initialized');
        }
        
        // Use the same ID as the student document
        // Use authUid as document ID (not studentId)
        const userId = userData.authUid;
        
        if (!userId) {
            throw new Error('Auth UID is required to create user document');
        }
        
        // Prepare user data
        const userDoc = {
            email: userData.email.toLowerCase().trim(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            studentId: studentId,
            role: 'student', // Set role for access control
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to users collection with authUid as document ID
        await window.db.collection('users').doc(userId).set(userDoc);
        
        console.log('User document created:', userId, 'linked to student:', studentId);
        
    } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Failed to create user account. Please try again.');
    }
}

/**
 * Get student data by ID
 * @param {string} studentId - The student document ID
 * @returns {Promise<Object>} Student data
 */
async function getStudentById(studentId) {
    try {
        if (!window.db) {
            throw new Error('Database not initialized');
        }
        
        const doc = await window.db.collection('students').doc(studentId).get();
        
        if (!doc.exists) {
            throw new Error('Student not found');
        }
        
        return {
            id: doc.id,
            ...doc.data()
        };
        
    } catch (error) {
        console.error('Error getting student:', error);
        throw new Error('Failed to retrieve student data.');
    }
}

/**
 * Get user data by student ID
 * @param {string} studentId - The student document ID
 * @returns {Promise<Object|null>} User data or null if not found
 */
async function getUserByStudentId(studentId) {
    try {
        if (!window.db) {
            throw new Error('Database not initialized');
        }
        
        // Query users collection by studentId field (document ID is authUid)
        const snapshot = await window.db.collection('users')
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            return null;
        }
        
        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
        
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}
