/**
 * Class Plan Management System
 * Allows admins to create and manage class plans with dance moves for each week
 */

import { BaseModal } from '/components/modals/modal-base.js';

// Global variables (avoid redeclaring db/auth as they may be global)
let datePicker;
let currentUser = null;
let editingPlanId = null;
let formModal = null;
let deleteModal = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to initialize
    await waitForFirebase();
    
    // Check authentication
    window.firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await checkAdminAccess();
            initializePage();
        } else {
            window.location.href = '/admin/';
        }
    });
});

/**
 * Wait for Firebase to be initialized
 */
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.firebase && window.db) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

/**
 * Check if user has admin access
 */
async function checkAdminAccess() {
    try {
        const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            alert('Access denied. User not found.');
            window.location.href = '/admin/';
            return;
        }
        
        const userData = userDoc.data();
        if (userData.role !== 'admin' && userData.role !== 'front-desk') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/admin/';
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        alert('Error verifying access permissions.');
        window.location.href = '/admin/';
    }
}

/**
 * Initialize the page
 */
function initializePage() {
    // Initialize date picker
    datePicker = new DatePicker('class-date', 'class-calendar', {
        onDateSelected: handleDateSelected,
        allowedDays: [4], // Thursday only
        disablePastDates: false // Allow selecting past dates
    });
    
    // Initialize modals with BaseModal
    initializeModals();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load class plans
    loadClassPlans();
}

/**
 * Initialize modal instances
 */
function initializeModals() {
    // Form modal
    formModal = new BaseModal({
        element: document.getElementById('class-plan-modal'),
        closeOnEscape: true,
        closeOnOverlay: true,
        showCloseButton: false // We have our own close button in the HTML
    });
    
    // Delete confirmation modal
    deleteModal = new BaseModal({
        element: document.getElementById('delete-modal'),
        closeOnEscape: true,
        closeOnOverlay: true,
        showCloseButton: false // We have our own close button in the HTML
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Add class button
    document.getElementById('add-class-btn').addEventListener('click', () => {
        openModal();
    });
    
    // Floating add button
    const floatingBtn = document.getElementById('floating-add-btn');
    floatingBtn.addEventListener('click', () => {
        openModal();
    });
    
    // Show/hide floating button on scroll
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        const addButton = document.getElementById('add-class-btn');
        const floatingButton = document.getElementById('floating-add-btn');
        
        if (addButton && floatingButton) {
            const rect = addButton.getBoundingClientRect();
            const isAddButtonVisible = rect.bottom > 0 && rect.top < window.innerHeight;
            
            if (!isAddButtonVisible && window.scrollY > 200) {
                floatingButton.classList.add('visible');
                floatingButton.style.display = 'flex';
            } else {
                floatingButton.classList.remove('visible');
                setTimeout(() => {
                    if (!floatingButton.classList.contains('visible')) {
                        floatingButton.style.display = 'none';
                    }
                }, 300);
            }
        }
    });
    
    // Modal close buttons (now handled by BaseModal, but we'll add explicit handlers)
    document.getElementById('modal-close-btn').addEventListener('click', () => formModal.hide());
    document.getElementById('cancel-btn').addEventListener('click', () => formModal.hide());
    
    // Form submission
    document.getElementById('class-plan-form').addEventListener('submit', handleFormSubmit);
    
    // Delete modal close buttons
    document.getElementById('delete-modal-close-btn').addEventListener('click', () => deleteModal.hide());
    document.getElementById('delete-cancel-btn').addEventListener('click', () => deleteModal.hide());
    document.getElementById('delete-confirm-btn').addEventListener('click', handleDeleteConfirm);
}

/**
 * Handle date selection
 */
function handleDateSelected(date) {
    // Date is already set by the date picker
    console.log('Date selected:', date);
}

/**
 * Open the add/edit modal
 */
function openModal(planData = null) {
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('class-plan-form');
    
    // Reset form
    form.reset();
    editingPlanId = null;
    
    if (planData) {
        // Editing existing plan
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Class Plan';
        editingPlanId = planData.id;
        
        // Populate form
        document.getElementById('class-date').value = formatDateForDisplay(planData.date);
        datePicker.selectedDate = planData.date;
        
        document.getElementById('move-1').value = planData.move1 || '';
        document.getElementById('move-2').value = planData.move2 || '';
        document.getElementById('move-3').value = planData.move3 || '';
        document.getElementById('notes').value = planData.notes || '';
    } else {
        // Adding new plan
        modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add Class Plan';
    }
    
    formModal.show();
}

/**
 * Close the modal (called after successful form submission)
 */
