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
        // Wait for Firebase to be initialized
        if (!window.db) {
            setTimeout(loadStudents, 500);
            return;
        }

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
    
    if (!dropdown) {
        console.error('student-dropdown element not found');
        return;
    }
    
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
        option.textContent = `${student.firstName} ${student.lastName}`;
        dropdown.appendChild(option);
    });
    
    // Restore previously selected student from sessionStorage
    const currentStudentId = sessionStorage.getItem('currentStudentId');
    if (currentStudentId) {
        dropdown.value = currentStudentId;
        // Load that student's data
        selectedStudent = allStudents.find(s => s.id === currentStudentId);
        if (selectedStudent) {
            loadStudentDashboard(selectedStudent);
        }
    }
    
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
        sessionStorage.removeItem('currentStudentId');
        showEmptyState();
        updateAdminBanner(null);
        return;
    }
    
    // Find selected student
    selectedStudent = allStudents.find(s => s.id === studentId);
    
    if (selectedStudent) {
        // Store selected student ID in sessionStorage to persist across pages
        sessionStorage.setItem('currentStudentId', studentId);
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
}

/**
 * Show empty state (no student selected)
 */
function showEmptyState() {
    const studentDashboard = document.getElementById('student-dashboard');
    const transactionsContent = document.getElementById('transactions-content');
    const checkinsContent = document.getElementById('checkins-content');
    const concessionsContent = document.getElementById('concessions-content');
    const profileContent = document.getElementById('profile-content');
    const purchaseContent = document.getElementById('purchase-content');
    const prepayContent = document.getElementById('prepay-content');
    
    if (studentDashboard) studentDashboard.style.display = 'none';
    if (transactionsContent) transactionsContent.style.display = 'none';
    if (checkinsContent) checkinsContent.style.display = 'none';
    if (concessionsContent) concessionsContent.style.display = 'none';
    if (profileContent) profileContent.style.display = 'none';
    if (purchaseContent) purchaseContent.style.display = 'none';
    if (prepayContent) prepayContent.style.display = 'none';
    
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'block';
}

/**
 * Show student dashboard or content
 */
function showDashboard() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'none';
    
    const studentDashboard = document.getElementById('student-dashboard');
    const transactionsContent = document.getElementById('transactions-content');
    const checkinsContent = document.getElementById('checkins-content');
    const concessionsContent = document.getElementById('concessions-content');
    const profileContent = document.getElementById('profile-content');
    const purchaseContent = document.getElementById('purchase-content');
    const prepayContent = document.getElementById('prepay-content');
    
    if (studentDashboard) studentDashboard.style.display = 'block';
    if (transactionsContent) transactionsContent.style.display = 'block';
    if (checkinsContent) checkinsContent.style.display = 'block';
    if (concessionsContent) concessionsContent.style.display = 'block';
    if (profileContent) profileContent.style.display = 'block';
    if (purchaseContent) purchaseContent.style.display = 'block';
    if (prepayContent) prepayContent.style.display = 'block';
}

/**
 * Load the student's dashboard data
 */
async function loadStudentDashboard(student) {
    try {
        showDashboard();
        
        // Update dashboard name (only if element exists)
        const dashboardNameElement = document.getElementById('dashboard-student-name');
        if (dashboardNameElement) {
            dashboardNameElement.textContent = student.firstName;
        }
        
        // Load dashboard data (will be implemented in dashboard-data.js)
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData(student);
        }
        
        // Trigger custom event for other pages that need to know when student is loaded
        window.dispatchEvent(new CustomEvent('studentSelected', { detail: student }));
    } catch (error) {
        console.error('Error loading student dashboard:', error);
    }
}

// Initialize when authorized
document.addEventListener('DOMContentLoaded', () => {
    // Wait for authorization check to complete
    const checkAuth = setInterval(() => {
        if (typeof isAuthorized !== 'undefined') {
            clearInterval(checkAuth);
            
            if (isAuthorized) {
                loadStudents();
            }
        }
    }, 100); // Check every 100ms
    
    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkAuth);
    }, 10000);
});
