/**
 * membership-assignment-modal.js - Admin Membership Assignment Modal
 * Used by admins to assign memberships to students (cash, bank transfer, EFTPOS, online, comp)
 */

let membershipModalStudentId = null;
let membershipModalCallback = null;
let membershipModalParentModal = null;
let membershipModalParentStudent = null;
let membershipDatePicker = null; // DatePicker instance

/**
 * Initialize the membership assignment modal HTML (call once on page load)
 */
function initializeMembershipAssignmentModal() {
    // Check if modal already exists
    if (document.getElementById('assign-membership-modal')) {
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
    <div id="assign-membership-modal" class="modal" style="display: none;">
        <div class="modal-content modal-small">
            <div class="modal-header">
                <h3><i class="fas fa-id-card"></i> Assign Membership</h3>
                <div class="header-date-picker">
                    <div class="date-input-wrapper date-input-compact">
                        <input type="text" id="membership-start-date-picker" class="membership-date-picker" readonly placeholder="Start date" title="Membership start date">
                        <i class="fas fa-calendar-alt date-input-icon"></i>
                    </div>
                    <div id="membership-start-date-calendar" class="custom-calendar" style="display: none;"></div>
                </div>
                <button class="modal-close" onclick="closeMembershipAssignmentModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div id="membership-student-info" class="student-info-card" style="display: none; margin-bottom: 20px;">
                    <h4 id="membership-student-name">Student Name</h4>
                    <p id="membership-student-email">email@example.com</p>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-id-card"></i> Membership Type</label>
                    <select id="membership-type-select" class="form-control">
                        <option value="">Select a membership type</option>
                        <!-- Options populated dynamically -->
                    </select>
                </div>

                <div class="form-group">
                    <label><i class="fas fa-credit-card"></i> Payment Method</label>
                    <select id="membership-payment-select" class="form-control">
                        <option value="">Select payment method</option>
                        <option value="cash">Cash</option>
                        <option value="eftpos">EFTPOS</option>
                        <option value="bank-transfer">Bank Transfer</option>
                        <option value="comp">Complimentary</option>
                    </select>
                </div>

                <div class="form-group">
                    <label><i class="fas fa-sticky-note"></i> Admin Notes (Optional)</label>
                    <textarea id="membership-notes" class="form-control" rows="3" placeholder="Add notes about this membership assignment..."></textarea>
                </div>

                <div class="membership-summary">
                    <div class="summary-row">
                        <span>Total Amount:</span>
                        <strong id="membership-total-amount">$0.00</strong>
                    </div>
                    <div class="summary-row" id="membership-expiry-preview" style="display: none;">
                        <span>Valid Until:</span>
                        <strong id="membership-expiry-date">-</strong>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closeMembershipAssignmentModal()">Cancel</button>
                <button type="button" class="btn-primary" id="confirm-membership-assignment-btn" disabled>
                    <i class="fas fa-check"></i> Assign Membership
                </button>
            </div>
        </div>
    </div>`;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize custom date picker (allow any day, allow any date)
    membershipDatePicker = new DatePicker('membership-start-date-picker', 'membership-start-date-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow backdating and future dating
        ignoreClosedown: true, // Admin can select any date
        showTime: false,
        onDateSelected: () => {
            updateMembershipButton();
            updateExpiryPreview();
        }
    });
    
    // Initialize event listeners
    setupMembershipModalListeners();
}

/**
 * Open membership assignment modal
 * @param {string} studentId - Optional student ID to pre-fill
 * @param {function} callback - Optional callback after successful assignment
 * @param {string} parentModalId - Optional parent modal ID to return to on cancel
 * @param {object} parentStudent - Optional student object to restore when canceling
 * @param {Date|string} defaultDate - Optional default date for start (defaults to today if not provided)
 */
async function openMembershipAssignmentModal(studentId = null, callback = null, parentModalId = null, parentStudent = null, defaultDate = null) {
    const modal = document.getElementById('assign-membership-modal');
    if (!modal) return;
    
    // Store state
    membershipModalStudentId = studentId;
    membershipModalCallback = callback;
    membershipModalParentModal = parentModalId;
    membershipModalParentStudent = parentStudent;
    
    // Set default start date
    const today = new Date();
    if (defaultDate) {
        let dateToSet;
        if (typeof defaultDate === 'string') {
            dateToSet = parseDateString(defaultDate);
        } else if (defaultDate instanceof Date) {
            dateToSet = defaultDate;
        }
        
        if (dateToSet && !isNaN(dateToSet.getTime())) {
            membershipDatePicker.setDate(dateToSet);
        } else {
            membershipDatePicker.setDate(today);
        }
    } else {
        membershipDatePicker.setDate(today);
    }
    
    // Reset form first (before populating options)
    resetMembershipForm();
    
    // Load membership types and populate dropdown
    await populateMembershipTypeOptions();
    
    // Show student info if provided
    if (studentId) {
        await showMembershipStudentInfo(studentId);
    } else {
        document.getElementById('membership-student-info').style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

/**
 * Close membership assignment modal
 */
function closeMembershipAssignmentModal() {
    const modal = document.getElementById('assign-membership-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // If there's a parent modal to return to, restore it
    if (membershipModalParentModal) {
        const parentModal = document.getElementById(membershipModalParentModal);
        if (parentModal) {
            parentModal.style.display = 'flex';
            
            // Don't restore parent student state here - let the callback handle fresh data
            // The callback will fetch fresh student data and update the display
        }
    }
    
    // Clear state
    membershipModalStudentId = null;
    membershipModalCallback = null;
    membershipModalParentModal = null;
    membershipModalParentStudent = null;
}

/**
 * Populate membership type options from Firestore
 */
async function populateMembershipTypeOptions() {
    const select = document.getElementById('membership-type-select');
    if (!select) return;
    
    try {
        // Fetch all membership types and filter in JavaScript to avoid composite index requirement
        const snapshot = await firebase.firestore()
            .collection('membershipTypes')
            .get();
        
        // Clear existing options except placeholder
        select.innerHTML = '<option value="">Select a membership type</option>';
        
        // Filter and sort in JavaScript
        const membershipTypes = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include active membership types (isActive !== false)
            if (data.isActive !== false) {
                membershipTypes.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        // Sort by displayOrder
        membershipTypes.sort((a, b) => {
            const orderA = a.displayOrder || 0;
            const orderB = b.displayOrder || 0;
            return orderA - orderB;
        });
        
        // Populate dropdown
        membershipTypes.forEach(membershipType => {
            const option = document.createElement('option');
            option.value = membershipType.id;
            option.textContent = `${membershipType.name} - $${membershipType.price.toFixed(2)}`;
            option.dataset.price = membershipType.price;
            select.appendChild(option);
        });
        
        if (membershipTypes.length === 0) {
            select.innerHTML = '<option value="">No membership types available</option>';
        } else if (membershipTypes.length === 1) {
            // Auto-select if only one option
            const singleType = membershipTypes[0];
            select.value = singleType.id;
            
            // Update the amount display
            document.getElementById('membership-total-amount').textContent = `$${singleType.price.toFixed(2)}`;
            
            // Trigger change event to update expiry preview and button state
            select.dispatchEvent(new Event('change'));
        }
        
    } catch (error) {
        console.error('Error loading membership types:', error);
        select.innerHTML = '<option value="">Error loading membership types</option>';
    }
}

/**
 * Show student info in modal
 */
async function showMembershipStudentInfo(studentId) {
    try {
        const doc = await firebase.firestore().collection('students').doc(studentId).get();
        
        if (!doc.exists) {
            console.error('Student not found');
            return;
        }
        
        const student = doc.data();
        const fullName = `${student.firstName} ${student.lastName}`;
        
        const studentNameEl = document.getElementById('membership-student-name');
        studentNameEl.textContent = fullName;
        
        // Add improver badge to student name if improver
        if (student.improver === true) {
            // Remove any existing badge first
            const existingBadge = studentNameEl.querySelector('.improver-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            const badge = document.createElement('span');
            badge.className = 'improver-badge';
            badge.style.marginLeft = '8px';
            badge.innerHTML = '<i class="fas fa-star"></i> IMPROVER';
            studentNameEl.appendChild(badge);
        }
        
        document.getElementById('membership-student-email').textContent = student.email || '';
        
        document.getElementById('membership-student-info').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading student info:', error);
    }
}

/**
 * Reset membership form
 */
function resetMembershipForm() {
    document.getElementById('membership-type-select').value = '';
    document.getElementById('membership-payment-select').value = '';
    document.getElementById('membership-notes').value = '';
    document.getElementById('membership-total-amount').textContent = '$0.00';
    document.getElementById('membership-expiry-preview').style.display = 'none';
    updateMembershipButton();
}

/**
 * Setup modal event listeners
 */
function setupMembershipModalListeners() {
    const typeSelect = document.getElementById('membership-type-select');
    const paymentSelect = document.getElementById('membership-payment-select');
    const confirmBtn = document.getElementById('confirm-membership-assignment-btn');
    
    // Membership type selection updates amount
    typeSelect.addEventListener('change', () => {
        const typeId = typeSelect.value;
        if (typeId) {
            const selectedOption = typeSelect.options[typeSelect.selectedIndex];
            const price = parseFloat(selectedOption.dataset.price);
            document.getElementById('membership-total-amount').textContent = `$${price.toFixed(2)}`;
            updateExpiryPreview();
        } else {
            document.getElementById('membership-total-amount').textContent = '$0.00';
            document.getElementById('membership-expiry-preview').style.display = 'none';
        }
        updateMembershipButton();
    });
    
    // Payment selection enables button
    paymentSelect.addEventListener('change', () => {
        updateMembershipButton();
    });
    
    // Confirm button
    confirmBtn.addEventListener('click', handleMembershipAssignmentSubmit);
}

/**
 * Update expiry preview
 */
function updateExpiryPreview() {
    const startDate = membershipDatePicker.getSelectedDate();
    const typeSelect = document.getElementById('membership-type-select');
    
    if (startDate && typeSelect.value) {
        // Calculate expiry (1 month from start)
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        
        // Adjust to last day of month if day doesn't exist
        if (expiryDate.getDate() < startDate.getDate()) {
            expiryDate.setDate(0); // Go to last day of previous month
        }
        
        document.getElementById('membership-expiry-date').textContent = 
            expiryDate.toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Pacific/Auckland' });
        document.getElementById('membership-expiry-preview').style.display = 'flex';
    } else {
        document.getElementById('membership-expiry-preview').style.display = 'none';
    }
}

/**
 * Update membership button state
 */
function updateMembershipButton() {
    const typeSelect = document.getElementById('membership-type-select');
    const paymentSelect = document.getElementById('membership-payment-select');
    const confirmBtn = document.getElementById('confirm-membership-assignment-btn');
    const startDate = membershipDatePicker.getSelectedDate();
    
    const isValid = typeSelect.value && paymentSelect.value && startDate && membershipModalStudentId;
    
    confirmBtn.disabled = !isValid;
}

/**
 * Handle membership assignment submission
 */
async function handleMembershipAssignmentSubmit() {
    const typeId = document.getElementById('membership-type-select').value;
    const paymentMethod = document.getElementById('membership-payment-select').value;
    const notes = document.getElementById('membership-notes').value;
    const startDate = membershipDatePicker.getSelectedDate();
    
    if (!typeId || !paymentMethod || !startDate || !membershipModalStudentId) {
        window.showSnackbar('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        window.showLoading(true);
        
        // Ensure user is authenticated
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            throw new Error('You must be signed in to assign memberships');
        }
        
        console.log('=== Admin Assign Membership Debug ===');
        console.log('Current user:', currentUser.email);
        console.log('Current user UID:', currentUser.uid);
        
        // Get fresh auth token
        const token = await currentUser.getIdToken(true);
        console.log('Auth token obtained:', token ? 'YES' : 'NO');
        
        // Ensure window.functions is available
        if (!window.functions) {
            console.error('window.functions not initialized');
            throw new Error('Cloud Functions not initialized. Please refresh the page.');
        }
        
        console.log('window.functions available:', typeof window.functions);
        console.log('Calling adminAssignMembership function...');
        console.log('Data:', {
            studentId: membershipModalStudentId,
            membershipTypeId: typeId,
            paymentMethod: paymentMethod,
            startDate: startDate.toISOString(),
            notes: notes || null
        });
        
        // Use the globally configured functions instance (properly initialized with auth context)
        const adminAssignMembership = window.functions.httpsCallable('adminAssignMembership');
        
        const result = await adminAssignMembership({
            studentId: membershipModalStudentId,
            membershipTypeId: typeId,
            paymentMethod: paymentMethod,
            startDate: startDate.toISOString(),
            notes: notes || null
        });
        
        console.log('Function result:', result);
        console.log('=== End Debug ===');
        window.showLoading(false);
        
        if (result.data.success) {
            window.showSnackbar(result.data.message, 'success');
            
            // Call callback FIRST (before closing modal) so data is refreshed
            if (membershipModalCallback) {
                await membershipModalCallback(result.data);
            }
            
            // Then close modal - this will show the parent modal with fresh data
            closeMembershipAssignmentModal();
        } else {
            window.showSnackbar(`Failed to assign membership: ${result.data.message}`, 'error');
        }
        
    } catch (error) {
        window.showLoading(false);
        console.error('Error assigning membership:', error);
        window.showSnackbar(`Error: ${error.message}`, 'error');
    }
}

/**
 * Parse date string (d/mm/yyyy or yyyy-mm-dd)
 */
function parseDateString(dateStr) {
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
    } else {
        return new Date(dateStr);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initializeMembershipAssignmentModal();
});

// Expose functions globally
window.openMembershipAssignmentModal = openMembershipAssignmentModal;
window.closeMembershipAssignmentModal = closeMembershipAssignmentModal;
