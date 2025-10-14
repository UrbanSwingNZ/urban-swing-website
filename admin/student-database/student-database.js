// Student Database Page Logic
// Handles fetching and displaying students from Firestore

let currentUser = null;
let studentsData = [];

// Wait for Firebase to initialize
window.addEventListener('load', () => {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        showError('Firebase SDK failed to load. Please check your internet connection.');
        return;
    }

    if (!auth || !db) {
        console.error('Firebase not properly initialized');
        showError('Firebase configuration error. Please contact the administrator.');
        return;
    }

    initializeAuth();
});

// ========================================
// Authentication Check
// ========================================

function initializeAuth() {
    showLoading(true);

    // Check if user is authenticated
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('user-email').textContent = user.email;
            loadStudents();
        } else {
            // User not authenticated, redirect to admin login
            window.location.href = '../index.html';
        }
    });
}

// ========================================
// Load Students from Firestore
// ========================================

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
        showLoading(false);

        // Show main container
        document.getElementById('main-container').style.display = 'flex';

    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students. Please try refreshing the page.');
        showLoading(false);
    }
}

// ========================================
// Display Students in Table
// ========================================

function displayStudents() {
    const tbody = document.getElementById('students-tbody');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('students-table');
    const studentCount = document.getElementById('student-count');

    // Update student count
    studentCount.textContent = studentsData.length;

    // Clear existing rows
    tbody.innerHTML = '';

    if (studentsData.length === 0) {
        // Show empty state
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    // Hide empty state, show table
    table.style.display = 'table';
    emptyState.style.display = 'none';

    // Create table rows
    studentsData.forEach((student) => {
        const row = createStudentRow(student);
        tbody.appendChild(row);
    });
}

// ========================================
// Create Student Row
// ========================================

function createStudentRow(student) {
    const row = document.createElement('tr');
    
    // Format name
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    
    // Format registration date
    let registeredDate = 'N/A';
    if (student.registeredAt) {
        const date = student.registeredAt.toDate ? student.registeredAt.toDate() : new Date(student.registeredAt);
        registeredDate = date.toLocaleDateString('en-NZ', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Email consent badge
    const emailConsentBadge = student.emailConsent 
        ? '<span class="badge badge-yes">Yes</span>' 
        : '<span class="badge badge-no">No</span>';

    row.innerHTML = `
        <td><strong>${escapeHtml(fullName)}</strong></td>
        <td>${escapeHtml(student.email || 'N/A')}</td>
        <td>${escapeHtml(student.phoneNumber || 'N/A')}</td>
        <td>${escapeHtml(student.pronouns || '-')}</td>
        <td>${emailConsentBadge}</td>
        <td>${registeredDate}</td>
        <td class="action-buttons">
            <button class="btn-icon" onclick="viewStudent('${student.id}')" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" onclick="editStudent('${student.id}')" title="Edit (Coming Soon)" disabled>
                <i class="fas fa-edit"></i>
            </button>
        </td>
    `;

    return row;
}

// ========================================
// Student Actions (Placeholders for Future)
// ========================================

function viewStudent(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;

    // TODO: Show student details in a modal
    alert(`Student Details:\n\nName: ${student.firstName} ${student.lastName}\nEmail: ${student.email}\nPhone: ${student.phoneNumber}\nPronouns: ${student.pronouns || 'Not specified'}\nEmail Consent: ${student.emailConsent ? 'Yes' : 'No'}\nOver 16: ${student.over16Confirmed ? 'Yes' : 'No'}\nAdmin Notes: ${student.adminNotes || 'None'}`);
}

function editStudent(studentId) {
    // TODO: Implement edit functionality
    alert('Edit functionality coming soon!');
}

// ========================================
// Navigation Handlers
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Register New Student button (in header)
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            window.location.href = '../../register.html';
        });
    }

    // Register New Student button (in empty state)
    const registerBtnEmpty = document.getElementById('register-btn-empty');
    if (registerBtnEmpty) {
        registerBtnEmpty.addEventListener('click', () => {
            window.location.href = '../../register.html';
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to logout. Please try again.');
            }
        });
    }
});

// ========================================
// Utility Functions
// ========================================

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    // Simple error display - could be enhanced with a modal
    alert('Error: ' + message);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
