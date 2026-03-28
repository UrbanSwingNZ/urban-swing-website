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
                    const dateParts = dateInput.value.split(', ');
                    const dateStr = dateParts[dateParts.length - 1]; // Get "15 Mar 2026" part
                    const timeStr = timeInput.value;
                    const dateTimeStr = `${dateStr} ${timeStr}`;
                    const workshopDateTime = new Date(dateTimeStr);
                    
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
        formattedDateDisplay = date.toLocaleDateString('en-NZ', { 
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
                
                <div class="form-group">
                    <label for="edit-workshop-status">Status *</label>
                    <select id="edit-workshop-status" required>
                        <option value="draft" ${workshop.status === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="published" ${workshop.status === 'published' ? 'selected' : ''}>Published</option>
                        <option value="completed" ${workshop.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
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
                    const dateParts = dateInput.value.split(', ');
                    const dateStr = dateParts[dateParts.length - 1]; // Get "15 Mar 2026" part
                    const timeStr = timeInput.value;
                    const dateTimeStr = `${dateStr} ${timeStr}`;
                    const workshopDateTime = new Date(dateTimeStr);
                    
                    const updates = {
                        name: document.getElementById('edit-workshop-name').value.trim(),
                        date: workshopDateTime,
                        topic: document.getElementById('edit-workshop-topic').value.trim(),
                        description: document.getElementById('edit-workshop-description').value.trim(),
                        cost: document.getElementById('edit-workshop-cost').value,
                        status: document.getElementById('edit-workshop-status').value,
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
    
    // Initialize date picker after modal opens
    setTimeout(() => {
        const datePicker = new DatePicker('edit-workshop-date', 'edit-workshop-calendar', {
            allowedDays: [0, 1, 2, 3, 4, 5, 6], // Allow all days
            disablePastDates: false, // Allow editing past workshops
            dateFormat: { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
        });
    }, 100);
}

// ============================================
// MANAGE INVITES MODAL
// ============================================

function openManageInvitesModal(workshopId) {
    const workshop = getWorkshopById(workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found', 'error');
        return;
    }
    
    if (workshop.openToAll) {
        showSnackbar('This is an open workshop. All students can see it.', 'info');
        return;
    }
    
    const modal = new BaseModal({
        id: 'manage-invites-modal',
        title: `Manage Invites: ${workshop.name}`,
        content: generateInvitesContent(workshop),
        buttons: [
            {
                text: 'Close',
                class: 'btn-cancel',
                onClick: (modal) => modal.hide()
            }
        ]
    });
    
    modal.show();
    attachInviteListeners(workshop, modal);
}

function generateInvitesContent(workshop) {
    const invitedStudents = workshop.invitedStudents || [];
    
    return `
        <div class="invite-management">
            <!-- Student Search -->
            <div class="student-search" style="margin-bottom: 30px;">
                <label for="invite-search" style="display: block; margin-bottom: 8px; font-weight: 600;">
                    <i class="fas fa-search"></i> Search and add students:
                </label>
                <input type="text" 
                       id="invite-search" 
                       placeholder="Type student name..."
                       style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px;">
                <div id="invite-search-results" class="search-results" style="display: none;"></div>
            </div>
            
            <!-- Invited Students List -->
            <div class="invited-students-section">
                <h3 style="margin-bottom: 15px; color: var(--text-primary);">
                    <i class="fas fa-users"></i> Invited Students (${invitedStudents.length})
                </h3>
                
                <div id="invited-students-list">
                    ${invitedStudents.length === 0 ? `
                        <div style="padding: 20px; background: var(--hover-background); border-radius: 6px; text-align: center; color: var(--text-secondary);">
                            <i class="fas fa-info-circle"></i> No students invited yet. Search above to add students.
                        </div>
                    ` : `
                        <div class="invited-list">
                            ${invitedStudents.map(studentId => renderInvitedStudent(studentId, workshop)).join('')}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderInvitedStudent(studentId, workshop) {
    // Check if student is registered
    const registered = workshop.registeredStudents?.find(r => r.studentId === studentId);
    
    return `
        <div class="invited-student-item" data-student-id="${studentId}">
            <div class="student-info">
                <span class="student-name" id="student-name-${studentId}">Loading...</span>
                ${registered ? `
                    <span class="registration-badge" style="margin-left: 10px; padding: 3px 8px; background: var(--success-light); color: var(--success); border-radius: 4px; font-size: 12px;">
                        <i class="fas fa-check-circle"></i> Registered
                    </span>
                ` : ''}
            </div>
            <button class="action-btn btn-delete" onclick="handleRemoveInvite('${workshop.id}', '${studentId}')" ${registered ? 'disabled title="Cannot remove registered students"' : ''}>
                <i class="fas fa-times"></i> Remove
            </button>
        </div>
    `;
}

function attachInviteListeners(workshop, modal) {
    const searchInput = document.getElementById('invite-search');
    const searchResults = document.getElementById('invite-search-results');
    
    let searchTimeout;
    
    // Load student names for already invited students
    loadInvitedStudentNames(workshop);
    
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
            
            // Filter out already invited students
            const invitedIds = new Set(workshop.invitedStudents || []);
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
                        
                        // Refresh modal content
                        const updatedWorkshop = getWorkshopById(workshop.id);
                        modal.updateContent(generateInvitesContent(updatedWorkshop));
                        attachInviteListeners(updatedWorkshop, modal);
                        
                        searchInput.value = '';
                        searchResults.style.display = 'none';
                    } catch (error) {
                        // Error handling in addInvitedStudent()
                    }
                });
            });
        }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.student-search')) {
            searchResults.style.display = 'none';
        }
    });
}

