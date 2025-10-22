/**
 * Data Module
 * Handles Firestore data operations
 */

let studentsData = [];

/**
 * Load students from Firestore
 */
function loadStudentsV2() {
    showLoading(true);
    
    // Fetch all students from Firestore (no orderBy to avoid index requirements)
    return db.collection('students')
        .get()
        .then((studentsSnapshot) => {
            studentsData = [];
            studentsSnapshot.forEach((doc) => {
                studentsData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by firstName then lastName in JavaScript
            studentsData.sort((a, b) => {
                const firstNameA = (a.firstName || '').toLowerCase();
                const firstNameB = (b.firstName || '').toLowerCase();
                const lastNameA = (a.lastName || '').toLowerCase();
                const lastNameB = (b.lastName || '').toLowerCase();
                
                // First compare by firstName
                if (firstNameA < firstNameB) return -1;
                if (firstNameA > firstNameB) return 1;
                
                // If firstName is the same, compare by lastName
                if (lastNameA < lastNameB) return -1;
                if (lastNameA > lastNameB) return 1;
                
                return 0;
            });

            displayStudents();
            initializeSortListeners();
            showLoading(false);

            // Show main container
            document.getElementById('main-container').style.display = 'flex';
        })
        .catch((error) => {
            console.error('Error loading students:', error);
            showError('Failed to load students. Please try refreshing the page.');
            showLoading(false);
        });
}

// Alias for backwards compatibility
const loadStudents = loadStudentsV2;

/**
 * Get all students data
 */
function getStudentsData() {
    return studentsData;
}

/**
 * Find student by ID
 */
function findStudentById(studentId) {
    return studentsData.find(s => s.id === studentId);
}

/**
 * Update student in Firestore
 */
async function updateStudent(studentId, updateData) {
    try {
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('students').doc(studentId).update(updateData);
        
        // Reload students
        await loadStudents();
        return true;
    } catch (error) {
        console.error('Error updating student:', error);
        throw error;
    }
}
