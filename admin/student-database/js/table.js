/**
 * Table Display Module
 * Handles rendering students in the table
 */

/**
 * Display students in table
 */
function displayStudents() {
    const tbody = document.getElementById('students-tbody');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('students-table');

    const studentsData = getStudentsData();

    // Clear existing rows
    tbody.innerHTML = '';

    if (studentsData.length === 0) {
        // Show empty state
        table.style.display = 'none';
        emptyState.style.display = 'block';
        document.getElementById('pagination-container').style.display = 'none';
        return;
    }

    // Hide empty state, show table
    table.style.display = 'table';
    emptyState.style.display = 'none';

    // Apply current sort
    const sortedData = sortStudents([...studentsData], getCurrentSort().field, getCurrentSort().direction);

    // Get paginated data
    const paginatedData = getPaginatedData(sortedData);

    // Create table rows
    paginatedData.forEach((student) => {
        const row = createStudentRow(student);
        tbody.appendChild(row);
    });

    // Update sort icons
    updateSortIcons();

    // Update pagination
    renderPagination(studentsData.length);
    updatePaginationInfo(studentsData.length);
}

/**
 * Create student row element
 */
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
    
    // Check if student has notes
    const hasNotes = student.adminNotes && student.adminNotes.trim().length > 0;
    const notesButtonClass = hasNotes ? 'btn-icon has-notes' : 'btn-icon';

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
            <button class="${notesButtonClass}" onclick="editNotes('${student.id}')" title="${hasNotes ? 'Edit Notes' : 'Add Notes'}">
                <i class="fas fa-sticky-note"></i>
            </button>
            <button class="btn-icon" onclick="editStudent('${student.id}')" title="Edit Student">
                <i class="fas fa-edit"></i>
            </button>
        </td>
    `;

    return row;
}
