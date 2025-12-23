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

let casualEntryDatePicker = null; // DatePicker instance

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
                <button class="modal-close" onclick="closeCasualEntryModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div id="casual-entry-student-info" class="student-info-card" style="margin-bottom: 20px;">
                    <h4 id="casual-entry-student-name">Student Name</h4>
                    <p id="casual-entry-student-email" class="text-muted">email@example.com</p>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-calendar"></i> Entry Date</label>
                    <div class="date-input-wrapper">
                        <input type="text" id="casual-entry-date-picker" class="form-control" readonly placeholder="Select date" title="Entry date">
                        <i class="fas fa-calendar-alt date-input-icon"></i>
                    </div>
                    <div id="casual-entry-date-calendar" class="custom-calendar" style="display: none;"></div>
                </div>

                <div class="form-group">
                    <label><i class="fas fa-credit-card"></i> Payment Method</label>
                    <select id="casual-entry-payment-select" class="form-control">
                        <option value="">Select payment method</option>
                        <option value="cash">Cash</option>
                        <option value="eftpos">EFTPOS</option>
                        <option value="bank-transfer">Bank Transfer</option>
                        <option value="online">Online</option>
                    </select>
                </div>

                <div class="purchase-summary">
                    <div class="summary-row">
                        <span>Total Amount:</span>
                        <strong id="casual-entry-amount">$15.00</strong>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closeCasualEntryModal()">Cancel</button>
                <button type="button" class="btn-primary" id="confirm-casual-entry-btn" disabled>
                    <i class="fas fa-save"></i> Update Entry
                </button>
            </div>
        </div>
    </div>`;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize custom date picker (allow backdating, prevent future dates)
    casualEntryDatePicker = new DatePicker('casual-entry-date-picker', 'casual-entry-date-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow backdating
        maxDate: new Date(), // Prevent future dates
        onDateSelected: () => {
            updateCasualEntryButton();
        }
    });
    
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
    const emailElement = document.getElementById('casual-entry-student-email');
    try {
        let student = null;
        
        // First try to find student in cached data
        if (typeof findStudentById === 'function') {
            student = findStudentById(studentId);
        }
        
        // If not found or no email, try fetching from Firestore
        if (!student || !student.email) {
            const studentDoc = await firebase.firestore()
                .collection('students')
                .doc(studentId)
                .get();
            
            if (studentDoc.exists) {
                student = studentDoc.data();
            }
        }
        
        if (student && student.email) {
            emailElement.textContent = student.email;
            emailElement.style.display = 'block';
        } else {
            emailElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching student email:', error);
        emailElement.style.display = 'none';
    }
    
    // Set date using custom DatePicker
    if (entryDate && casualEntryDatePicker) {
        casualEntryDatePicker.setDate(entryDate);
    }
    
    // Set payment method
    const paymentSelect = document.getElementById('casual-entry-payment-select');
    if (paymentMethod) {
        // Convert payment method to match the select options
        let methodValue = paymentMethod.toLowerCase().replace(/\s+/g, '-');
        // Handle 'stripe' payment method (stored in DB) -> 'online' (in dropdown)
        if (methodValue === 'stripe') {
            methodValue = 'online';
        }
        paymentSelect.value = methodValue;
    }
    
    // Set amount (display only) - use provided amount or fetch current rate
    let displayAmount = amount || 15;
    try {
        if (typeof getStandardCasualRate === 'function') {
            const rate = await getStandardCasualRate();
            if (rate && !amount) {
                displayAmount = rate.price;
            }
        }
    } catch (error) {
        console.log('Could not fetch current casual rate, using provided amount');
    }
    
    document.getElementById('casual-entry-amount').textContent = `$${displayAmount.toFixed(2)}`;
    
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
    const paymentSelect = document.getElementById('casual-entry-payment-select');
    const confirmBtn = document.getElementById('confirm-casual-entry-btn');
    
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
        
        // Parse date from d/mm/yyyy format
        const [day, month, year] = entryDate.split('/').map(Number);
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
