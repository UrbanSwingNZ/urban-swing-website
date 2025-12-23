/**
 * student-search.js - Student search and selection functionality
 * Handles searching for students, displaying results, and managing selection
 */

// Global state
let allStudents = [];
let selectedStudent = null;

/**
 * Load all students from Firestore
 */
export async function loadStudents() {
    try {
        showLoading(true);
        
        // Get all students first, then filter out deleted ones in JavaScript
        // This avoids needing a composite index for the where clause
        const snapshot = await db.collection('students').get();
        
        allStudents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        .filter(student => student.deleted !== true) // Filter out deleted students
        .sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        console.log('Loaded students:', allStudents.length);
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading students:', error);
        throw error;
    }
}

/**
 * Handle student search input
 */
export function handleStudentSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const resultsDiv = document.getElementById('student-results');
    const clearBtn = document.getElementById('clear-student-search');
    
    // Show/hide clear button
    if (clearBtn) {
        clearBtn.style.display = searchTerm.length > 0 ? 'flex' : 'none';
    }
    
    if (searchTerm.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    // Filter students
    const matches = allStudents.filter(student => {
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
        const email = (student.email || '').toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
    }).slice(0, 10); // Limit to 10 results
    
    // Display results
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results"><i class="fas fa-search"></i> No students found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    resultsDiv.innerHTML = matches.map(student => {
        const fullName = getStudentFullName(student);
        const balance = student.concessionBalance || 0;
        return `
            <div class="search-result-item" onclick="selectStudent('${student.id}')">
                <h4>${escapeHtml(fullName)} <span class="balance-badge">${balance} classes</span></h4>
                <p>${escapeHtml(student.email || 'No email')}</p>
            </div>
        `;
    }).join('');
    
    resultsDiv.style.display = 'block';
}

/**
 * Select a student from search results
 */
export function selectStudent(studentId) {
    selectedStudent = allStudents.find(s => s.id === studentId);
    if (!selectedStudent) return;
    
    // Update UI
    const fullName = getStudentFullName(selectedStudent);
    document.getElementById('selected-student-name').textContent = fullName;
    document.getElementById('selected-student-email').textContent = selectedStudent.email || 'No email';
    document.getElementById('selected-student-balance').textContent = selectedStudent.concessionBalance || 0;
    
    // Show selected card, hide search results
    document.getElementById('selected-student-card').style.display = 'flex';
    document.getElementById('student-results').style.display = 'none';
    document.getElementById('student-search').value = fullName;
    
    // Update summary (from gift-form module)
    if (window.updateSummary) {
        window.updateSummary();
    }
}

/**
 * Clear selected student
 */
export function clearSelectedStudent() {
    selectedStudent = null;
    document.getElementById('selected-student-card').style.display = 'none';
    document.getElementById('student-search').value = '';
    document.getElementById('clear-student-search').style.display = 'none';
    
    // Update summary (from gift-form module)
    if (window.updateSummary) {
        window.updateSummary();
    }
}

/**
 * Get currently selected student
 */
export function getSelectedStudent() {
    return selectedStudent;
}

/**
 * Get all loaded students
 */
export function getAllStudents() {
    return allStudents;
}

/**
 * Update student balance in cache after gift
 */
export function updateStudentInCache(studentId, newBalance) {
    const studentIndex = allStudents.findIndex(s => s.id === studentId);
    if (studentIndex !== -1) {
        allStudents[studentIndex].concessionBalance = newBalance;
    }
    
    // Update the selected student reference
    if (selectedStudent && selectedStudent.id === studentId) {
        selectedStudent.concessionBalance = newBalance;
    }
}

/**
 * Get student full name
 */
function getStudentFullName(student) {
    if (!student) return 'Unknown';
    const firstName = student.firstName || '';
    const lastName = student.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
}

/**
 * Show/hide loading spinner
 */
function showLoading(show = true) {
    if (show) {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.showGlobal('Loading students...');
        }
    } else {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.hideGlobal();
        }
    }
}

// Import centralized utilities
import { escapeHtml } from '/js/utils/index.js';
