/**
 * Sort Module
 * Handles table column sorting
 */

let currentSort = { field: 'registeredAt', direction: 'desc' };

/**
 * Sort students array
 */
function sortStudents(data, field, direction) {
    return data.sort((a, b) => {
        let aVal, bVal;

        // Handle special cases
        switch (field) {
            case 'name':
                aVal = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
                bVal = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
                break;
            
            case 'registeredAt':
                aVal = a.registeredAt ? (a.registeredAt.toDate ? a.registeredAt.toDate() : new Date(a.registeredAt)) : new Date(0);
                bVal = b.registeredAt ? (b.registeredAt.toDate ? b.registeredAt.toDate() : new Date(b.registeredAt)) : new Date(0);
                break;
            
            case 'emailConsent':
                aVal = a.emailConsent ? 1 : 0;
                bVal = b.emailConsent ? 1 : 0;
                break;
            
            default:
                aVal = (a[field] || '').toString().toLowerCase();
                bVal = (b[field] || '').toString().toLowerCase();
        }

        // Compare values
        let comparison = 0;
        if (aVal > bVal) {
            comparison = 1;
        } else if (aVal < bVal) {
            comparison = -1;
        }

        return direction === 'asc' ? comparison : -comparison;
    });
}

/**
 * Handle column sort click
 */
function handleSort(field) {
    // If clicking the same column, toggle direction
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
        currentSort.field = field;
        currentSort.direction = 'asc';
    }

    displayStudents();
}

/**
 * Update sort icons in table headers
 */
function updateSortIcons() {
    // Reset all sort icons
    document.querySelectorAll('.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        icon.className = 'fas fa-sort sort-icon';
    });

    // Update active sort icon
    const activeHeader = document.querySelector(`[data-sort="${currentSort.field}"]`);
    if (activeHeader) {
        const icon = activeHeader.querySelector('.sort-icon');
        icon.className = currentSort.direction === 'asc' 
            ? 'fas fa-sort-up sort-icon active' 
            : 'fas fa-sort-down sort-icon active';
    }
}

/**
 * Initialize sort event listeners
 */
function initializeSortListeners() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            handleSort(field);
        });
    });
}

/**
 * Get current sort state
 */
function getCurrentSort() {
    return currentSort;
}
