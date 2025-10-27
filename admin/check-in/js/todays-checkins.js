/**
 * todays-checkins.js - Manages today's check-ins list display
 */

let todaysCheckins = [];
let showReversedCheckins = false;

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
        
        // Convert to array and check for reversed transactions
        const checkinPromises = snapshot.docs.map(async doc => {
            const data = doc.data();
            
            // Check if this check-in has a reversed transaction
            let hasReversedTransaction = false;
            if (data.amountPaid > 0) {
                try {
                    const transactionSnapshot = await firebase.firestore()
                        .collection('transactions')
                        .where('checkinId', '==', doc.id)
                        .get();
                    
                    if (!transactionSnapshot.empty) {
                        const transactionData = transactionSnapshot.docs[0].data();
                        hasReversedTransaction = transactionData.reversed || false;
                    }
                } catch (error) {
                    console.error('Error checking transaction status:', error);
                }
            }
            
            return {
                id: doc.id,
                studentId: data.studentId,
                studentName: data.studentName,
                timestamp: data.checkinDate.toDate(),
                entryType: data.entryType,
                paymentMethod: data.paymentMethod,
                freeEntryReason: data.freeEntryReason,
                balance: 0, // TODO: Get actual balance from student or concessionBlocks
                notes: data.notes,
                reversed: data.reversed || false, // Include reversed status
                hasReversedTransaction: hasReversedTransaction
            };
        });
        
        todaysCheckins = await Promise.all(checkinPromises);
        
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
    displayTodaysCheckins(); // This will update the counts
    
    // Reload transactions to include the new one
    if (typeof loadCheckinTransactions === 'function') {
        loadCheckinTransactions();
    }
}

/**
 * Display today's check-ins list
 */
function displayTodaysCheckins() {
    const checkinsList = document.getElementById('checkins-list');
    const emptyState = document.getElementById('empty-state');
    
    // Filter based on toggle state
    const checkinsToDisplay = showReversedCheckins 
        ? todaysCheckins 
        : todaysCheckins.filter(c => !c.reversed);
    
    if (checkinsToDisplay.length === 0) {
        emptyState.style.display = 'block';
        checkinsList.style.display = 'none';
        updateCheckinCount(0, 0);
        return;
    }
    
    emptyState.style.display = 'none';
    checkinsList.style.display = 'block';
    
    // Determine if delete button should be shown
    // Super admin can always delete, front desk can only delete today's check-ins
    const canDelete = isSuperAdmin() || (typeof isSelectedDateToday === 'function' && isSelectedDateToday());
    
    checkinsList.innerHTML = checkinsToDisplay.map(checkin => {
        // Determine badge type and label
        let typeClass, typeLabel;
        if (checkin.entryType === 'concession') {
            typeClass = 'concession';
            typeLabel = 'Concession';
        } else if (checkin.entryType === 'casual') {
            typeClass = 'casual';
            typeLabel = 'Casual Entry';
        } else if (checkin.entryType === 'free' && checkin.freeEntryReason === 'crew-member') {
            typeClass = 'crew';
            typeLabel = 'Crew';
        } else {
            typeClass = 'free';
            typeLabel = 'Free Entry';
        }
        
        // Add reversed class if check-in is reversed
        const reversedClass = checkin.reversed ? 'reversed-checkin' : '';
        
        return `<div class="checkin-item ${reversedClass}" data-checkin-id="${checkin.id}" data-student-id="${checkin.studentId}">
            <div class="checkin-info-row" data-action="edit">
                <span class="checkin-name">${escapeHtml(checkin.studentName)}</span>
                ${checkin.reversed ? '<span class="reversed-badge">REVERSED</span>' : ''}
            </div>
            <div class="checkin-actions">
                <span class="checkin-type ${typeClass}">${typeLabel}</span>
                <button type="button" class="btn-icon btn-purchase" data-action="purchase" title="Purchase Concessions">
                    <i class="fas fa-shopping-cart"></i>
                </button>
                ${canDelete ? `<button type="button" class="btn-icon btn-delete" data-action="delete" title="Delete Check-In">
                    <i class="fas fa-trash-alt"></i>
                </button>` : ''}
            </div>
        </div>`;
    }).join('');
    
    // Add event listeners to check-in items
    attachCheckinEventListeners();
    
    // Calculate separate counts for students and crew
    const crewCount = checkinsToDisplay.filter(c => 
        c.entryType === 'free' && c.freeEntryReason === 'crew-member'
    ).length;
    const studentCount = checkinsToDisplay.length - crewCount;
    
    updateCheckinCount(studentCount, crewCount);
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
    
    // Get the selected check-in date
    const selectedDate = getSelectedCheckinDateString();
    
    openPurchaseConcessionsModal(studentId, (result) => {
        // Refresh check-ins after purchase
        loadTodaysCheckins();
    }, null, null, selectedDate);
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
        
        // If this check-in had a payment, reverse the transaction
        if (checkinData.amountPaid > 0) {
            try {
                await reverseTransaction(checkinId);
            } catch (transactionError) {
                console.error('Error reversing transaction:', transactionError);
                // Continue with reversal even if transaction reversal fails
            }
        }
        
        // Mark the check-in as reversed instead of deleting
        await checkinRef.update({
            reversed: true,
            reversedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSnackbar('Check-in reversed successfully', 'success');
        
        // Reload check-ins
        loadTodaysCheckins();
        
        // Reload transactions
        if (typeof loadCheckinTransactions === 'function') {
            loadCheckinTransactions();
        }
        
    } catch (error) {
        console.error('Error reversing check-in:', error);
        showSnackbar('Failed to reverse check-in', 'error');
    }
}

/**
 * Update check-in count badge
 */
function updateCheckinCount(studentCount, crewCount = 0) {
    const countElement = document.getElementById('checkin-count');
    const crewCountElement = document.getElementById('crew-count');
    
    countElement.textContent = studentCount;
    crewCountElement.textContent = crewCount;
    
    // Hide crew count badge if zero
    crewCountElement.style.display = crewCount > 0 ? 'inline-block' : 'none';
}

/**
 * Get today's check-ins (for other modules to access)
 */
function getTodaysCheckins() {
    return todaysCheckins;
}

/**
 * Toggle show reversed check-ins
 */
function toggleShowReversedCheckins(event) {
    showReversedCheckins = event.target.checked;
    displayTodaysCheckins();
    
    // Also refresh transactions display
    if (typeof refreshCheckinTransactionsDisplay === 'function') {
        refreshCheckinTransactionsDisplay();
    }
}
