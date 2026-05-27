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
let currentBlockSize = 12; // Default block size
let nextWeekNumber = 1;

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
    
    // Load block size settings
    loadBlockSettings();
    
    // Load active tab (restore from localStorage or default to level2)
    const savedTab = localStorage.getItem('classPlanActiveTab') || 'level2';
    switchTab(savedTab);
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
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
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
    
    // Block settings
    document.getElementById('save-block-size-btn').addEventListener('click', saveBlockSize);
    
    // Search functionality - Level 2
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    
    searchInput.addEventListener('input', (e) => handleSearch(e, 'level2'));
    clearSearchBtn.addEventListener('click', () => clearSearch('level2'));
    
    // Search functionality - History
    const historySearchInput = document.getElementById('history-search-input');
    const historyClearSearchBtn = document.getElementById('history-clear-search');
    
    historySearchInput.addEventListener('input', (e) => handleSearch(e, 'history'));
    historyClearSearchBtn.addEventListener('click', () => clearSearch('history'));
}

/**
 * Handle search input
 */
function handleSearch(e, tabName) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const clearBtn = tabName === 'level2' 
        ? document.getElementById('clear-search')
        : document.getElementById('history-clear-search');
    const container = document.getElementById(`${tabName}-plans-container`);
    const cards = container.querySelectorAll('.class-plan-card');
    
    // Show/hide clear button
    clearBtn.style.display = searchTerm ? 'block' : 'none';
    
    if (!searchTerm) {
        // Show all cards if search is empty
        cards.forEach(card => card.style.display = 'block');
        return;
    }
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        if (cardText.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show a message if no cards match
    if (visibleCount === 0 && cards.length > 0) {
        // Create or update "no results" message
        let noResultsMsg = document.getElementById(`${tabName}-no-search-results`);
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = `${tabName}-no-search-results`;
            noResultsMsg.className = 'empty-state';
            noResultsMsg.innerHTML = `
                <i class="fas fa-search"></i>
                <p>No class plans match your search</p>
            `;
            container.appendChild(noResultsMsg);
        }
        noResultsMsg.style.display = 'block';
    } else {
        const noResultsMsg = document.getElementById(`${tabName}-no-search-results`);
        if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    }
}

/**
 * Clear search input
 */
function clearSearch(tabName) {
    const searchInput = tabName === 'level2'
        ? document.getElementById('search-input')
        : document.getElementById('history-search-input');
    searchInput.value = '';
    handleSearch({ target: searchInput }, tabName);
    searchInput.focus();
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load data for selected tab
    if (tabName === 'level1') {
        loadLevel1Plans();
    } else if (tabName === 'level2') {
        loadLevel2Plans();
    } else if (tabName === 'history') {
        loadHistoryPlans();
    }
    
    // Save preference to localStorage
    localStorage.setItem('classPlanActiveTab', tabName);
}

/**
 * Load Level 1 plans (12-week cycle)
 */
