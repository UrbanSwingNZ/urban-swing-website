/**
 * Student Loader
 * Loads all students and populates the dropdown for admin selection
 */

let allStudents = [];
let selectedStudent = null;

/**
 * Load all students from Firestore and populate dropdown
 */
async function loadStudents() {
    try {
        // Wait for authorization check
        if (!isAuthorized) {
            console.log('Not authorized to load students');
            return;
        }

        // Wait for Firebase to be initialized
        if (!window.db) {
            console.error('Firebase not initialized');
            setTimeout(loadStudents, 500);
            return;
        }

        console.log('Loading students...');

        // Fetch all students (no ordering in query to avoid index requirement)
        const studentsSnapshot = await window.db.collection('students').get();

        allStudents = [];
        studentsSnapshot.forEach(doc => {
            allStudents.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort in JavaScript instead of Firestore
        allStudents.sort((a, b) => {
            // Sort by firstName first
            const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '');
            if (firstNameCompare !== 0) return firstNameCompare;
            
            // If firstNames are equal, sort by lastName
            return (a.lastName || '').localeCompare(b.lastName || '');
        });

        console.log(`Loaded ${allStudents.length} students`);
        populateStudentDropdown();
    } catch (error) {
        console.error('Error loading students:', error);
        
        // Show error in dropdown
        const dropdown = document.getElementById('student-dropdown');
        dropdown.innerHTML = '<option value="">Error loading students</option>';
    }
}

/**
 * Populate the student dropdown with loaded students
 */
function populateStudentDropdown() {
    const dropdown = document.getElementById('student-dropdown');
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a student...';
    dropdown.appendChild(defaultOption);
    
    // Add student options
    allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.firstName} ${student.lastName} (${student.email})`;
        dropdown.appendChild(option);
    });
    
    // Add change event listener
    dropdown.addEventListener('change', handleStudentSelection);
}

/**
 * Handle student selection from dropdown
 */
function handleStudentSelection(event) {
    const studentId = event.target.value;
    
    if (!studentId) {
        // No student selected
        selectedStudent = null;
        showEmptyState();
        updateAdminBanner(null);
        return;
    }
    
    // Find selected student
    selectedStudent = allStudents.find(s => s.id === studentId);
    
    if (selectedStudent) {
        console.log('Selected student:', selectedStudent);
        updateAdminBanner(selectedStudent);
        loadStudentDashboard(selectedStudent);
    }
}

/**
 * Update the admin banner with selected student info
 * Note: We don't display the selected student name in the banner anymore
 * The dropdown selection makes it clear which student is being viewed
 */
function updateAdminBanner(student) {
    // No banner updates needed - the dropdown selection is sufficient
    console.log('Admin banner update:', student ? `${student.firstName} ${student.lastName}` : 'No student');
}

/**
 * Show empty state (no student selected)
 */
function showEmptyState() {
    document.getElementById('student-dashboard').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
}

/**
 * Show student dashboard
 */
function showDashboard() {
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('student-dashboard').style.display = 'block';
}

/**
 * Load the student's dashboard data
 */
async function loadStudentDashboard(student) {
    try {
        showDashboard();
        
        // Update dashboard name
        document.getElementById('dashboard-student-name').textContent = student.firstName;
        
        // Load dashboard data (will be implemented in dashboard-data.js)
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData(student);
        }
    } catch (error) {
        console.error('Error loading student dashboard:', error);
    }
}

// Initialize when authorized
document.addEventListener('DOMContentLoaded', () => {
    // Wait for authorization check to complete
    setTimeout(() => {
        if (isAuthorized) {
            loadStudents();
        }
    }, 1000);
});
