/**
 * search.js - Search functionality module
 * Handles student search in the main page
 */

let searchTimeout;

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchInput = document.getElementById('student-search');
    const searchResults = document.getElementById('search-results');
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch(searchInput.value);
        }, 300);
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
    
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim() !== '') {
            handleSearch(searchInput.value);
        }
    });
}

/**
 * Handle search input
 */
function handleSearch(query) {
    const searchResults = document.getElementById('search-results');
    
    if (query.trim() === '') {
        searchResults.style.display = 'none';
        return;
    }
    
    const results = searchStudents(query);
    displaySearchResults(results);
}

/**
 * Display search results
 */
function displaySearchResults(results) {
    const searchResults = document.getElementById('search-results');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No students found</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    searchResults.innerHTML = results.map(student => {
        const fullName = getStudentFullName(student);
        const balance = student.concessionBalance || 0;
        const balanceText = balance > 0 ? 
            `<div class="search-result-balance">${balance} ${balance === 1 ? 'concession' : 'concessions'} remaining</div>` : '';
        
        return `<div class="search-result-item" onclick="selectStudentFromSearch('${student.id}')">
            <div class="search-result-name">${escapeHtml(fullName)}</div>
            <div class="search-result-email">${escapeHtml(student.email || '')}</div>
            ${balanceText}
        </div>`;
    }).join('');
    
    searchResults.style.display = 'block';
}

/**
 * Select student from search results
 */
function selectStudentFromSearch(studentId) {
    const searchResults = document.getElementById('search-results');
    const searchInput = document.getElementById('student-search');
    
    searchResults.style.display = 'none';
    searchInput.value = '';
    
    // Open check-in modal with selected student
    openCheckinModal(studentId);
}
