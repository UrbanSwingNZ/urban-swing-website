// Closedown Nights Admin Tool
// Firebase auth and db are already initialized in firebase-config.js

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

// State
let currentUser = null;
let closedownPeriods = [];
let lookAheadWeeks = 4; // Default value
let editingId = null;
let deletingId = null;

// Date Pickers
let startDatePicker, endDatePicker, editStartDatePicker, editEndDatePicker;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

function initializeAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Check if user is the main admin (not front-desk)
            if (user.email !== 'dance@urbanswing.co.nz') {
                console.warn('Unauthorized access attempt to Closedown Nights tool');
                alert('Access denied. This tool is only available to the main administrator.');
                window.location.href = '../../index.html';
                return;
            }
            
            currentUser = user;
            initializePage(user);
        } else {
            // Redirect to admin login
            window.location.href = '../../index.html';
        }
    });
}

async function initializePage(user) {
    // Display user email
    document.getElementById('user-email').textContent = user.email;
    
    // Setup logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Initialize date pickers (allow any day, not just Thursdays)
    startDatePicker = new DatePicker('start-date', 'start-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow past dates for editing
        onDateSelected: (date) => {
            console.log('Start date selected:', date);
        }
    });
    
    endDatePicker = new DatePicker('end-date', 'end-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false,
        onDateSelected: (date) => {
            console.log('End date selected:', date);
        }
    });
    
    editStartDatePicker = new DatePicker('edit-start-date', 'edit-start-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        disablePastDates: false,
        onDateSelected: (date) => {
            console.log('Edit start date selected:', date);
        }
    });
    
    editEndDatePicker = new DatePicker('edit-end-date', 'edit-end-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        disablePastDates: false,
        onDateSelected: (date) => {
            console.log('Edit end date selected:', date);
        }
    });
    
    // Setup form handlers
    document.getElementById('add-closedown-form').addEventListener('submit', handleAddClosedown);
    document.getElementById('edit-closedown-form').addEventListener('submit', handleEditClosedown);
    document.getElementById('save-settings-btn').addEventListener('click', handleSaveSettings);
    
    // Setup modal handlers
    document.getElementById('edit-modal-close').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal-cancel').addEventListener('click', closeEditModal);
    
    // Load data
    await loadSettings();
    await loadClosedownPeriods();
}

async function handleLogout() {
    try {
        await auth.signOut();
        console.log('Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout. Please try again.');
    }
}

async function loadSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('closedownNights').get();
        
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            lookAheadWeeks = settings.bannerLookAheadWeeks || 4;
            document.getElementById('look-ahead-weeks').value = lookAheadWeeks;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Use default value if error
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    
    const weeks = parseInt(document.getElementById('look-ahead-weeks').value);
    
    if (weeks < 1 || weeks > 12) {
        showError('Look-ahead period must be between 1 and 12 weeks');
        return;
    }
    
    try {
        await db.collection('settings').doc('closedownNights').set({
            bannerLookAheadWeeks: weeks
        }, { merge: true });
        
        lookAheadWeeks = weeks;
        showSuccess('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings. Please try again.');
    }
}

async function loadClosedownPeriods() {
    const listContainer = document.getElementById('closedown-list');
    listContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Loading closedown periods...</span></div>';
    
    try {
        // Don't use orderBy to avoid requiring a Firestore index
        const snapshot = await db.collection('closedownNights').get();
        
        closedownPeriods = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis()); // Sort in JavaScript instead
        
        renderClosedownList();
    } catch (error) {
        console.error('Error loading closedown periods:', error);
        listContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i>Failed to load closedown periods</div>';
    }
}

