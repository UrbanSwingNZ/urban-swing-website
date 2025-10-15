/**
 * Data Module
 * Handles Firestore data operations
 */

let studentsData = [];

/**
 * Load students from Firestore
 */
async function loadStudents() {
    try {
        showLoading(true);

        // Fetch all students from Firestore, ordered by registration date (newest first)
        const studentsSnapshot = await db.collection('students')
            .orderBy('registeredAt', 'desc')
            .get();

        studentsData = [];
        studentsSnapshot.forEach((doc) => {
            studentsData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Loaded ${studentsData.length} students`);
        displayStudents();
        initializeSortListeners();
        showLoading(false);

        // Show main container
        document.getElementById('main-container').style.display = 'flex';

    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students. Please try refreshing the page.');
        showLoading(false);
    }
}

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
