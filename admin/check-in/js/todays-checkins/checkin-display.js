/**
 * checkin-display.js - Display and render check-ins list UI
 */

import { getTodaysCheckins } from './checkin-loader.js';
import { getShowReversedCheckins } from './checkin-filters.js';

/**
 * Display today's check-ins list
 */
export function displayTodaysCheckins() {
    const checkinsList = document.getElementById('checkins-list');
    const emptyState = document.getElementById('empty-state');
    const todaysCheckins = getTodaysCheckins();
    const showReversedCheckins = getShowReversedCheckins();
    
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
        } else if (checkin.entryType === 'casual-student') {
            typeClass = 'casual-student';
            typeLabel = 'Casual Student';
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
        
        // Delete button (only if it exists)
        const deleteBtn = item.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDeleteCheckin(checkinId);
            });
        }
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
        openCheckinModalWithData(student, checkinData, checkinId);
        
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
        window.loadTodaysCheckins();
    }, null, null, selectedDate);
}

/**
 * Show delete confirmation modal for check-in
 */
function confirmDeleteCheckin(checkinId) {
    // Import dynamically to avoid circular dependencies
    import('/components/modals/confirmation-modal.js').then(({ ConfirmationModal }) => {
        const todaysCheckins = getTodaysCheckins();
        // Find the check-in to get student name
        const checkin = todaysCheckins.find(c => c.id === checkinId);
        const studentName = checkin ? checkin.studentName : 'Unknown Student';
        
        // Create and show delete confirmation modal
        const deleteModal = new ConfirmationModal({
            title: 'Delete Check-In',
            message: `
                <p>Are you sure you want to delete this check-in?</p>
                <div class="student-info-delete">
                    <strong>${escapeHtml(studentName)}</strong>
                </div>
                <p class="text-muted" style="margin-top: 15px;">This action cannot be undone.</p>
            `,
            icon: 'fas fa-trash',
            variant: 'danger',
            confirmText: 'Delete Check-In',
            confirmClass: 'btn-delete',
            cancelText: 'Cancel',
            cancelClass: 'btn-cancel',
            onConfirm: async () => {
                await deleteCheckin(checkinId);
            }
        });
        
        deleteModal.show();
    });
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
        
        // If this check-in used an online transaction, un-link it
        if (checkinData.onlineTransactionId) {
            try {
                const transactionDoc = await firebase.firestore()
                    .collection('transactions')
                    .doc(checkinData.onlineTransactionId)
                    .get();
                
                if (transactionDoc.exists) {
                    const transactionData = transactionDoc.data();
                    const updateData = {
                        usedForCheckin: false,
                        checkinId: firebase.firestore.FieldValue.delete()
                    };
                    
                    // Restore original classDate if it exists
                    if (transactionData.originalClassDate) {
                        updateData.classDate = transactionData.originalClassDate;
                        updateData.originalClassDate = firebase.firestore.FieldValue.delete();
                    }
                    
                    await firebase.firestore()
                        .collection('transactions')
                        .doc(checkinData.onlineTransactionId)
                        .update(updateData);
                }
            } catch (transactionError) {
                console.error('Error un-linking online transaction:', transactionError);
                // Continue with reversal even if transaction un-linking fails
            }
        }
        // If this check-in had an in-person payment, reverse the transaction
        else if (checkinData.amountPaid > 0) {
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
        window.loadTodaysCheckins();
        
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
