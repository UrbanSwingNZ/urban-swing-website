/**
 * student-filter.js
 * Handles student search/filter functionality for transactions
 */

let allStudents = [];
let selectedStudentId = null;

/**
 * Initialize student filter
 */
async function initializeStudentFilter() {
    // Load students from Firestore
    await loadStudentsForFilter();
    
    // Setup event listeners
    const studentInput = document.getElementById('student-filter');
    const clearBtn = document.getElementById('clear-student-filter');
    
    if (studentInput) {
        studentInput.addEventListener('input', handleStudentInput);
        studentInput.addEventListener('focus', handleStudentInput);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.student-filter-wrapper')) {
                hideStudentDropdown();
            }
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearStudentFilter);
    }
}

/**
 * Load students from Firestore
 */
async function loadStudentsForFilter() {
    try {
        const snapshot = await firebase.firestore()
            .collection('students')
            .orderBy('firstName')
            .get();
        
        allStudents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`Loaded ${allStudents.length} students for filter`);
    } catch (error) {
        console.error('Error loading students:', error);
        allStudents = [];
    }
}

/**
 * Handle student input
 */
function handleStudentInput(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const dropdown = document.getElementById('student-filter-results');
    
    if (searchTerm === '') {
        hideStudentDropdown();
        return;
    }
    
    // Filter students
    const matches = allStudents.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        const email = (student.email || '').toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
    
    // Display results
    if (matches.length > 0) {
        displayStudentDropdown(matches);
    } else {
        dropdown.innerHTML = '<div class="student-filter-item" style="cursor: default; color: var(--text-muted);">No students found</div>';
        dropdown.style.display = 'block';
    }
}

/**
 * Display student dropdown
 */
function displayStudentDropdown(students) {
    const dropdown = document.getElementById('student-filter-results');
    
    dropdown.innerHTML = students.map(student => `
        <div class="student-filter-item" data-student-id="${student.id}">
            <strong>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</strong>
            ${student.email ? `<small>${escapeHtml(student.email)}</small>` : ''}
        </div>
    `).join('');
    
    // Add click handlers
    dropdown.querySelectorAll('.student-filter-item').forEach(item => {
        item.addEventListener('click', () => selectStudent(item.dataset.studentId));
    });
    
    dropdown.style.display = 'block';
}

/**
 * Hide student dropdown
 */
function hideStudentDropdown() {
    const dropdown = document.getElementById('student-filter-results');
    dropdown.style.display = 'none';
}

/**
 * Select a student
 */
function selectStudent(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    selectedStudentId = studentId;
    
    const input = document.getElementById('student-filter');
    const clearBtn = document.getElementById('clear-student-filter');
    
    input.value = `${student.firstName} ${student.lastName}`;
    clearBtn.style.display = 'block';
    
    hideStudentDropdown();
    
    // Trigger filter
    if (typeof applyFilters === 'function') {
        applyFilters();
    }
}

/**
 * Clear student filter
 */
function clearStudentFilter() {
    selectedStudentId = null;
    
    const input = document.getElementById('student-filter');
    const clearBtn = document.getElementById('clear-student-filter');
    
    input.value = '';
    clearBtn.style.display = 'none';
    
    hideStudentDropdown();
    
    // Trigger filter
    if (typeof applyFilters === 'function') {
        applyFilters();
    }
}

/**
 * Get selected student ID
 */
function getSelectedStudentId() {
    return selectedStudentId;
}
