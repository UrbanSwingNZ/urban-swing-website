/**
 * history-student-search.js - Student search functionality for history modal
 */

/**
 * Setup student search functionality
 */
function setupHistoryStudentSearch() {
    const studentSearch = document.getElementById('history-student-search');
    const searchResults = document.getElementById('history-search-results');
    const clearBtn = document.getElementById('clear-history-search');
    
    // Function to position the dropdown
    const positionDropdown = () => {
        const rect = studentSearch.getBoundingClientRect();
        searchResults.style.top = `${rect.bottom}px`;
        searchResults.style.left = `${rect.left}px`;
        searchResults.style.width = `${rect.width}px`;
    };
    
    studentSearch.addEventListener('focus', (e) => {
        // Show all students when focused with empty or default value
        if (e.target.value === '' || e.target.value === 'All Students') {
            displayHistoryStudentResults(getStudents(), positionDropdown);
        }
    });
    
    studentSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        // Show/hide clear button
        clearBtn.style.display = e.target.value ? 'block' : 'none';
        
        // If empty, show all students and clear filter
        if (query === '' || query === 'all students') {
            clearSelectedHistoryStudentId();
            searchResults.style.display = 'none';
            loadHistory();
            return;
        }
        
        // Filter students
        const students = getStudents();
        const filtered = students.filter(student => {
            const fullName = getStudentFullName(student).toLowerCase();
            const email = student.email ? student.email.toLowerCase() : '';
            return fullName.includes(query) || email.includes(query);
        });
        
        // Display results
        if (filtered.length > 0) {
            displayHistoryStudentResults(filtered, positionDropdown);
        } else {
            searchResults.innerHTML = '<div class="student-result" style="cursor: default;"><div class="student-name" style="color: var(--text-muted);">No students found</div></div>';
            positionDropdown();
            searchResults.style.display = 'block';
        }
    });
    
    // Clear button functionality
    clearBtn.addEventListener('click', () => {
        studentSearch.value = 'All Students';
        clearSelectedHistoryStudentId();
        clearBtn.style.display = 'none';
        searchResults.style.display = 'none';
        loadHistory();
        studentSearch.focus();
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.student-search-wrapper')) {
            searchResults.style.display = 'none';
        }
    });
}

/**
 * Display student search results
 */
function displayHistoryStudentResults(students, positionDropdown) {
    const searchResults = document.getElementById('history-search-results');
    const studentSearch = document.getElementById('history-student-search');
    const clearBtn = document.getElementById('clear-history-search');
    
    // Add "All Students" option at the top
    const allStudentsHtml = `
        <div class="student-result" data-student-id="">
            <div class="student-name" style="font-weight: 600; color: var(--purple-primary);">All Students</div>
            <div class="student-email">Show all check-ins</div>
        </div>
    `;
    
    const studentsHtml = students.map(student => `
        <div class="student-result" data-student-id="${student.id}">
            <div class="student-name">${getStudentFullName(student)}</div>
            <div class="student-email">${student.email || 'No email'}</div>
        </div>
    `).join('');
    
    searchResults.innerHTML = allStudentsHtml + studentsHtml;
    positionDropdown();
    searchResults.style.display = 'block';
    
    // Add click handlers
    searchResults.querySelectorAll('.student-result').forEach(result => {
        result.addEventListener('click', () => {
            const studentId = result.dataset.studentId;
            if (studentId === '') {
                setSelectedHistoryStudentId(null);
                studentSearch.value = 'All Students';
                clearBtn.style.display = 'block';
            } else {
                const student = students.find(s => s.id === studentId);
                setSelectedHistoryStudentId(studentId);
                studentSearch.value = getStudentFullName(student);
                clearBtn.style.display = 'block';
            }
            searchResults.style.display = 'none';
            loadHistory();
        });
    });
}