async function loadInvitedStudentNames(workshop) {
    for (const studentId of workshop.invitedStudents || []) {
        try {
            const studentDoc = await db.collection('students').doc(studentId).get();
            if (studentDoc.exists) {
                const student = studentDoc.data();
                const nameElement = document.getElementById(`student-name-${studentId}`);
                if (nameElement) {
                    nameElement.textContent = `${student.firstName} ${student.lastName}`;
                }
            }
        } catch (error) {
            console.error(`Error loading student ${studentId}:`, error);
        }
    }
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
    
    const confirmed = await ConfirmationModal.show({
        title: 'Remove Student',
        message: `Are you sure you want to remove ${studentName} from the invited list?`,
        confirmText: 'Remove',
        confirmClass: 'btn-danger'
    });
    
    if (confirmed) {
        try {
            await removeInvitedStudent(workshopId, studentId);
            
            // Refresh the modal if it's still open
            const existingModal = document.getElementById('manage-invites-modal');
            if (existingModal) {
                const workshop = getWorkshopById(workshopId);
                const modal = BaseModal.getInstance('manage-invites-modal');
                if (modal) {
                    modal.updateContent(generateInvitesContent(workshop));
                    attachInviteListeners(workshop, modal);
                }
            }
        } catch (error) {
            // Error handling in removeInvitedStudent()
        }
    }
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
                    <i class="fas fa-plus-circle"></i> Add Video
                </h3>
                <form id="add-video-form" style="display: grid; gap: 15px;">
                    <div class="form-group">
                        <label for="video-title">Video Title *</label>
                        <input type="text" id="video-title" required placeholder="e.g., Drill 1: Connection">
                    </div>
                    
                    <div class="form-group">
                        <label for="video-url">YouTube URL *</label>
                        <input type="url" id="video-url" required placeholder="https://www.youtube.com/watch?v=...">
                        <small style="color: var(--text-secondary); font-size: 12px;">
                            Paste the full YouTube video URL
                        </small>
                    </div>
                    
                    <button type="submit" class="btn-primary" style="justify-self: start;">
                        <i class="fas fa-plus"></i> Add Video
                    </button>
                </form>
            </div>
            
            <!-- Videos List -->
            <div class="videos-list-section">
                <h3 style="margin-bottom: 15px; color: var(--text-primary);">
                    <i class="fas fa-video"></i> Workshop Videos (${videos.length})
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
            modal.updateContent(generateVideosContent(updatedWorkshop));
            attachVideoListeners(updatedWorkshop, modal);
        } catch (error) {
            // Error handling in addVideo()
        }
    });
}

async function handleRemoveVideo(workshopId, videoUrl) {
    const confirmed = await ConfirmationModal.show({
        title: 'Remove Video',
        message: 'Are you sure you want to remove this video from the workshop?',
        confirmText: 'Remove',
        confirmClass: 'btn-danger'
    });
    
    if (confirmed) {
        try {
            await removeVideo(workshopId, videoUrl);
            
            // Refresh the modal if it's still open
            const existingModal = document.getElementById('manage-videos-modal');
            if (existingModal) {
                const workshop = getWorkshopById(workshopId);
                const modal = BaseModal.getInstance('manage-videos-modal');
                if (modal) {
                    modal.updateContent(generateVideosContent(workshop));
                    attachVideoListeners(workshop, modal);
                }
            }
        } catch (error) {
            // Error handling in removeVideo()
        }
    }
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
    
    const confirmed = await ConfirmationModal.show({
        title: 'Delete Workshop',
        message: `Are you sure you want to delete "${workshop.name}"? This action cannot be undone.`,
        confirmText: 'Delete Workshop',
        confirmClass: 'btn-danger'
    });
    
    if (confirmed) {
        try {
            await deleteWorkshop(workshopId);
        } catch (error) {
            // Error handling in deleteWorkshop()
        }
    }
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