function renderClosedownList() {
    const listContainer = document.getElementById('closedown-list');
    
    if (closedownPeriods.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No closedown periods scheduled</p>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    listContainer.innerHTML = closedownPeriods.map(period => {
        const startDate = period.startDate.toDate();
        const endDate = period.endDate.toDate();
        const isPast = endDate < today;
        
        const startStr = formatDate(startDate);
        const endStr = formatDate(endDate);
        const dateRangeStr = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
        
        const canEdit = !isPast;
        
        return `
            <div class="closedown-item ${isPast ? 'past' : ''}">
                <div class="closedown-info">
                    <div class="closedown-dates">
                        <i class="fas fa-calendar-times"></i>
                        ${dateRangeStr}
                    </div>
                    ${period.reason ? `
                        <div class="closedown-reason">
                            <strong>Reason:</strong> ${escapeHtml(period.reason)}
                            ${period.displayReason ? 
                                '<span class="closedown-badge badge-display">Displayed on banner</span>' : 
                                '<span class="closedown-badge badge-no-display">Not displayed</span>'
                            }
                        </div>
                    ` : ''}
                    <div class="closedown-meta">
                        Added ${formatTimestamp(period.createdAt)}
                    </div>
                </div>
                <div class="closedown-actions">
                    <button class="btn-icon" 
                            onclick="openEditModal('${period.id}')" 
                            ${!canEdit ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" 
                            onclick="openDeleteModal('${period.id}')" 
                            ${!canEdit ? 'disabled' : ''}>
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function handleAddClosedown(e) {
    e.preventDefault();
    
    const startDate = startDatePicker.getSelectedDate();
    const endDate = endDatePicker.getSelectedDate();
    const reason = document.getElementById('reason').value.trim();
    const displayReason = document.getElementById('display-reason').checked;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    // Validate date range
    if (endDate < startDate) {
        showError('End date must be on or after start date');
        return;
    }
    
    try {
        // Set time to start of day for consistent comparison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        await db.collection('closedownNights').add({
            startDate: firebase.firestore.Timestamp.fromDate(startDate),
            endDate: firebase.firestore.Timestamp.fromDate(endDate),
            reason: reason || null,
            displayReason: reason ? displayReason : false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        showSuccess('Closedown period added successfully');
        
        // Reset form
        document.getElementById('add-closedown-form').reset();
        startDatePicker.clearDate();
        endDatePicker.clearDate();
        
        // Reload list
        await loadClosedownPeriods();
    } catch (error) {
        console.error('Error adding closedown period:', error);
        showError('Failed to add closedown period. Please try again.');
    }
}

function openEditModal(id) {
    const period = closedownPeriods.find(p => p.id === id);
    if (!period) return;
    
    editingId = id;
    
    // Populate form
    document.getElementById('edit-id').value = id;
    editStartDatePicker.setDate(period.startDate.toDate());
    editEndDatePicker.setDate(period.endDate.toDate());
    document.getElementById('edit-reason').value = period.reason || '';
    document.getElementById('edit-display-reason').checked = period.displayReason || false;
    
    // Show modal
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editingId = null;
}

async function handleEditClosedown(e) {
    e.preventDefault();
    
    if (!editingId) return;
    
    const startDate = editStartDatePicker.getSelectedDate();
    const endDate = editEndDatePicker.getSelectedDate();
    const reason = document.getElementById('edit-reason').value.trim();
    const displayReason = document.getElementById('edit-display-reason').checked;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    if (endDate < startDate) {
        showError('End date must be on or after start date');
        return;
    }
    
    try {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        await db.collection('closedownNights').doc(editingId).update({
            startDate: firebase.firestore.Timestamp.fromDate(startDate),
            endDate: firebase.firestore.Timestamp.fromDate(endDate),
            reason: reason || null,
            displayReason: reason ? displayReason : false
        });
        
        showSuccess('Closedown period updated successfully');
        closeEditModal();
        await loadClosedownPeriods();
    } catch (error) {
        console.error('Error updating closedown period:', error);
        showError('Failed to update closedown period. Please try again.');
    }
}

function openDeleteModal(id) {
    const period = closedownPeriods.find(p => p.id === id);
    if (!period) return;
    
    const startStr = formatDate(period.startDate.toDate());
    const endStr = formatDate(period.endDate.toDate());
    const dateRangeStr = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
    
    const deleteModal = new ConfirmationModal({
        title: 'Confirm Delete',
        message: `<p>Are you sure you want to delete this closedown period?</p>
                  <p class="text-muted">${dateRangeStr}</p>`,
        icon: 'fas fa-exclamation-triangle',
        variant: 'danger',
        confirmText: 'Delete',
        confirmClass: 'btn-delete',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            await deleteClosedownPeriod(id);
        }
    });
    
    deleteModal.show();
}

async function deleteClosedownPeriod(id) {
    try {
        await db.collection('closedownNights').doc(id).delete();
        
        showSuccess('Closedown period deleted successfully');
        await loadClosedownPeriods();
    } catch (error) {
        console.error('Error deleting closedown period:', error);
        showError('Failed to delete closedown period. Please try again.');
    }
}

// Import centralized utilities
import {
    formatDate as formatDateUtil,
    formatTimestamp,
    escapeHtml
} from '/js/utils/index.js';

// Utility Functions
function formatDate(date) {
    // Note: This function signature differs from centralized formatDate (Date vs timestamp)
    // Using formatDateUtil for consistency but keeping wrapper for local compatibility
    return formatDateUtil(date);
}

function showSuccess(message) {
    const successEl = document.getElementById('success-message');
    const errorEl = document.getElementById('error-message');
    
    errorEl.style.display = 'none';
    successEl.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successEl.style.display = 'flex';
    
    setTimeout(() => {
        successEl.style.display = 'none';
    }, 5000);
}

function showError(message) {
    const successEl = document.getElementById('success-message');
    const errorEl = document.getElementById('error-message');
    
    successEl.style.display = 'none';
    errorEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    errorEl.style.display = 'flex';
    
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Expose functions globally for onclick handlers
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;

