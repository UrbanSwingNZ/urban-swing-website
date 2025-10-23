/**
 * casual-entry-modal.js - Reusable Edit Casual Entry Modal
 * Can be used from any page in the admin portal (Student Database, Transactions, etc.)
 */

let casualEntryModalData = {
    transactionId: null,
    checkinId: null,
    studentId: null,
    studentName: null,
    callback: null,
    parentModalId: null
};

/**
 * Initialize the casual entry edit modal HTML (call once on page load)
 */
function initializeCasualEntryModal() {
    // Check if modal already exists
    if (document.getElementById('edit-casual-entry-modal')) {
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
    <div id="edit-casual-entry-modal" class="modal" style="display: none;">
        <div class="modal-content modal-small">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Edit Casual Entry</h3>
                <button class="modal-close" onclick="closeCasualEntryModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="casual-entry-student-info" class="student-info-card" style="margin-bottom: 20px;">
                    <h4 id="casual-entry-student-name">Student Name</h4>
                    <p id="casual-entry-student-email" class="text-muted">email@example.com</p>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-calendar"></i> Entry Date</label>
                    <input type="date" id="casual-entry-date-picker" class="form-control" title="Entry date">
                </div>

                <div class="form-group">
                    <label><i class="fas fa-credit-card"></i> Payment Method</label>
                    <select id="casual-entry-payment-select" class="form-control">
                        <option value="">Select payment method</option>
                        <option value="cash">Cash</option>
                        <option value="eftpos">EFTPOS</option>
                        <option value="bank-transfer">Bank Transfer</option>
                    </select>
                </div>

                <div class="form-group">
                    <label><i class="fas fa-dollar-sign"></i> Amount</label>
                    <div class="casual-entry-amount-display">
                        <span id="casual-entry-amount">$15.00</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeCasualEntryModal()">Cancel</button>
                <button type="button" class="btn-primary" id="confirm-casual-entry-btn" disabled>
                    <i class="fas fa-save"></i> Update Entry
                </button>
            </div>
        </div>
    </div>`;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize event listeners
    setupCasualEntryModalListeners();
}

/**
 * Open casual entry edit modal
 * @param {string} transactionId - Transaction document ID
 * @param {string} checkinId - Check-in document ID
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student full name
 * @param {Date} entryDate - Entry date
 * @param {string} paymentMethod - Payment method
 * @param {number} amount - Amount paid
 * @param {function} callback - Optional callback after successful update
 * @param {string} parentModalId - Optional parent modal ID to return to on cancel
 */
async function openCasualEntryModal(transactionId, checkinId, studentId, studentName, entryDate, paymentMethod, amount, callback = null, parentModalId = null) {
    // Store modal data
    casualEntryModalData = {
        transactionId,
        checkinId,
        studentId,
        studentName,
        callback,
        parentModalId
    };
    
    const modal = document.getElementById('edit-casual-entry-modal');
    
    // Set student info
    document.getElementById('casual-entry-student-name').textContent = studentName;
    
    // Try to get student email if available
    try {
        if (typeof findStudentById === 'function') {
            const student = findStudentById(studentId);
            if (student && student.email) {
                document.getElementById('casual-entry-student-email').textContent = student.email;
                document.getElementById('casual-entry-student-email').style.display = 'block';
            } else {
                document.getElementById('casual-entry-student-email').style.display = 'none';
            }
        }
    } catch (error) {
        document.getElementById('casual-entry-student-email').style.display = 'none';
    }
    
    // Set date
    const datePicker = document.getElementById('casual-entry-date-picker');
    if (entryDate) {
        const dateStr = entryDate.toISOString().split('T')[0];
        datePicker.value = dateStr;
        datePicker.max = new Date().toISOString().split('T')[0]; // Prevent future dates
    }
    
    // Set payment method
    const paymentSelect = document.getElementById('casual-entry-payment-select');
    if (paymentMethod) {
        // Convert payment method to match the select options
        const methodValue = paymentMethod.toLowerCase().replace(/\s+/g, '-');
        paymentSelect.value = methodValue;
    }
    
    // Set amount (display only)
    document.getElementById('casual-entry-amount').textContent = `$${(amount || 15).toFixed(2)}`;
    
    // Enable button if all fields are filled
    updateCasualEntryButton();
    
    modal.style.display = 'flex';
}

/**
 * Close casual entry edit modal
 */
function closeCasualEntryModal() {
    const modal = document.getElementById('edit-casual-entry-modal');
    modal.style.display = 'none';
    
    // If there's a parent modal, reopen it
    if (casualEntryModalData.parentModalId) {
        const parentModal = document.getElementById(casualEntryModalData.parentModalId);
        if (parentModal) {
            parentModal.style.display = 'flex';
        }
    }
    
    // Reset modal data
    casualEntryModalData = {
        transactionId: null,
        checkinId: null,
        studentId: null,
        studentName: null,
        callback: null,
        parentModalId: null
    };
}

/**
 * Setup modal event listeners
 */
function setupCasualEntryModalListeners() {
    const datePicker = document.getElementById('casual-entry-date-picker');
    const paymentSelect = document.getElementById('casual-entry-payment-select');
    const confirmBtn = document.getElementById('confirm-casual-entry-btn');
    
    // Date picker validation (similar to purchase modal)
    datePicker.addEventListener('change', () => {
        const selectedDate = new Date(datePicker.value);
        const today = new Date();
        const daysDiff = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));
        
        // Warn if backdating more than 30 days
        if (daysDiff > 30) {
            datePicker.style.borderColor = 'var(--warning-color, #ff9800)';
            datePicker.title = `Warning: Backdating by ${daysDiff} days`;
        } else if (daysDiff > 0) {
            datePicker.style.borderColor = 'var(--info-color, #2196F3)';
            datePicker.title = `Backdating by ${daysDiff} day${daysDiff === 1 ? '' : 's'}`;
        } else {
            datePicker.style.borderColor = '';
            datePicker.title = 'Entry date';
        }
        
        updateCasualEntryButton();
    });
    
    // Payment selection enables button
    paymentSelect.addEventListener('change', () => {
        updateCasualEntryButton();
    });
    
    // Confirm button
    confirmBtn.addEventListener('click', handleCasualEntryUpdate);
}

/**
 * Update button state
 */
function updateCasualEntryButton() {
    const dateSelected = document.getElementById('casual-entry-date-picker').value !== '';
    const paymentSelected = document.getElementById('casual-entry-payment-select').value !== '';
    const confirmBtn = document.getElementById('confirm-casual-entry-btn');
    
    confirmBtn.disabled = !(dateSelected && paymentSelected);
}

/**
 * Handle casual entry update
 */
async function handleCasualEntryUpdate() {
    const entryDate = document.getElementById('casual-entry-date-picker').value;
    const paymentMethod = document.getElementById('casual-entry-payment-select').value;
    
    if (!entryDate || !paymentMethod) {
        if (typeof showSnackbar === 'function') {
            showSnackbar('Please fill in all fields', 'error');
        }
        return;
    }
    
    if (!casualEntryModalData.transactionId || !casualEntryModalData.checkinId) {
        if (typeof showSnackbar === 'function') {
            showSnackbar('Missing transaction or check-in data', 'error');
        }
        return;
    }
    
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        // Parse date
        const [year, month, day] = entryDate.split('-').map(Number);
        const parsedDate = new Date(year, month - 1, day, 12, 0, 0);
        
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date selected');
        }
        
        // Update the transaction in Firestore
        await firebase.firestore()
            .collection('transactions')
            .doc(casualEntryModalData.transactionId)
            .update({
                transactionDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                paymentMethod: paymentMethod,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Update the associated check-in record
        await firebase.firestore()
            .collection('checkins')
            .doc(casualEntryModalData.checkinId)
            .update({
                checkinDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                paymentMethod: paymentMethod,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        
        if (typeof showSnackbar === 'function') {
            showSnackbar('Casual entry updated successfully', 'success');
        }
        
        // Call callback if provided
        if (casualEntryModalData.callback && typeof casualEntryModalData.callback === 'function') {
            await Promise.resolve(casualEntryModalData.callback({
                success: true,
                transactionId: casualEntryModalData.transactionId,
                checkinId: casualEntryModalData.checkinId
            }));
        }
        
        // Close modal and reopen parent if applicable
        const parentModalId = casualEntryModalData.parentModalId;
        closeCasualEntryModal();
        
        if (parentModalId) {
            const parentModal = document.getElementById(parentModalId);
            if (parentModal) {
                parentModal.style.display = 'flex';
            }
        }
        
    } catch (error) {
        console.error('Error updating casual entry:', error);
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error updating casual entry: ' + error.message, 'error');
        }
    }
}

/**
 * Close modal when clicking outside
 */
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('edit-casual-entry-modal');
        if (modal && e.target === modal) {
            closeCasualEntryModal();
        }
    });
});
