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
            <button class="btn-icon" onclick="editNotes('${student.id}')" title="Edit Notes">
                <i class="fas fa-sticky-note"></i>
            </button>
            <button class="btn-icon" onclick="editStudent('${student.id}')" title="Edit Student">
                <i class="fas fa-edit"></i>
            </button>
        </td>
    `;

    return row;
}

// ========================================
// Student Actions
// ========================================

function viewStudent(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;

    openStudentModal(student, 'view');
}

function editNotes(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;

    openStudentModal(student, 'notes');
}

function editStudent(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;

    openStudentModal(student, 'edit');
}

function openStudentModal(student, mode) {
    const modal = document.getElementById('student-modal');
    const modalTitle = document.getElementById('modal-title');
    const saveBtn = document.getElementById('save-student-btn');
    const form = document.getElementById('student-form');
    
    // Populate form fields
    document.getElementById('modal-student-id').value = student.id;
    document.getElementById('modal-firstName').value = student.firstName || '';
    document.getElementById('modal-lastName').value = student.lastName || '';
    document.getElementById('modal-email').value = student.email || '';
    document.getElementById('modal-phoneNumber').value = student.phoneNumber || '';
    document.getElementById('modal-pronouns').value = student.pronouns || '';
    document.getElementById('modal-emailConsent').checked = student.emailConsent || false;
    document.getElementById('modal-over16Confirmed').checked = student.over16Confirmed || false;
    document.getElementById('modal-adminNotes').value = student.adminNotes || '';
    
    // Populate timestamps
    document.getElementById('modal-registeredAt').textContent = formatTimestamp(student.registeredAt);
    document.getElementById('modal-createdAt').textContent = formatTimestamp(student.createdAt);
    document.getElementById('modal-updatedAt').textContent = formatTimestamp(student.updatedAt);
    
    // Configure modal based on mode
    const allInputs = form.querySelectorAll('input:not([type="hidden"]), textarea');
    const notesField = document.getElementById('modal-adminNotes');
    
    if (mode === 'view') {
        modalTitle.textContent = 'Student Details';
        allInputs.forEach(input => {
            input.readOnly = true;
            input.disabled = input.type === 'checkbox';
        });
        saveBtn.style.display = 'none';
    } else if (mode === 'notes') {
        modalTitle.textContent = 'Edit Notes - ' + student.firstName + ' ' + student.lastName;
        allInputs.forEach(input => {
            if (input !== notesField) {
                input.readOnly = true;
                input.disabled = input.type === 'checkbox';
            }
        });
        notesField.readOnly = false;
        notesField.disabled = false;
        notesField.focus();
        saveBtn.style.display = 'inline-flex';
    } else if (mode === 'edit') {
        modalTitle.textContent = 'Edit Student - ' + student.firstName + ' ' + student.lastName;
        allInputs.forEach(input => {
            input.readOnly = false;
            input.disabled = false;
        });
        saveBtn.style.display = 'inline-flex';
    }
    
    modal.style.display = 'flex';
    
    // Store current mode for save handler
    form.dataset.mode = mode;
}

function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    modal.style.display = 'none';
}

async function saveStudentChanges(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('modal-student-id').value;
    const mode = document.getElementById('student-form').dataset.mode;
    
    try {
        const updateData = {};
        
        if (mode === 'notes') {
            // Only update admin notes
            updateData.adminNotes = document.getElementById('modal-adminNotes').value;
        } else if (mode === 'edit') {
            // Update all fields
            updateData.firstName = document.getElementById('modal-firstName').value;
            updateData.lastName = document.getElementById('modal-lastName').value;
            updateData.email = document.getElementById('modal-email').value;
            updateData.phoneNumber = document.getElementById('modal-phoneNumber').value;
            updateData.pronouns = document.getElementById('modal-pronouns').value;
            updateData.emailConsent = document.getElementById('modal-emailConsent').checked;
            updateData.over16Confirmed = document.getElementById('modal-over16Confirmed').checked;
            updateData.adminNotes = document.getElementById('modal-adminNotes').value;
        }
        
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('students').doc(studentId).update(updateData);
        
        // Reload students
        await loadStudents();
        closeStudentModal();
        
        // Show success message (optional)
        console.log('Student updated successfully');
    } catch (error) {
        console.error('Error updating student:', error);
        alert('Error updating student. Please try again.');
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('student-modal');
    if (modal && e.target === modal) {
        closeStudentModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('student-modal');
        if (modal && modal.style.display === 'flex') {
            closeStudentModal();
        }
    }
});

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

function formatTimestamp(timestamp) {
    if (!timestamp) return '—';
    
    let date;
    if (timestamp.toDate) {
        // Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else {
        return '—';
    }
    
    // Format: "15 Oct 2025, 2:30pm"
    const options = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleDateString('en-NZ', options).replace(',', '');
}
