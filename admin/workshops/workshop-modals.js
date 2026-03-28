/**
 * Workshop Modals
 * Handles all modal interactions for workshop management
 */

import { BaseModal } from '/components/modals/modal-base.js';
import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { LoadingSpinner } from '/components/loading-spinner/loading-spinner.js';
import { showSnackbar } from '/components/snackbar/snackbar.js';
import {
    createWorkshop,
    updateWorkshop,
    deleteWorkshop,
    getWorkshopById,
    addInvitedStudent,
    removeInvitedStudent,
    addVideo,
    removeVideo,
    searchStudents,
    workshops
} from './workshop-manager.js';

// ============================================
// CREATE WORKSHOP MODAL
// ============================================

function openCreateWorkshopModal() {
    const modal = new BaseModal({
        id: 'create-workshop-modal',
        title: 'Create New Workshop',
        content: `
            <form id="create-workshop-form" class="workshop-form">
                <div class="form-group">
                    <label for="workshop-name">Workshop Name *</label>
                    <input type="text" id="workshop-name" required placeholder="e.g., Styling Fundamentals Workshop">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="workshop-date">Date *</label>
                        <input type="text" id="workshop-date" readonly required placeholder="Select date">
                        <div id="workshop-calendar" class="custom-calendar" style="display: none;"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="workshop-time">Time *</label>
                        <input type="time" id="workshop-time" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="workshop-cost">Cost ($) *</label>
                    <input type="number" id="workshop-cost" min="0" step="0.01" required placeholder="25.00">
                </div>
                
                <div class="form-group">
                    <label for="workshop-topic">Topic (Short Summary) *</label>
                    <input type="text" id="workshop-topic" required placeholder="e.g., Connection, styling, and musicality">
                </div>
                
                <div class="form-group">
                    <label for="workshop-description">Full Description</label>
                    <textarea id="workshop-description" rows="4" placeholder="Detailed description of what will be covered..."></textarea>
                </div>
                
                <div class="checkbox-group">
                    <input type="checkbox" id="workshop-open-to-all">
                    <label for="workshop-open-to-all">Open to All</label>
                    <p style="font-size: 12px; color: var(--text-secondary); margin: 5px 0 0 25px;">
                        If unchecked, you'll need to manually invite students
                    </p>
                </div>
            </form>
        `,
        buttons: [
            {
                text: 'Cancel',
                class: 'btn-cancel',
                onClick: (modal) => modal.hide()
            },
            {
                text: 'Create Workshop',
                class: 'btn-primary',
                onClick: async (modal) => {
                    const form = document.getElementById('create-workshop-form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                    
                    // Get date and time values
                    const dateInput = document.getElementById('workshop-date');
                    const timeInput = document.getElementById('workshop-time');
                    
                    if (!dateInput.value || !timeInput.value) {
                        showSnackbar('Please select both date and time', 'warning');
                        return;
                    }
                    
                    // Combine date and time into a single Date object
                    // DatePicker format can be: "Sat, 12 Apr 2026" or "12/04/2026"
                    const dateParts = dateInput.value.split(', ');
                    const dateStr = dateParts[dateParts.length - 1]; // Get "12 Apr 2026" or "12/04/2026" part
                    
                    let day, month, year;
                    
                    // Check if it's DD/MM/YYYY format (from DatePicker selection)
                    if (dateStr.includes('/')) {
                        const [d, m, y] = dateStr.split('/');
                        day = d;
                        month = parseInt(m) - 1; // Convert to 0-indexed month
                        year = y;
                    } else {
                        // Parse "12 Apr 2026" format
                        const [d, monthStr, y] = dateStr.split(' ');
                        const monthMap = {
                            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                        };
                        day = d;
                        month = monthMap[monthStr];
                        year = y;
                    }
                    
                    // Validate parsed values
                    if (!day || month === undefined || !year) {
                        showSnackbar('Invalid date format. Please select a date from the calendar.', 'error');
                        return;
                    }
                    
                    // Parse time
                    const [hours, minutes] = timeInput.value.split(':');
                    
                    // Create Date object with explicit components (always unambiguous)
                    const workshopDateTime = new Date(parseInt(year), month, parseInt(day), parseInt(hours), parseInt(minutes));
                    
                    // Validate the resulting Date object
                    if (isNaN(workshopDateTime.getTime())) {
                        showSnackbar('Invalid date or time. Please check your selections.', 'error');
                        return;
                    }
                    
                    const workshopData = {
                        name: document.getElementById('workshop-name').value.trim(),
                        date: workshopDateTime,
                        topic: document.getElementById('workshop-topic').value.trim(),
                        description: document.getElementById('workshop-description').value.trim(),
                        cost: document.getElementById('workshop-cost').value,
                        openToAll: document.getElementById('workshop-open-to-all').checked
                    };
                    
                    try {
                        await createWorkshop(workshopData);
                        modal.hide();
                    } catch (error) {
                        // Error handling in createWorkshop()
                    }
                }
            }
        ]
    });
    
    modal.show();
    
    // Initialize date picker after modal opens
    setTimeout(() => {
        const datePicker = new DatePicker('workshop-date', 'workshop-calendar', {
            allowedDays: [0, 1, 2, 3, 4, 5, 6], // Allow all days
            disablePastDates: true,
            dateFormat: { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
        });
    }, 100);
}

// ============================================
// EDIT WORKSHOP MODAL
// ============================================

function openEditWorkshopModal(workshopId) {
    const workshop = getWorkshopById(workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found', 'error');
        return;
    }
    
    // Format date and time from Firestore Timestamp
    let formattedDateDisplay = '';
    let formattedTime = '';
    if (workshop.date && workshop.date.toDate) {
        const date = workshop.date.toDate();
        // Use 'en-US' locale to get "Sat, Apr 12, 2026" format which DatePicker expects
        formattedDateDisplay = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        formattedTime = date.toTimeString().slice(0, 5); // HH:MM format
    }
    
    const modal = new BaseModal({
        id: 'edit-workshop-modal',
        title: 'Edit Workshop',
        content: `
            <form id="edit-workshop-form" class="workshop-form">
                <div class="form-group">
                    <label for="edit-workshop-name">Workshop Name *</label>
                    <input type="text" id="edit-workshop-name" required value="${workshop.name}">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-workshop-date">Date *</label>
                        <input type="text" id="edit-workshop-date" readonly required placeholder="Select date">
                        <div id="edit-workshop-calendar" class="custom-calendar" style="display: none;"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-workshop-time">Time *</label>
                        <input type="time" id="edit-workshop-time" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="edit-workshop-cost">Cost ($) *</label>
                    <input type="number" id="edit-workshop-cost" min="0" step="0.01" required value="${workshop.cost}">
                </div>
                
                <div class="form-group">
                    <label for="edit-workshop-topic">Topic (Short Summary) *</label>
                    <input type="text" id="edit-workshop-topic" required value="${workshop.topic}">
                </div>
                
                <div class="form-group">
                    <label for="edit-workshop-description">Full Description</label>
                    <textarea id="edit-workshop-description" rows="4">${workshop.description || ''}</textarea>
                </div>
                
                <div class="checkbox-group">
                    <input type="checkbox" id="edit-workshop-open-to-all" ${workshop.openToAll ? 'checked' : ''}>
                    <label for="edit-workshop-open-to-all">Open to All</label>
                </div>
            </form>
        `,
        buttons: [
            {
                text: 'Cancel',
                class: 'btn-cancel',
                onClick: (modal) => modal.hide()
            },
            {
                text: 'Save Changes',
                class: 'btn-primary',
                onClick: async (modal) => {
                    const form = document.getElementById('edit-workshop-form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                    
                    // Get date and time values
                    const dateInput = document.getElementById('edit-workshop-date');
                    const timeInput = document.getElementById('edit-workshop-time');
                    
                    if (!dateInput.value || !timeInput.value) {
                        showSnackbar('Please select both date and time', 'warning');
                        return;
                    }
                    
                    // Combine date and time into a single Date object
                    // DatePicker format can be: "Sat, 12 Apr 2026" (initial) or "12/04/2026" (selected)
                    const dateParts = dateInput.value.split(', ');
                    const dateStr = dateParts[dateParts.length - 1]; // Get "12 Apr 2026" or "12/04/2026" part
                    
                    let day, month, year;
                    
                    // Check if it's DD/MM/YYYY format (from DatePicker selection)
                    if (dateStr.includes('/')) {
                        const [d, m, y] = dateStr.split('/');
                        day = d;
                        month = parseInt(m) - 1; // Convert to 0-indexed month
                        year = y;
                    } else {
                        // Parse "12 Apr 2026" format (initial display)
                        const [d, monthStr, y] = dateStr.split(' ');
                        const monthMap = {
                            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                        };
                        day = d;
                        month = monthMap[monthStr];
                        year = y;
                    }
                    
                    // Validate parsed values
                    if (!day || month === undefined || !year) {
                        showSnackbar('Invalid date format. Please select a date from the calendar.', 'error');
                        return;
                    }
                    
                    // Parse time
                    const [hours, minutes] = timeInput.value.split(':');
                    
                    // Create Date object with explicit components (always unambiguous)
                    const workshopDateTime = new Date(parseInt(year), month, parseInt(day), parseInt(hours), parseInt(minutes));
                    
                    // Validate the resulting Date object
                    if (isNaN(workshopDateTime.getTime())) {
                        showSnackbar('Invalid date or time. Please check your selections.', 'error');
                        return;
                    }
                    
                    const updates = {
                        name: document.getElementById('edit-workshop-name').value.trim(),
                        date: workshopDateTime,
                        topic: document.getElementById('edit-workshop-topic').value.trim(),
                        description: document.getElementById('edit-workshop-description').value.trim(),
                        cost: document.getElementById('edit-workshop-cost').value,
                        openToAll: document.getElementById('edit-workshop-open-to-all').checked
                    };
                    
                    try {
                        await updateWorkshop(workshopId, updates);
                        modal.hide();
                    } catch (error) {
                        // Error handling in updateWorkshop()
                    }
                }
            }
        ]
    });
    
    modal.show();
    
    // Initialize date picker and set values after modal opens
    setTimeout(() => {
        const datePicker = new DatePicker('edit-workshop-date', 'edit-workshop-calendar', {
            allowedDays: [0, 1, 2, 3, 4, 5, 6], // Allow all days
            disablePastDates: false, // Allow editing past workshops
            dateFormat: { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
        });
        
        // Set the initial date value if available
        if (formattedDateDisplay) {
            document.getElementById('edit-workshop-date').value = formattedDateDisplay;
        }
        
        // Set the initial time value if available
        if (formattedTime) {
            document.getElementById('edit-workshop-time').value = formattedTime;
        }
    }, 100);
}

// ============================================
// MANAGE INVITES MODAL
// ============================================

// Active onSnapshot unsubscribe for the Manage Invites modal
let invitesSnapshotUnsubscribe = null;

async function openManageInvitesModal(workshopId) {
    const workshop = getWorkshopById(workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found', 'error');
        return;
    }
    
    if (workshop.openToAll) {
        showSnackbar('This is an open workshop. All students can see it.', 'info');
        return;
    }
    
    // Fetch and sort student names before creating modal
    const invitedStudentsData = await fetchAndSortInvitedStudents(workshop);
    
    const modal = new BaseModal({
        id: 'manage-invites-modal',
        title: `Manage Invites: ${workshop.name}`,
        content: generateInvitesContent(workshop, invitedStudentsData),
        buttons: [
            {
                text: 'Close',
                class: 'btn-cancel',
                onClick: (modal) => modal.hide()
            }
        ],
        onClose: () => {
            if (invitesSnapshotUnsubscribe) {
                invitesSnapshotUnsubscribe();
                invitesSnapshotUnsubscribe = null;
            }
            if (inviteDocumentClickHandler) {
                document.removeEventListener('click', inviteDocumentClickHandler);
                inviteDocumentClickHandler = null;
            }
        }
    });
    
    modal.show();
    attachInviteListeners(workshop, modal);
    
    // Subscribe to live updates for this workshop document
    if (invitesSnapshotUnsubscribe) invitesSnapshotUnsubscribe();
    invitesSnapshotUnsubscribe = db.collection('workshops').doc(workshopId)
        .onSnapshot(async (docSnapshot) => {
            if (!docSnapshot.exists) return;
            // Only update if the modal is still open
            const listContainer = document.getElementById('invited-students-list');
            if (!listContainer) return;

            const latestWorkshop = { id: docSnapshot.id, ...docSnapshot.data() };
            const invitedStudentsData = await fetchAndSortInvitedStudents(latestWorkshop);
            const heading = listContainer.closest('.invited-students-section')?.querySelector('h3');
            if (heading) {
                heading.innerHTML = `<i class="fas fa-users" style="color: var(--purple-primary);"></i> Invited Students (${invitedStudentsData.length})`;
            }
            listContainer.innerHTML = invitedStudentsData.length === 0 ? `
                <div style="padding: 20px; background: var(--hover-background); border-radius: 6px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-info-circle"></i> No students invited yet. Search above to add students.
                </div>
            ` : `
                <div class="invited-list">
                    ${invitedStudentsData.map(s => renderInvitedStudentWithName(s.id, s.fullName, latestWorkshop)).join('')}
                </div>
            `;
        }, (error) => {
            console.error('Invites snapshot error:', error);
        });
}

async function fetchAndSortInvitedStudents(workshop) {
    const studentsData = [];
    for (const studentId of workshop.invitedStudents || []) {
        try {
            const studentDoc = await db.collection('students').doc(studentId).get();
            if (studentDoc.exists) {
                const student = studentDoc.data();
                studentsData.push({
                    id: studentId,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    fullName: `${student.firstName} ${student.lastName}`
                });
            }
        } catch (error) {
            console.error(`Error loading student ${studentId}:`, error);
        }
    }
    
    // Sort alphabetically by full name
    studentsData.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return studentsData;
}

function generateInvitesContent(workshop, invitedStudentsData = []) {
    return `
        <div class="invite-management">
            <!-- Student Search -->
            <div class="form-group" style="margin-bottom: 30px;">
                <label for="invite-search" style="display: block; margin-bottom: 8px; font-weight: 600;">
                    <i class="fas fa-search" style="color: var(--purple-primary);"></i> Search and add students:
                </label>
                <div class="student-search" style="position: relative;">
                    <input type="text" 
                           id="invite-search" 
                           placeholder="Type student name..." 
                           autocomplete="off">
                    <div id="invite-search-results" class="search-results" style="display: none;"></div>
                </div>
            </div>
            
            <!-- Invited Students List -->
            <div class="invited-students-section">
                <h3 style="margin-bottom: 15px; color: var(--text-primary);">
                    <i class="fas fa-users" style="color: var(--purple-primary);"></i> Invited Students (${invitedStudentsData.length})
                </h3>
                
                <div id="invited-students-list">
                    ${invitedStudentsData.length === 0 ? `
                        <div style="padding: 20px; background: var(--hover-background); border-radius: 6px; text-align: center; color: var(--text-secondary);">
                            <i class="fas fa-info-circle"></i> No students invited yet. Search above to add students.
                        </div>
                    ` : `
                        <div class="invited-list">
                            ${invitedStudentsData.map(student => renderInvitedStudentWithName(student.id, student.fullName, workshop)).join('')}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderInvitedStudentWithName(studentId, studentName, workshop) {
    // Check if student is registered and/or checked in
    const registered = workshop.registeredStudents?.find(r => r.studentId === studentId);
    const checkedIn = workshop.checkedInStudents?.includes(studentId);
    
    let badge = '';
    if (checkedIn) {
        badge = `<span class="status-badge" style="margin-left: 10px; padding: 3px 8px; background: var(--success); color: white; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-check-circle"></i> Checked In
                </span>`;
    }

    const registerBtn = (!registered && !checkedIn) ? `
        <button class="btn btn-primary btn-primary-sm" onclick="handleAdminRegister('${workshop.id}', '${studentId}')" title="Register on behalf of student (pay at door)">
            <span class="btn-icon-desktop"><i class="fas fa-user-plus"></i></span> Register
        </button>
    ` : '';

    const deregisterBtn = (registered && !checkedIn) ? `
        <button class="btn btn-cancel btn-primary-sm" onclick="handleAdminDeregister('${workshop.id}', '${studentId}')" title="Cancel this student's registration">
            <span class="btn-icon-desktop"><i class="fas fa-user-minus"></i></span> De-register
        </button>
    ` : '';

    return `
        <div class="invited-student-item" data-student-id="${studentId}">
            <div class="student-info">
                <span class="student-name">${studentName}</span>
                ${badge}
            </div>
            <div class="invited-student-actions">
                ${registerBtn}
                ${deregisterBtn}
                <button class="btn-icon btn-delete" onclick="handleRemoveInvite('${workshop.id}', '${studentId}')" ${registered || checkedIn ? 'disabled title="Cannot remove registered students"' : ''}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
}

// Store the document click handler so we can remove it
let inviteDocumentClickHandler = null;

function attachInviteListeners(workshop, modal) {
    const searchInput = document.getElementById('invite-search');
    const searchResults = document.getElementById('invite-search-results');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const students = await searchStudents(query);
            
            // Filter out already invited students (use latest workshop data)
            const latestWorkshop = getWorkshopById(workshop.id);
            const invitedIds = new Set((latestWorkshop || workshop).invitedStudents || []);
            const notInvited = students.filter(s => !invitedIds.has(s.id));
            
            if (notInvited.length === 0) {
                searchResults.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">No students found or all matching students already invited</div>';
            } else {
                searchResults.innerHTML = notInvited.map(student => `
                    <div class="search-result-item" data-student-id="${student.id}">
                        ${student.firstName} ${student.lastName}
                    </div>
                `).join('');
            }
            
            searchResults.style.display = 'block';
            
            // Attach click listeners
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const studentId = item.dataset.studentId;
                    const student = notInvited.find(s => s.id === studentId);
                    
                    try {
                        await addInvitedStudent(workshop.id, studentId);
                        // List will refresh automatically via onSnapshot
                        searchInput.value = '';
                        searchResults.style.display = 'none';
                    } catch (error) {
                        // Error handling in addInvitedStudent()
                    }
                });
            });
        }, 300);
    });
    
    // Remove previous document click handler if it exists
    if (inviteDocumentClickHandler) {
        document.removeEventListener('click', inviteDocumentClickHandler);
    }
    
    // Hide results when clicking outside
    inviteDocumentClickHandler = (e) => {
        if (!e.target.closest('.student-search')) {
            searchResults.style.display = 'none';
        }
    };
    document.addEventListener('click', inviteDocumentClickHandler);
}

async function handleRemoveInvite(workshopId, studentId) {
    // Get student name for confirmation
    let studentName = studentId;
    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        if (studentDoc.exists) {
            const student = studentDoc.data();
            studentName = `${student.firstName} ${student.lastName}`;
        }
    } catch (error) {
        console.error('Error fetching student:', error);
    }
    
    const modal = new ConfirmationModal({
        title: 'Remove Student',
        message: `Are you sure you want to remove ${studentName} from the invited list?`,
        confirmText: 'Remove',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            try {
                await removeInvitedStudent(workshopId, studentId);
                // List will refresh automatically via onSnapshot
            } catch (error) {
                // Error handling in removeInvitedStudent()
            }
        }
    });
    
    modal.show();
}

async function handleAdminRegister(workshopId, studentId) {
    const spinner = new LoadingSpinner('invited-students-list');
    spinner.show();
    try {
        const response = await fetch(API_CONFIG.WORKSHOP_PAYMENT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, workshopId, paidOnline: false })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Registration failed');
        }
        showSnackbar(`Student registered successfully (pay at door)`, 'success');
        // List will refresh automatically via onSnapshot
    } catch (error) {
        showSnackbar(`Failed to register: ${error.message}`, 'error');
    } finally {
        spinner.hide();
    }
}

async function handleAdminDeregister(workshopId, studentId) {
    const modal = new ConfirmationModal({
        title: 'Cancel Registration',
        message: 'Are you sure you want to cancel this student\'s registration?',
        confirmText: 'De-register',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            const spinner = new LoadingSpinner('invited-students-list');
            spinner.show();
            try {
                const user = firebase.auth().currentUser;
                const token = user ? await user.getIdToken() : null;
                const response = await fetch(API_CONFIG.WORKSHOP_DEREGISTER, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ studentId, workshopId })
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'De-registration failed');
                }
                showSnackbar('Registration cancelled.', 'success');
                // List will refresh automatically via onSnapshot
            } catch (error) {
                showSnackbar(`Failed to de-register: ${error.message}`, 'error');
            } finally {
                spinner.hide();
            }
        }
    });
    modal.show();
}

// ============================================
// MANAGE VIDEOS MODAL
// ============================================

function openManageVideosModal(workshopId) {
    const workshop = getWorkshopById(workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found', 'error');
        return;
    }
    
    const modal = new BaseModal({
        id: 'manage-videos-modal',
        title: `Manage Videos: ${workshop.name}`,
        content: generateVideosContent(workshop),
        buttons: [
            {
                text: 'Close',
                class: 'btn-cancel',
                onClick: (modal) => modal.hide()
            }
        ]
    });
    
    modal.show();
    attachVideoListeners(workshop, modal);
}

function generateVideosContent(workshop) {
    const videos = workshop.videos || [];
    
    return `
        <div class="video-management">
            <!-- Add Video Form -->
            <div class="add-video-section" style="margin-bottom: 30px; padding: 20px; background: var(--hover-background); border-radius: 8px;">
                <h3 style="margin-bottom: 15px; color: var(--text-primary);">
                    <i class="fas fa-plus-circle" style="color: var(--purple-primary);"></i> Add Video
                </h3>
                <form id="add-video-form" style="display: grid; gap: 8px;">
                    <div class="form-group" style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 15px;">
                        <label for="video-title" style="margin: 0;">Video Title *</label>
                        <input type="text" id="video-title" required placeholder="e.g., Drill 1: Connection">
                    </div>
                    
                    <div class="form-group" style="display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 15px;">
                        <label for="video-url" style="margin: 0;">YouTube URL *</label>
                        <input type="text" id="video-url" required placeholder="https://www.youtube.com/watch?v=...">
                    </div>
                    
                    <button type="submit" class="btn-primary" style="justify-self: start; margin-left: 135px; margin-top: 7px;">
                        <i class="fas fa-plus"></i> Add Video
                    </button>
                </form>
            </div>
            
            <!-- Videos List -->
            <div class="videos-list-section" style="padding-left: 20px;">
                <h3 style="margin-bottom: 15px; color: var(--text-primary);">
                    <i class="fas fa-video" style="color: var(--purple-primary);"></i> Workshop Videos (${videos.length})
                </h3>
                
                <div id="videos-list">
                    ${videos.length === 0 ? `
                        <div style="padding: 20px; background: var(--hover-background); border-radius: 6px; text-align: center; color: var(--text-secondary);">
                            <i class="fas fa-info-circle"></i> No videos added yet. Add videos above to make them available to students who attend.
                        </div>
                    ` : `
                        <div class="video-items">
                            ${videos.map(video => renderVideoItem(video, workshop)).join('')}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderVideoItem(video, workshop) {
    const addedDate = video.addedAt && video.addedAt.toDate ? 
        video.addedAt.toDate().toLocaleDateString('en-NZ', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }) : 'Unknown';
    
    return `
        <div class="video-item" style="padding: 15px; background: white; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 5px;">
                        <i class="fas fa-play-circle" style="color: var(--cyan);"></i> ${video.title}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                        Added ${addedDate}
                    </div>
                    <a href="${video.url}" target="_blank" style="font-size: 12px; color: var(--purple-primary); text-decoration: none;">
                        <i class="fas fa-external-link-alt"></i> ${video.url}
                    </a>
                </div>
                <button class="action-btn btn-delete" onclick="handleRemoveVideo('${workshop.id}', '${video.url.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
}

function attachVideoListeners(workshop, modal) {
    const form = document.getElementById('add-video-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const videoData = {
            title: document.getElementById('video-title').value.trim(),
            url: document.getElementById('video-url').value.trim()
        };
        
        // Basic URL validation
        if (!videoData.url.includes('youtube.com') && !videoData.url.includes('youtu.be')) {
            showSnackbar('Please enter a valid YouTube URL', 'warning');
            return;
        }
        
        try {
            await addVideo(workshop.id, videoData);
            
            // Refresh modal content
            const updatedWorkshop = getWorkshopById(workshop.id);
            modal.setContent(generateVideosContent(updatedWorkshop));
            attachVideoListeners(updatedWorkshop, modal);
        } catch (error) {
            // Error handling in addVideo()
        }
    });
}

async function handleRemoveVideo(workshopId, videoUrl) {
    const modal = new ConfirmationModal({
        title: 'Remove Video',
        message: 'Are you sure you want to remove this video from the workshop?',
        confirmText: 'Remove',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            try {
                await removeVideo(workshopId, videoUrl);
                
                // Refresh the modal if it's still open
                const existingModal = document.getElementById('manage-videos-modal');
                if (existingModal) {
                    const workshop = getWorkshopById(workshopId);
                    const videoModal = BaseModal.getInstance('manage-videos-modal');
                    if (videoModal) {
                        videoModal.setContent(generateVideosContent(workshop));
                        attachVideoListeners(workshop, videoModal);
                    }
                }
            } catch (error) {
                // Error handling in removeVideo()
            }
        }
    });
    
    modal.show();
}

// ============================================
// DELETE CONFIRMATION MODAL
// ============================================

async function confirmDeleteWorkshop(workshopId) {
    const workshop = getWorkshopById(workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found', 'error');
        return;
    }
    
    // Check if workshop has registrations
    if (workshop.registeredStudents && workshop.registeredStudents.length > 0) {
        showSnackbar('Cannot delete workshop with registrations', 'error');
        return;
    }
    
    const modal = new ConfirmationModal({
        title: 'Delete Workshop',
        message: `Are you sure you want to delete "${workshop.name}"? This action cannot be undone.`,
        confirmText: 'Delete Workshop',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            try {
                await deleteWorkshop(workshopId);
            } catch (error) {
                // Error handling in deleteWorkshop()
            }
        }
    });
    
    modal.show();
}

// ============================================
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// ============================================

// Attach modal functions to window for onclick handlers
window.openCreateWorkshopModal = openCreateWorkshopModal;
window.openEditWorkshopModal = openEditWorkshopModal;
window.openManageInvitesModal = openManageInvitesModal;
window.openManageVideosModal = openManageVideosModal;
window.confirmDeleteWorkshop = confirmDeleteWorkshop;
window.handleRemoveInvite = handleRemoveInvite;
window.handleRemoveVideo = handleRemoveVideo;
window.handleAdminRegister = handleAdminRegister;
window.handleAdminDeregister = handleAdminDeregister;
