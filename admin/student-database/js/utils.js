/**
 * Utility Functions
 * Common helper functions
 */

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    // Simple error display - could be enhanced with a modal
    alert('Error: ' + message);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format Firestore timestamp to readable string
 */
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

/**
 * Convert text to title case (first letter of each word capitalized)
 */
function toTitleCase(text) {
    if (!text) return '';
    
    return text
        .toLowerCase()
        .split(' ')
        .map(word => {
            // Don't capitalize empty strings
            if (word.length === 0) return word;
            // Capitalize first letter, keep rest lowercase
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Get full name of student in title case
 */
function getStudentFullName(student) {
    if (!student) return '';
    const firstName = toTitleCase(student.firstName || '');
    const lastName = toTitleCase(student.lastName || '');
    return `${firstName} ${lastName}`.trim();
}
