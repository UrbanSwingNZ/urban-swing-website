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
        
        // Load membership for improvers
        if (student.improver) {
            const membershipCellId = `membership-${student.id}`;
            setTimeout(() => {
                loadStudentMembership(student.id, membershipCellId);
            }, 0);
        }
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
    
    // Add improver styling if applicable
    const improverClass = student.improver ? ' class="improver-name"' : '';
    
    // Check if student was merged into another record
    const mergedBadge = (isDeleted && student.mergedInto) 
        ? `<span class="badge-merged" title="Merged into ${student.mergedInto}"><i class="fas fa-compress-arrows-alt"></i> Merged</span>`
        : '';
    
    // Format pronouns for display below name
    const pronounsDisplay = student.pronouns ? `<div class="student-pronouns">${escapeHtml(student.pronouns)}</div>` : '';

    // Email consent badge
    const emailConsentBadge = student.emailConsent 
        ? '<span class="badge badge-yes">Yes</span>' 
        : '<span class="badge badge-no">No</span>';
    
    // Concessions badge (will be populated async)
    const concessionsCellId = `concessions-${student.id}`;
    
    // Membership badge (will be populated async for improvers)
    const membershipCellId = `membership-${student.id}`;
    
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

    // Email and phone with copy buttons
    const email = student.email || 'N/A';
    const emailDisplay = email !== 'N/A' 
        ? `<span class="contact-field-wrapper">
                <span class="contact-text">${escapeHtml(email)}</span>
                <button class="btn-copy-contact" data-copy-value="${escapeHtml(email)}" data-copy-label="Email" title="Copy email">
                    <i class="fas fa-copy"></i>
                </button>
            </span>`
        : 'N/A';
    
    row.innerHTML = `
        <td><strong${improverClass}>${escapeHtml(fullName)}</strong>${mergedBadge}${notesIcon}${pronounsDisplay}</td>
        <td>${emailDisplay}</td>
        <td>${emailConsentBadge}</td>
        <td id="${concessionsCellId}" class="concessions-cell">
            <i class="fas fa-spinner fa-spin text-muted"></i>
        </td>
        <td id="${membershipCellId}" class="membership-cell">
            ${student.improver ? '<i class="fas fa-spinner fa-spin text-muted"></i>' : '<span class="text-muted">-</span>'}
        </td>
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
            if (typeof window.viewStudent === 'function') {
                window.viewStudent(student.id);
            } else {
                console.error('viewStudent function not available yet');
            }
        }
    });
    
    // Add click handlers for copy buttons
    const copyButtons = row.querySelectorAll('.btn-copy-contact');
    copyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const value = button.getAttribute('data-copy-value');
            const label = button.getAttribute('data-copy-label');
            if (value) {
                copyToClipboard(value, label);
            }
        });
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
        
        // Get student to check for active membership
        const student = findStudentById(studentId);
        const hasActiveMembership = student && student.activeMembershipId && student.membershipExpiryDate;
        
        const badgeHTML = getConcessionBadgeHTML(stats, hasActiveMembership);
        
        // Cache the concession count on the student object for sorting
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
            if (purchaseBtn && !purchaseBtn.disabled) {
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
 * Load and display membership information for an improver student
 */
async function loadStudentMembership(studentId, cellId) {
    const cell = document.getElementById(cellId);
    if (!cell) {
        console.warn('Cell not found for membership:', cellId);
        return;
    }
    
    try {
        const student = findStudentById(studentId);
        if (!student) {
            cell.innerHTML = '<span class="text-muted">-</span>';
            return;
        }
        
        // Check if student has an active membership
        const hasActiveMembership = student.activeMembershipId && student.membershipExpiryDate;
        
        if (hasActiveMembership) {
            // Format expiry date
            const expiryDate = student.membershipExpiryDate.toDate ? 
                student.membershipExpiryDate.toDate() : 
                new Date(student.membershipExpiryDate);
            
            const day = String(expiryDate.getUTCDate()).padStart(2, '0');
            const month = String(expiryDate.getUTCMonth() + 1).padStart(2, '0');
            const year = expiryDate.getUTCFullYear();
            const formattedDate = `${day}/${month}/${year}`;
            
            // Show expiry date with green badge styling
            cell.innerHTML = `<span class="badge badge-yes">${formattedDate}</span>`;
        } else {
            // No active membership - show red badge
            cell.innerHTML = `<span class="badge badge-no">Inactive</span>`;
        }
    } catch (error) {
        console.error('Error loading membership for student:', studentId, error);
        cell.innerHTML = '<span class="text-muted">-</span>';
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

/**
 * Open prepay page for student to purchase membership
 */
function openPrepayPage(studentId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const student = findStudentById(studentId);
    if (!student) {
        alert('Unable to find student information.');
        return;
    }
    
    // Open student portal prepay page in new tab
    const prepayUrl = `/student-portal/prepay/?studentId=${studentId}`;
    window.open(prepayUrl, '_blank');
}
