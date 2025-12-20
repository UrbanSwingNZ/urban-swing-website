/**
 * Data Module
 * Handles Firestore data operations
 */

let studentsData = [];
let allStudentsData = []; // Store all students including deleted ones
let showDeletedStudents = false;
let studentsUnsubscribe = null; // Store unsubscribe function for snapshot listener

/**
 * Toggle showing deleted students
 */
function toggleShowDeleted(show) {
    showDeletedStudents = show;
    // Filter existing data instead of reloading
    filterAndDisplayStudents();
}

/**
 * Filter and display students based on current settings
 */
function filterAndDisplayStudents() {
    if (showDeletedStudents) {
        studentsData = [...allStudentsData];
    } else {
        studentsData = allStudentsData.filter(student => student.deleted !== true);
    }
    displayStudents();
}

/**
 * Get show deleted students state
 */
function getShowDeletedStudents() {
    return showDeletedStudents;
}

/**
 * Load students from Firestore with real-time updates
 */
function loadStudentsV2() {
    showLoading(true);
    
    // Unsubscribe from previous listener if it exists
    if (studentsUnsubscribe) {
        studentsUnsubscribe();
    }
    
    // Set up real-time listener
    studentsUnsubscribe = db.collection('students')
        .onSnapshot((studentsSnapshot) => {
            allStudentsData = [];
            studentsSnapshot.forEach((doc) => {
                const studentData = {
                    id: doc.id,
                    ...doc.data()
                };
                allStudentsData.push(studentData);
            });

            // Sort by firstName then lastName in JavaScript
            allStudentsData.sort((a, b) => {
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

            // Filter and display based on current settings
            filterAndDisplayStudents();
            
            // Only initialize sort listeners on first load
            if (!document.querySelector('.sortable[data-initialized]')) {
                initializeSortListeners();
                document.querySelectorAll('.sortable').forEach(el => {
                    el.setAttribute('data-initialized', 'true');
                });
            }
            
            showLoading(false);

            // Show main container
            document.getElementById('main-container').style.display = 'flex';
        }, (error) => {
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
        
        // No need to reload - onSnapshot will update automatically
        return true;
    } catch (error) {
        console.error('Error updating student:', error);
        throw error;
    }
}

/**
 * Clean up snapshot listener when page unloads
 */
window.addEventListener('beforeunload', () => {
    if (studentsUnsubscribe) {
        studentsUnsubscribe();
    }
});

/**
 * Get full name of student in title case
 * Domain-specific utility for student database
 */
function getStudentFullName(student) {
    if (!student) return '';
    const firstName = toTitleCase(student.firstName || '');
    const lastName = toTitleCase(student.lastName || '');
    return `${firstName} ${lastName}`.trim();
}

/**
 * Find student by ID in the loaded students data
 */
function findStudentById(studentId) {
    return allStudentsData.find(s => s.id === studentId);
}
