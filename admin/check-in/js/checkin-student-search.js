/**
 * checkin-student-search.js - Student search and selection in check-in modal
 */

/**
 * Initialize modal search
 */
function initializeModalSearch() {
    const modalSearchInput = document.getElementById('modal-student-search');
    const modalSearchResults = document.getElementById('modal-search-results');
    const clearBtn = document.getElementById('clear-modal-search');
    
    let timeout;
    
    // Show all students when focused with empty input
    modalSearchInput.addEventListener('focus', () => {
        if (modalSearchInput.value.trim() === '') {
            const allStudents = getStudents();
            displayModalSearchResults(allStudents);
        }
    });
    
    modalSearchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        
        // Show/hide clear button
        clearBtn.style.display = modalSearchInput.value ? 'block' : 'none';
        
        timeout = setTimeout(() => {
            const query = modalSearchInput.value;
            if (query.trim() === '') {
                modalSearchResults.style.display = 'none';
                return;
            }
            
            const results = searchStudents(query);
            displayModalSearchResults(results);
        }, 300);
    });
    
    // Clear button functionality
    clearBtn.addEventListener('click', () => {
        modalSearchInput.value = '';
        clearBtn.style.display = 'none';
        modalSearchResults.style.display = 'none';
        modalSearchInput.focus();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper') && !e.target.closest('#student-selection')) {
            modalSearchResults.style.display = 'none';
        }
    });
}

/**
 * Display search results in modal
 */
function displayModalSearchResults(results) {
    const modalSearchResults = document.getElementById('modal-search-results');
    
    if (results.length === 0) {
        modalSearchResults.innerHTML = '<div class="search-result-item no-results">No students found</div>';
        modalSearchResults.style.display = 'block';
        return;
    }
    
    modalSearchResults.innerHTML = results.map(student => {
        const fullName = getStudentFullName(student);
        return `<div class="search-result-item" onclick="selectStudentInModal('${student.id}')">
            <div class="search-result-name">${escapeHtml(fullName)}</div>
            <div class="search-result-email">${escapeHtml(student.email || '')}</div>
        </div>`;
    }).join('');
    
    modalSearchResults.style.display = 'block';
}

/**
 * Select student in modal
 */
function selectStudentInModal(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    setSelectedStudent(student);
    document.getElementById('student-selection').style.display = 'none';
    document.getElementById('modal-search-results').style.display = 'none';
    showSelectedStudent(student);
    
    // Check if student has any available online payments (hide/show radio button)
    if (typeof checkStudentHasOnlinePayments === 'function') {
        checkStudentHasOnlinePayments(student.id);
    }
    
    // Check if student has a matching online payment for the current check-in date
    const checkinDate = getSelectedCheckinDate();
    if (checkinDate && typeof checkAndAutoSelectOnlinePayment === 'function') {
        checkAndAutoSelectOnlinePayment(student.id, checkinDate);
    }
}
