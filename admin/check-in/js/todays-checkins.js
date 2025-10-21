/**
 * todays-checkins.js - Manages today's check-ins list display
 */

let todaysCheckins = [];

/**
 * Load today's check-ins from Firestore
 */
async function loadTodaysCheckins() {
    try {
        // Get the selected check-in date (not today's actual date)
        const selectedDate = getSelectedCheckinDate();
        
        // Start and end of selected day
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Query Firestore for check-ins on selected date
        const snapshot = await firebase.firestore()
            .collection('checkins')
            .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
            .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
            .orderBy('checkinDate', 'desc')
            .get();
        
        // Convert to array
        todaysCheckins = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                studentId: data.studentId,
                studentName: data.studentName,
                timestamp: data.checkinDate.toDate(),
                entryType: data.entryType,
                paymentMethod: data.paymentMethod,
                freeEntryReason: data.freeEntryReason,
                balance: 0, // TODO: Get actual balance from student or concessionBlocks
                notes: data.notes
            };
        });
        
        // Sort alphabetically by first name, then last name
        todaysCheckins.sort((a, b) => {
            const nameA = a.studentName.toLowerCase();
            const nameB = b.studentName.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        displayTodaysCheckins();
        
    } catch (error) {
        console.error('Error loading check-ins:', error);
        todaysCheckins = [];
        displayTodaysCheckins();
    }
}

/**
 * Add a check-in to today's list
 */
function addCheckinToDisplay(checkin) {
    todaysCheckins.unshift(checkin); // Add to beginning of array
    displayTodaysCheckins();
    updateCheckinCount(todaysCheckins.length);
}

/**
 * Display today's check-ins list
 */
function displayTodaysCheckins() {
    const checkinsList = document.getElementById('checkins-list');
    const emptyState = document.getElementById('empty-state');
    
    if (todaysCheckins.length === 0) {
        emptyState.style.display = 'block';
        checkinsList.style.display = 'none';
        updateCheckinCount(0);
        return;
    }
    
    emptyState.style.display = 'none';
    checkinsList.style.display = 'block';
    
    checkinsList.innerHTML = todaysCheckins.map(checkin => {
        const typeClass = checkin.entryType;
        const typeLabel = checkin.entryType === 'concession' ? 'Concession' : 
                         checkin.entryType === 'casual' ? 'Casual $15' : 'Free Entry';
        
        return `<div class="checkin-item" data-checkin-id="${checkin.id}" data-student-id="${checkin.studentId}">
            <div class="checkin-info-row" data-action="edit">
                <span class="checkin-name">${escapeHtml(checkin.studentName)}</span>
            </div>
            <div class="checkin-actions">
                <span class="checkin-type ${typeClass}">${typeLabel}</span>
                <button type="button" class="btn-icon btn-purchase" data-action="purchase" title="Purchase Concessions">
                    <i class="fas fa-shopping-cart"></i>
                </button>
                <button type="button" class="btn-icon btn-delete" data-action="delete" title="Delete Check-In">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>`;
    }).join('');
    
    // Add event listeners to check-in items
    attachCheckinEventListeners();
    
    updateCheckinCount(todaysCheckins.length);
}

/**
 * Attach event listeners to check-in items
 */
function attachCheckinEventListeners() {
    const checkinItems = document.querySelectorAll('.checkin-item');
    
    checkinItems.forEach(item => {
        const checkinId = item.dataset.checkinId;
        const studentId = item.dataset.studentId;
        
        // Click on info row to edit
        const infoRow = item.querySelector('[data-action="edit"]');
        infoRow.addEventListener('click', () => {
            editCheckin(checkinId, studentId);
        });
        
        // Purchase concessions button
        const purchaseBtn = item.querySelector('[data-action="purchase"]');
        purchaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            purchaseConcessions(studentId);
        });
        
        // Delete button
        const deleteBtn = item.querySelector('[data-action="delete"]');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteCheckin(checkinId);
        });
    });
}

/**
 * Edit a check-in (reopen modal with prepopulated data)
 */
async function editCheckin(checkinId, studentId) {
    try {
        // Load the check-in document from Firestore
        const doc = await firebase.firestore()
            .collection('checkins')
            .doc(checkinId)
            .get();
        
        if (!doc.exists) {
            showSnackbar('Check-in not found', 'error');
            return;
        }
        
        const checkinData = doc.data();
        
        // Find the student
        const student = findStudentById(studentId);
        if (!student) {
            showSnackbar('Student not found', 'error');
            return;
        }
        
        // Open check-in modal with prepopulated data
        openCheckinModalWithData(student, checkinData);
        
    } catch (error) {
        console.error('Error loading check-in:', error);
        showSnackbar('Failed to load check-in data', 'error');
    }
}

/**
 * Open purchase concessions modal for a student
 */
function purchaseConcessions(studentId) {
    const student = findStudentById(studentId);
    if (!student) {
        showSnackbar('Student not found', 'error');
        return;
    }
    
    openPurchaseConcessionsModal(studentId, (result) => {
        // Refresh check-ins after purchase
        loadTodaysCheckins();
    });
}

/**
 * Show delete confirmation modal for check-in
 */
function confirmDeleteCheckin(checkinId) {
    const modal = document.getElementById('delete-modal');
    const titleEl = document.getElementById('delete-modal-title');
    const messageEl = document.getElementById('delete-modal-message');
    const infoEl = document.getElementById('delete-modal-info');
    const btnTextEl = document.getElementById('delete-modal-btn-text');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    // Customize modal for check-in deletion
    titleEl.textContent = 'Delete Check-In';
    messageEl.textContent = 'Are you sure you want to delete this check-in?';
    infoEl.innerHTML = ''; // No additional info needed
    btnTextEl.textContent = 'Delete Check-In';
    
    // Remove any existing event listeners by replacing the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add click handler for confirm button
    newConfirmBtn.addEventListener('click', () => {
        deleteCheckin(checkinId);
        closeDeleteModal();
    });
    
    modal.style.display = 'flex';
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'none';
}

/**
 * Delete a check-in
 */
async function deleteCheckin(checkinId) {
    try {
        const checkinRef = firebase.firestore().collection('checkins').doc(checkinId);
        const checkinDoc = await checkinRef.get();
        
        if (!checkinDoc.exists) {
            showSnackbar('Check-in not found', 'error');
            return;
        }
        
        const checkinData = checkinDoc.data();
        
        // If this was a concession check-in, restore the entry
        if (checkinData.entryType === 'concession' && checkinData.concessionBlockId) {
            await restoreBlockEntry(checkinData.concessionBlockId);
        }
        
        // Delete the check-in
        await checkinRef.delete();
        
        showSnackbar('Check-in deleted successfully', 'success');
        
        // Reload check-ins
        loadTodaysCheckins();
        
    } catch (error) {
        console.error('Error deleting check-in:', error);
        showSnackbar('Failed to delete check-in', 'error');
    }
}

/**
 * Update check-in count badge
 */
function updateCheckinCount(count) {
    const countElement = document.getElementById('checkin-count');
    countElement.textContent = count;
}

/**
 * Get today's check-ins (for other modules to access)
 */
function getTodaysCheckins() {
    return todaysCheckins;
}
