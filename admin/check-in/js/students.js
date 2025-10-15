/**
 * students.js - Student data module
 * Manages student data retrieval and caching
 */

let studentsCache = [];

/**
 * Load all students
 */
async function loadStudents() {
    try {
        const snapshot = await db.collection('students')
            .orderBy('firstName', 'asc')
            .get();
        
        studentsCache = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        return studentsCache;
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students: ' + error.message);
        return [];
    }
}

/**
 * Get all students from cache
 */
function getStudents() {
    return studentsCache;
}

/**
 * Find student by ID
 */
function findStudentById(studentId) {
    return studentsCache.find(s => s.id === studentId);
}

/**
 * Search students by name
 */
function searchStudents(query) {
    if (!query || query.trim() === '') {
        return [];
    }
    
    const searchLower = query.toLowerCase().trim();
    
    return studentsCache.filter(student => {
        const firstName = (student.firstName || '').toLowerCase();
        const lastName = (student.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const email = (student.email || '').toLowerCase();
        
        return fullName.includes(searchLower) || 
               firstName.includes(searchLower) || 
               lastName.includes(searchLower) ||
               email.includes(searchLower);
    }).slice(0, 10); // Limit to 10 results
}

/**
 * Get student's full name
 */
function getStudentFullName(student) {
    if (!student) return '';
    const firstName = toTitleCase(student.firstName || '');
    const lastName = toTitleCase(student.lastName || '');
    return `${firstName} ${lastName}`.trim();
}