async function loadLevel1Plans() {
    showLoadingSpinner('Loading Level 1 cycle...');
    
    try {
        const snapshot = await window.db.collection('classPlans')
            .where('classLevel', '==', 'level1')
            .orderBy('cycleWeek', 'asc')
            .get();
        
        const container = document.getElementById('level1-plans-container');
        const emptyState = document.getElementById('level1-empty-state');
        
        // Clear existing cards
        const existingCards = container.querySelectorAll('.class-plan-card');
        existingCards.forEach(card => card.remove());
        
        if (snapshot.empty) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            
            // Add cards
            snapshot.forEach(doc => {
                const planData = doc.data();
                planData.id = doc.id;
                if (planData.date) {
                    planData.date = planData.date.toDate();
                }
                
                const card = createClassPlanCard(planData);
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading Level 1 plans:', error);
        showSnackbar('Error loading Level 1 plans: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Load Level 2 plans (current and future classes)
 */
async function loadLevel2Plans() {
    showLoadingSpinner('Loading Level 2 classes...');
    
    try {
        // Get history cutoff date from settings
        const settingsDoc = await window.db.collection('settings').doc('classPlans').get();
        let cutoffDate = new Date('2026-06-01'); // Default
        
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            if (settings.historyCutoffDate) {
                cutoffDate = settings.historyCutoffDate.toDate();
                // Add one day to cutoff to get the start of Level 2
                cutoffDate.setDate(cutoffDate.getDate() + 1);
            }
        }
        
        const cutoffTimestamp = window.firebase.firestore.Timestamp.fromDate(cutoffDate);
        
        const snapshot = await window.db.collection('classPlans')
            .where('classLevel', '==', 'level2')
            .where('date', '>=', cutoffTimestamp)
            .orderBy('date', 'desc')
            .get();
        
        const container = document.getElementById('level2-plans-container');
        const emptyState = document.getElementById('level2-empty-state');
        
        // Clear existing cards
        const existingCards = container.querySelectorAll('.class-plan-card');
        existingCards.forEach(card => card.remove());
        
        if (snapshot.empty) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            
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
        console.error('Error loading Level 2 plans:', error);
        showSnackbar('Error loading Level 2 plans: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Load History plans (past classes)
 */
async function loadHistoryPlans() {
    showLoadingSpinner('Loading class history...');
    
    try {
        // Get history cutoff date from settings
        const settingsDoc = await window.db.collection('settings').doc('classPlans').get();
        let cutoffDate = new Date('2026-05-31T23:59:59'); // Default
        
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            if (settings.historyCutoffDate) {
                cutoffDate = settings.historyCutoffDate.toDate();
            }
        }
        
        const cutoffTimestamp = window.firebase.firestore.Timestamp.fromDate(cutoffDate);
        
        const snapshot = await window.db.collection('classPlans')
            .where('classLevel', '==', 'level2')
            .where('date', '<=', cutoffTimestamp)
            .orderBy('date', 'desc')
            .get();
        
        const container = document.getElementById('history-plans-container');
        const emptyState = document.getElementById('history-empty-state');
        
        // Clear existing cards
        const existingCards = container.querySelectorAll('.class-plan-card');
        existingCards.forEach(card => card.remove());
        
        if (snapshot.empty) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            
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
        console.error('Error loading history plans:', error);
        showSnackbar('Error loading history: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Handle search input
 */
/**
 * Reload the currently active tab
 */
function reloadCurrentTab() {
    const activeTab = localStorage.getItem('classPlanActiveTab') || 'level2';
    if (activeTab === 'level1') {
        loadLevel1Plans();
    } else if (activeTab === 'level2') {
        loadLevel2Plans();
    } else if (activeTab === 'history') {
        loadHistoryPlans();
    }
}

/**
 * Handle date selection
 */
function handleDateSelected(date) {
    // Date is already set by the date picker
    console.log('Date selected:', date);
}

/**
 * Load block settings from Firestore
 */
async function loadBlockSettings() {
    try {
        const settingsDoc = await window.db.collection('settings').doc('classPlans').get();
        
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            currentBlockSize = settings.blockSize || 12;
        } else {
            // Create default settings
            currentBlockSize = 12;
            await window.db.collection('settings').doc('classPlans').set({
                blockSize: currentBlockSize,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Update UI
        document.getElementById('block-size-input').value = currentBlockSize;
        
        // Calculate next week number
        await updateNextWeekInfo();
    } catch (error) {
        console.error('Error loading block settings:', error);
        showSnackbar('Error loading block settings: ' + error.message, 'error');
    }
}

/**
 * Save block size to Firestore
 */
async function saveBlockSize() {
    const input = document.getElementById('block-size-input');
    const newBlockSize = parseInt(input.value);
    
    if (isNaN(newBlockSize) || newBlockSize < 1 || newBlockSize > 52) {
        showSnackbar('Please enter a valid block size between 1 and 52', 'error');
        return;
    }
    
    showLoadingSpinner('Saving block size...');
    
    try {
        await window.db.collection('settings').doc('classPlans').set({
            blockSize: newBlockSize,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        currentBlockSize = newBlockSize;
        await updateNextWeekInfo();
        
        showSnackbar('Block size updated successfully', 'success');
    } catch (error) {
        console.error('Error saving block size:', error);
        showSnackbar('Error saving block size: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Calculate and update the next week number info
 */
async function updateNextWeekInfo() {
    try {
        // Get all class plans with the current block size
        const snapshot = await window.db.collection('classPlans')
            .where('blockSize', '==', currentBlockSize)
            .get();
        
        const count = snapshot.size;
        nextWeekNumber = (count % currentBlockSize) + 1;
    } catch (error) {
        console.error('Error calculating next week number:', error);
        // Default to week 1 if there's an error
        nextWeekNumber = 1;
    }
}

/**
 * Open the add/edit modal
 */
function openModal(planData = null) {
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('class-plan-form');
    const weekInfoBanner = document.getElementById('week-info-banner');
    const weekInfoText = document.getElementById('week-info-text');
    
    // Reset form
    form.reset();
    editingPlanId = null;
    
    if (planData) {
        // Editing existing plan
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Class Plan';
        editingPlanId = planData.id;
        
        // Show week info as read-only
        if (planData.weekNumber && planData.blockSize) {
            weekInfoText.textContent = `Week ${planData.weekNumber} of ${planData.blockSize}`;
            weekInfoBanner.style.display = 'flex';
        } else {
            weekInfoBanner.style.display = 'none';
        }
        
        // Populate form
        document.getElementById('class-date').value = formatDateForDisplay(planData.date);
        datePicker.selectedDate = planData.date;
        
        document.getElementById('move-1').value = planData.move1 || '';
        document.getElementById('move-2').value = planData.move2 || '';
        document.getElementById('move-3').value = planData.move3 || '';
        document.getElementById('notes').value = planData.notes || '';
    } else {
        // Adding new plan - show next week number
        modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add Class Plan';
        weekInfoText.textContent = `Week ${nextWeekNumber} of ${currentBlockSize}`;
        weekInfoBanner.style.display = 'flex';
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
            // Update existing plan (don't update weekNumber or blockSize)
            await window.db.collection('classPlans').doc(editingPlanId).update(planData);
            showSnackbar('Class plan updated successfully', 'success');
        } else {
            // Create new plan - add week number, block size, and class level
            planData.classLevel = 'level2';  // New Level 2 class
            planData.cycleWeek = null;       // Not used for Level 2
            planData.weekNumber = nextWeekNumber;
            planData.blockSize = currentBlockSize;
            planData.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
            planData.createdBy = currentUser.uid;
            await window.db.collection('classPlans').add(planData);
            showSnackbar('Class plan created successfully', 'success');
            
            // Recalculate next week number
            await updateNextWeekInfo();
        }
        
        closeModal();
        reloadCurrentTab();
    } catch (error) {
        console.error('Error saving class plan:', error);
        showSnackbar('Error saving class plan: ' + error.message, 'error');
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
    
    // Build week number display
    let weekHTML = '';
    if (planData.weekNumber && planData.blockSize) {
        const weekClass = Number(planData.weekNumber) === 1 ? 'class-plan-week week-one' : 'class-plan-week';
        weekHTML = `<div class="${weekClass}">Week ${planData.weekNumber} of ${planData.blockSize}</div>`;
    }
    
    card.innerHTML = `
        <div class="class-plan-card-header">
            <div class="class-plan-date">
                ${weekHTML}
                <div class="class-plan-date-main">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>${formattedDate}</h3>
                </div>
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
        reloadCurrentTab();
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