function closeModal() {
    formModal.hide();
    editingPlanId = null;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const dateInput = document.getElementById('class-date').value;
    const move1 = document.getElementById('move-1').value.trim();
    const move2 = document.getElementById('move-2').value.trim();
    const move3 = document.getElementById('move-3').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    // Validate date
    if (!datePicker.selectedDate) {
        alert('Please select a date');
        return;
    }
    
    // Check if at least one move is provided
    if (!move1 && !move2 && !move3) {
        alert('Please provide at least one move');
        return;
    }
    
    // Show loading
    showLoadingSpinner('Saving class plan...');
    
    try {
        const planData = {
            date: window.firebase.firestore.Timestamp.fromDate(datePicker.selectedDate),
            move1: move1,
            move2: move2,
            move3: move3,
            notes: notes,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        };
        
        if (editingPlanId) {
            // Update existing plan
            await window.db.collection('classPlans').doc(editingPlanId).update(planData);
            showSnackbar('Class plan updated successfully', 'success');
        } else {
            // Create new plan
            planData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
            planData.createdBy = currentUser.uid;
            await window.db.collection('classPlans').add(planData);
            showSnackbar('Class plan created successfully', 'success');
        }
        
        closeModal();
        loadClassPlans();
    } catch (error) {
        console.error('Error saving class plan:', error);
        showSnackbar('Error saving class plan: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Load all class plans
 */
async function loadClassPlans() {
    showLoadingSpinner('Loading class plans...');
    
    try {
        const snapshot = await window.db.collection('classPlans')
            .orderBy('date', 'desc')
            .get();
        
        const container = document.getElementById('class-plans-container');
        const emptyState = document.getElementById('empty-state');
        
        if (snapshot.empty) {
            emptyState.style.display = 'block';
            // Remove any existing cards
            const existingCards = container.querySelectorAll('.class-plan-card');
            existingCards.forEach(card => card.remove());
        } else {
            emptyState.style.display = 'none';
            
            // Clear existing cards
            const existingCards = container.querySelectorAll('.class-plan-card');
            existingCards.forEach(card => card.remove());
            
            // Add cards
            snapshot.forEach(doc => {
                const planData = doc.data();
                planData.id = doc.id;
                planData.date = planData.date.toDate();
                
                const card = createClassPlanCard(planData);
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading class plans:', error);
        showSnackbar('Error loading class plans: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Create a class plan card
 */
function createClassPlanCard(planData) {
    const card = document.createElement('div');
    card.className = 'class-plan-card';
    
    const formattedDate = formatDateForDisplay(planData.date);
    
    let movesHTML = '';
    if (planData.move1) {
        movesHTML += `
            <div class="move-item">
                <i class="fas fa-shoe-prints"></i>
                <div class="move-content">
                    <div class="move-label">Move 1</div>
                    <p class="move-text">${escapeHtml(planData.move1)}</p>
                </div>
            </div>
        `;
    }
    if (planData.move2) {
        movesHTML += `
            <div class="move-item">
                <i class="fas fa-shoe-prints"></i>
                <div class="move-content">
                    <div class="move-label">Move 2</div>
                    <p class="move-text">${escapeHtml(planData.move2)}</p>
                </div>
            </div>
        `;
    }
    if (planData.move3) {
        movesHTML += `
            <div class="move-item">
                <i class="fas fa-shoe-prints"></i>
                <div class="move-content">
                    <div class="move-label">Move 3</div>
                    <p class="move-text">${escapeHtml(planData.move3)}</p>
                </div>
            </div>
        `;
    }
    
    let notesHTML = '';
    if (planData.notes) {
        notesHTML = `
            <div class="notes-section">
                <div class="notes-label">
                    <i class="fas fa-sticky-note"></i> Notes
                </div>
                <p class="notes-text">${escapeHtml(planData.notes)}</p>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="class-plan-card-header">
            <div class="class-plan-date">
                <i class="fas fa-calendar-alt"></i>
                <h3>${formattedDate}</h3>
            </div>
            <div class="class-plan-actions">
                <button class="btn-icon btn-edit" onclick="editClassPlan('${planData.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteClassPlan('${planData.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="class-plan-card-body">
            ${movesHTML}
            ${notesHTML}
        </div>
    `;
    
    return card;
}

/**
 * Edit a class plan
 */
window.editClassPlan = async function(planId) {
    try {
        const doc = await window.db.collection('classPlans').doc(planId).get();
        
        if (!doc.exists) {
            showSnackbar('Class plan not found', 'error');
            return;
        }
        
        const planData = doc.data();
        planData.id = doc.id;
        planData.date = planData.date.toDate();
        
        openModal(planData);
    } catch (error) {
        console.error('Error loading class plan:', error);
        showSnackbar('Error loading class plan: ' + error.message, 'error');
    }
};

/**
 * Delete a class plan
 */
window.deleteClassPlan = function(planId) {
    const modal = document.getElementById('delete-modal');
    modal.dataset.planId = planId;
    deleteModal.show();
};

/**
 * Close delete modal
 */
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    delete modal.dataset.planId;
    deleteModal.hide();
}

/**
 * Handle delete confirmation
 */
async function handleDeleteConfirm() {
    const modal = document.getElementById('delete-modal');
    const planId = modal.dataset.planId;
    
    if (!planId) return;
    
    showLoadingSpinner('Deleting class plan...');
    
    try {
        await window.db.collection('classPlans').doc(planId).delete();
        showSnackbar('Class plan deleted successfully', 'success');
        closeDeleteModal();
        loadClassPlans();
    } catch (error) {
        console.error('Error deleting class plan:', error);
        showSnackbar('Error deleting class plan: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Format date for display
 */
function formatDateForDisplay(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-NZ', options);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show loading spinner
 */
function showLoadingSpinner(message = 'Loading...') {
    const spinner = document.querySelector('loading-spinner');
    if (spinner) {
        spinner.show(message);
    }
}

/**
 * Hide loading spinner
 */
function hideLoadingSpinner() {
    const spinner = document.querySelector('loading-spinner');
    if (spinner) {
        spinner.hide();
    }
}

/**
 * Show snackbar notification
 */
function showSnackbar(message, type = 'info') {
    // Import and use the snackbar component if available
    if (window.showSnackbar) {
        window.showSnackbar(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}
