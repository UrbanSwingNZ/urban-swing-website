// Transaction History Page - Main Controller

// Page Initialization
window.addEventListener('authCheckComplete', async (event) => {
    // Show main container
    document.getElementById('main-container').style.display = 'block';
    
    if (event.detail.isAuthorized) {
        // Admin viewing student portal
        // Check if we have a selected student in sessionStorage (from navigation)
        const currentStudentId = sessionStorage.getItem('currentStudentId');
        if (currentStudentId) {
            // Student already selected - hide empty state
            document.getElementById('empty-state').style.display = 'none';
            // Data will be loaded by studentSelected event
        } else {
            // No student selected - show empty state
            document.getElementById('empty-state').style.display = 'flex';
        }
    } else {
        // Regular student - data will be loaded by studentLoaded event
        // Do nothing here, wait for the event
    }
});

// Listen for student selection (admin) or student loaded (regular student)
window.addEventListener('studentSelected', async (event) => {
    const student = event.detail.student;
    if (student) {
        await loadStudentTransactions(student.id);
    }
});

window.addEventListener('studentLoaded', async (event) => {
    await loadStudentTransactions(event.detail.id);
});

// Check if a student is already selected on page load
window.addEventListener('DOMContentLoaded', () => {
    const currentStudentId = sessionStorage.getItem('currentStudentId');
    if (currentStudentId) {
        loadStudentTransactions(currentStudentId);
    }
});

/**
 * Load transactions for a specific student
 */
async function loadStudentTransactions(studentId) {
    try {
        if (!studentId) {
            console.log('No student selected yet');
            return;
        }
        
        showLoading(true);
        
        // First, get student info for header
        const studentDoc = await window.db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
            console.error('Student not found');
            return;
        }
        
        const studentData = studentDoc.data();
        const studentName = `${studentData.firstName} ${studentData.lastName}`;
        
        // Update header with student name
        document.getElementById('student-name').textContent = `${studentName}'s Transaction History`;
        
        // Load transactions using service
        await window.TransactionService.loadTransactions(studentId);
        
        // Reset pagination and display
        window.PaginationController.reset();
        window.PaginationController.displayPage();
        
        // Show content
        document.getElementById('transactions-content').style.display = 'block';
        document.getElementById('empty-state').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        alert('Error loading transactions. Please try again.');
    } finally {
        showLoading(false);
    }
}

/**
 * Utility: Show/hide loading spinner
 */

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Legacy function for student selection changes (from student-loader.js)
 */
window.loadStudentDashboard = async function(student) {
    console.log('Student selection changed:', student);
    if (student && student.id) {
        await loadStudentTransactions(student.id);
    }
};
