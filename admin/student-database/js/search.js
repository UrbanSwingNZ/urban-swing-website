/**
 * search.js - Search and filter functionality
 */

let searchTerm = '';

/**
 * Get current search term
 */
function getSearchTerm() {
    return searchTerm;
}

/**
 * Filter students based on search term
 */
function filterStudents(students, term) {
    if (!term || term.trim() === '') {
        return students;
    }

    const searchLower = term.toLowerCase().trim();

    return students.filter(student => {
        // Search across multiple fields
        const searchableText = [
            student.firstName || '',
            student.lastName || '',
            student.email || '',
            student.phoneNumber || '',
            student.pronouns || ''
        ].join(' ').toLowerCase();

        return searchableText.includes(searchLower);
    });
}

/**
 * Update search results info display
 */
function updateSearchResultsInfo(filteredCount, totalCount) {
    const infoElement = document.getElementById('search-results-info');
    
    if (searchTerm && searchTerm.trim() !== '') {
        infoElement.textContent = `Showing ${filteredCount} of ${totalCount} students`;
        infoElement.style.display = 'block';
    } else {
        infoElement.style.display = 'none';
    }
}

/**
 * Handle search input
 */
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');
    
    searchTerm = searchInput.value;
    
    // Show/hide clear button
    if (searchTerm.trim() !== '') {
        clearButton.style.display = 'flex';
    } else {
        clearButton.style.display = 'none';
    }
    
    // Reset to first page when searching
    setCurrentPage(1);
    
    // Refresh display
    displayStudents();
}

/**
 * Clear search
 */
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');
    
    searchInput.value = '';
    searchTerm = '';
    clearButton.style.display = 'none';
    
    // Reset to first page
    setCurrentPage(1);
    
    // Refresh display
    displayStudents();
    
    // Focus back on search input
    searchInput.focus();
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');
    
    // Search as user types (with debounce)
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(handleSearch, 300);
    });
    
    // Clear button
    clearButton.addEventListener('click', clearSearch);
    
    // Enter key to search immediately
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            handleSearch();
        }
    });
}
