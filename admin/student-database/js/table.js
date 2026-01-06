/**
 * Table Display Module
 * Handles rendering students in the table
 */

/**
 * Display students in table
 */
async function displayStudents() {
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
    
    // If sorting by concessions, ensure all concession counts are loaded first
    if (currentSort.field === 'concessions') {
        await ensureConcessionsLoaded(filteredData);
    }
    
    const sortedData = sortStudents([...filteredData], currentSort.field, currentSort.direction);

    // Get paginated data
    const paginatedData = getPaginatedData(sortedData);

    // Create table rows
    paginatedData.forEach((student) => {
        const row = createStudentRow(student);
        tbody.appendChild(row);
        
        // Load concessions after row is in DOM (or use cached data if already loaded)
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
 * Ensure all concession counts are loaded for the given students
 */
async function ensureConcessionsLoaded(students) {
    const loadPromises = students.map(async (student) => {
        // Skip if already loaded
        if (student._concessionsCount !== undefined) {
            return;
        }
        
        try {
            const blocks = await getStudentConcessionBlocks(student.id);
            const stats = calculateConcessionStats(blocks);
            // Use totalCount for students with concessions, -1 for students needing to purchase
            student._concessionsCount = stats.totalCount > 0 ? stats.totalCount : -1;
        } catch (error) {
            console.error('Error loading concessions for student:', student.id, error);
            student._concessionsCount = -1;
        }
    });
    
    await Promise.all(loadPromises);
}

/**
 * Create student row element
 */
function createStudentRow(student) {
    const row = document.createElement('tr');
    row.dataset.studentId = student.id; // Store student ID for click handler
    
    // Check if student is deleted
    const isDeleted = student.deleted === true;
    
    // Add deleted class to row if applicable
    if (isDeleted) {
        row.classList.add('deleted-student');
    }
    
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
    const notesIcon = hasNotes ? ' <i class="fas fa-sticky-note note-indicator"></i>' : '';

    // Action buttons - show restore button for deleted students, delete button for active students
    const actionButtons = isDeleted
        ? `<button class="btn-icon btn-restore" onclick="confirmRestoreStudent('${student.id}')" title="Restore Student">
                <i class="fas fa-undo"></i>
            </button>`
        : `${isSuperAdmin() ? `<button class="btn-icon btn-delete" onclick="confirmDeleteStudent('${student.id}')" title="Delete Student">
                <i class="fas fa-trash-alt"></i>
            </button>` : ''}`;

    row.innerHTML = `
        <td><strong>${escapeHtml(fullName)}</strong>${notesIcon}</td>
        <td>${escapeHtml(student.email || 'N/A')}</td>
        <td>${escapeHtml(student.phoneNumber || 'N/A')}</td>
        <td>${escapeHtml(student.pronouns || '-')}</td>
        <td>${emailConsentBadge}</td>
        <td id="${concessionsCellId}" class="concessions-cell">
            <i class="fas fa-spinner fa-spin text-muted"></i>
        </td>
        <td>${registeredDate}</td>
        <td class="action-buttons">
            ${!isDeleted ? `<button class="btn-icon btn-disabled" id="auth-action-${student.id}" data-auth-action="checking" title="Checking auth status...">
                <i class="fas fa-spinner fa-spin"></i>
            </button>` : ''}
            <button class="${notesButtonClass}" onclick="editNotes('${student.id}')" title="${hasNotes ? 'Edit Notes' : 'Add Notes'}">
                <i class="fas fa-sticky-note"></i>
            </button>
            <button class="btn-icon" onclick="editStudent('${student.id}')" title="Edit Student">
                <i class="fas fa-edit"></i>
            </button>
            ${actionButtons}
        </td>
    `;

    // Add click handler to open student details (except when clicking action buttons or concessions)
    row.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons or concessions
        if (e.target.closest('.action-buttons') || e.target.closest('.concessions-cell')) {
            return;
        }
        
        // On mobile (<=768px), toggle accordion instead of opening modal
        if (window.innerWidth <= 768) {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileAccordion(row);
        } else {
            // Desktop: open detail modal
            viewStudent(student.id);
        }
    });
    
    // Check if student has auth user after row is in DOM
    if (!isDeleted) {
        setTimeout(() => {
            checkStudentAuthStatus(student.id, student.email);
        }, 0);
    }

    return row;
}

/**
 * Toggle mobile accordion for student row
 */
function toggleMobileAccordion(row) {
    // Close other open accordions
    const allRows = document.querySelectorAll('.students-table tbody tr');
    allRows.forEach(r => {
        if (r !== row && r.classList.contains('expanded')) {
            r.classList.remove('expanded');
        }
    });
    
    // Toggle current row
    row.classList.toggle('expanded');
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
        
        // Cache the concession count on the student object for sorting
        const student = findStudentById(studentId);
        if (student) {
            // Use totalCount for students with concessions, -1 for students needing to purchase
            student._concessionsCount = stats.totalCount > 0 ? stats.totalCount : -1;
        }
        
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
            const purchaseBtn = cell.querySelector('.btn-primary.btn-primary-sm');
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
        // Set count to -1 for error state
        const student = findStudentById(studentId);
        if (student) {
            student._concessionsCount = -1;
        }
    }
}

/**
 * Check if student has an auth user document
 * Updates the button to show either password reset or invitation icon
 */
async function checkStudentAuthStatus(studentId, email) {
    const authActionBtn = document.getElementById(`auth-action-${studentId}`);
    if (!authActionBtn || !email) return;
    
    try {
        // Query users collection by email to check if auth user exists
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();
        
        if (!usersSnapshot.empty) {
            // Student has auth user - show password reset icon
            authActionBtn.classList.remove('btn-disabled');
            authActionBtn.dataset.authAction = 'reset-password';
            authActionBtn.title = 'Reset Password';
            authActionBtn.innerHTML = '<i class="fas fa-key"></i>';
            authActionBtn.onclick = () => resetStudentPassword(studentId);
        } else {
            // No auth user - show invitation icon
            authActionBtn.classList.remove('btn-disabled');
            authActionBtn.dataset.authAction = 'invite';
            authActionBtn.title = 'Invite to Student Portal';
            authActionBtn.innerHTML = '<i class="fas fa-user-plus"></i>';
            authActionBtn.onclick = () => inviteStudentToPortal(studentId);
        }
    } catch (error) {
        console.error('Error checking auth status for student:', studentId, error);
        // On error, keep button disabled to be safe
        authActionBtn.classList.add('btn-disabled');
        authActionBtn.title = 'Unable to verify auth status';
        authActionBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    }
}

/**
 * Reset student password
 * Sends password reset email to student's email address
 */
function resetStudentPassword(studentId) {
    const student = findStudentById(studentId);
    if (!student || !student.email) {
        alert('Unable to find student email address.');
        return;
    }
    
    // Use the password reset modal with pre-filled email
    showPasswordResetModal(student.email, () => {
        console.log('Password reset email sent to:', student.email);
    });
}

/**
 * Invite student to join the student portal
 * Shows confirmation modal and sends invitation email
 */
function inviteStudentToPortal(studentId) {
    const student = findStudentById(studentId);
    if (!student || !student.email) {
        alert('Unable to find student email address.');
        return;
    }
    
    // Get student name for display
    const firstName = toTitleCase(student.firstName || '');
    const lastName = toTitleCase(student.lastName || '');
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Use the invitation modal
    inviteToPortal(studentId, fullName, student.email);
}
