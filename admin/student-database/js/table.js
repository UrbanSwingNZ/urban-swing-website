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

    // Apply search filter
    const searchTerm = getSearchTerm();
    const filteredData = filterStudents(studentsData, searchTerm);

    // Apply current sort
    const currentSort = getCurrentSort();
    const sortedData = sortStudents([...filteredData], currentSort.field, currentSort.direction);

    // Get paginated data
    const paginatedData = getPaginatedData(sortedData);

    // Create table rows
    paginatedData.forEach((student) => {
        const row = createStudentRow(student);
        tbody.appendChild(row);
        
        // Load concessions after row is in DOM
        const concessionsCellId = `concessions-${student.id}`;
        setTimeout(() => {
            loadStudentConcessions(student.id, concessionsCellId);
        }, 0);
    });

    // Update sort icons
    updateSortIcons();

    // Update pagination
    renderPagination(filteredData.length);
    updatePaginationInfo(filteredData.length);

    // Update search results info
    updateSearchResultsInfo(filteredData.length, studentsData.length);
}

/**
 * Create student row element
 */
function createStudentRow(student) {
    const row = document.createElement('tr');
    row.dataset.studentId = student.id; // Store student ID for click handler
    
    // Format name in title case
    const firstName = toTitleCase(student.firstName || '');
    const lastName = toTitleCase(student.lastName || '');
    const fullName = `${firstName} ${lastName}`.trim();
    
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
    
    // Concessions badge (will be populated async)
    const concessionsCellId = `concessions-${student.id}`;
    
    // Check if student has notes
    const hasNotes = student.adminNotes && student.adminNotes.trim().length > 0;
    const notesButtonClass = hasNotes ? 'btn-icon has-notes' : 'btn-icon';

    row.innerHTML = `
        <td><strong>${escapeHtml(fullName)}</strong></td>
        <td>${escapeHtml(student.email || 'N/A')}</td>
        <td>${escapeHtml(student.phoneNumber || 'N/A')}</td>
        <td>${escapeHtml(student.pronouns || '-')}</td>
        <td>${emailConsentBadge}</td>
        <td id="${concessionsCellId}" class="concessions-cell">
            <i class="fas fa-spinner fa-spin text-muted"></i>
        </td>
        <td>${registeredDate}</td>
        <td class="action-buttons">
            <button class="${notesButtonClass}" onclick="editNotes('${student.id}')" title="${hasNotes ? 'Edit Notes' : 'Add Notes'}">
                <i class="fas fa-sticky-note"></i>
            </button>
            <button class="btn-icon" onclick="editStudent('${student.id}')" title="Edit Student">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-delete" onclick="confirmDeleteStudent('${student.id}')" title="Delete Student">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;

    // Add click handler to open student details (except when clicking action buttons or concessions)
    row.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons or concessions
        if (e.target.closest('.action-buttons') || e.target.closest('.concessions-cell')) {
            return;
        }
        viewStudent(student.id);
    });

    return row;
}

/**
 * Load and display concessions for a student
 */
async function loadStudentConcessions(studentId, cellId) {
    const cell = document.getElementById(cellId);
    if (!cell) {
        console.warn('Cell not found for concessions:', cellId);
        return;
    }
    
    try {
        const blocks = await getStudentConcessionBlocks(studentId);
        const stats = calculateConcessionStats(blocks);
        const badgeHTML = getConcessionBadgeHTML(stats);
        
        if (badgeHTML) {
            cell.innerHTML = badgeHTML;
            
            // Add click handler for badge (shows detail modal)
            const badge = cell.querySelector('.concession-badge');
            if (badge) {
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showConcessionsDetail(studentId);
                });
            }
            
            // Add click handler for purchase button (opens purchase modal)
            const purchaseBtn = cell.querySelector('.btn-purchase-mini');
            if (purchaseBtn) {
                purchaseBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const student = findStudentById(studentId);
                    if (student) {
                        openPurchaseConcessionsModal(student.id, async (result) => {
                            // Refresh concessions after purchase
                            await loadStudentConcessions(studentId, cellId);
                        }, null, student);
                    }
                });
            }
        } else {
            cell.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading concessions for student:', studentId, error);
        cell.innerHTML = '<span class="text-muted">-</span>';
    }
}
