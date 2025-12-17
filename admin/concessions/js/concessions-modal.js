/**
 * concessions-modal.js - Reusable Purchase Concessions Modal
 * Can be used from any page in the admin portal
 */

let purchaseModalStudentId = null;
let purchaseModalCallback = null;
let purchaseModalParentModal = null;
let purchaseModalParentStudent = null; // Store student object for restoration
let purchaseDatePicker = null; // DatePicker instance

/**
 * Initialize the purchase modal HTML (call once on page load)
 */
function initializePurchaseConcessionsModal() {
    // Check if modal already exists
    if (document.getElementById('purchase-concessions-modal')) {
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
    <div id="purchase-concessions-modal" class="modal" style="display: none;">
        <div class="modal-content modal-small">
            <div class="modal-header">
                <h3><i class="fas fa-shopping-cart"></i> Purchase Concessions</h3>
                <div class="header-date-picker">
                    <div class="date-input-wrapper date-input-compact">
                        <input type="text" id="purchase-date-picker" class="purchase-date-picker" readonly placeholder="Select date" title="Purchase date">
                        <i class="fas fa-calendar-alt date-input-icon"></i>
                    </div>
                    <div id="purchase-date-calendar" class="custom-calendar" style="display: none;"></div>
                </div>
                <button class="modal-close" onclick="closePurchaseConcessionsModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div id="purchase-student-info" class="student-info-card" style="display: none; margin-bottom: 20px;">
                    <h4 id="purchase-student-name">Student Name</h4>
                    <p id="purchase-student-email">email@example.com</p>
                </div>
                
                <div class="form-group">
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fas fa-box"></i> Package</span>
                        <button type="button" class="btn-add-package" onclick="openAddConcessionModal()" title="Add new package">
                            <i class="fas fa-plus"></i> Add Package
                        </button>
                    </label>
                    <select id="purchase-package-select" class="form-control">
                        <option value="">Select a package</option>
                        <!-- Options populated dynamically -->
                    </select>
                </div>

                <div class="form-group">
                    <label><i class="fas fa-credit-card"></i> Payment Method</label>
                    <select id="purchase-payment-select" class="form-control">
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
                        <strong id="purchase-total-amount">$0.00</strong>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closePurchaseConcessionsModal()">Cancel</button>
                <button type="button" class="btn-primary" id="confirm-purchase-concessions-btn" disabled>
                    <i class="fas fa-check"></i> Complete Purchase
                </button>
            </div>
        </div>
    </div>`;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize custom date picker (allow any day, allow any date)
    purchaseDatePicker = new DatePicker('purchase-date-picker', 'purchase-date-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow backdating and future dating
        onDateSelected: () => {
            // Update button state when date changes (important for edit mode)
            updatePurchaseButton();
        }
    });
    
    // Initialize event listeners
    setupPurchaseModalListeners();
}

/**
 * Open purchase modal
 * @param {string} studentId - Optional student ID to pre-fill
 * @param {function} callback - Optional callback after successful purchase
 * @param {string} parentModalId - Optional parent modal ID to return to on cancel
 * @param {object} parentStudent - Optional student object to restore when canceling
 * @param {Date|string} defaultDate - Optional default date for purchase (defaults to today if not provided)
 */
async function openPurchaseConcessionsModal(studentId = null, callback = null, parentModalId = null, parentStudent = null, defaultDate = null) {
    purchaseModalStudentId = studentId;
    purchaseModalCallback = callback;
    purchaseModalParentModal = parentModalId;
    purchaseModalParentStudent = parentStudent;
    
    const modal = document.getElementById('purchase-concessions-modal');
    
    // Set default date using custom date picker
    const today = new Date();
    
    if (defaultDate) {
        // If defaultDate is provided, use it
        let dateToSet;
        if (defaultDate instanceof Date) {
            dateToSet = defaultDate;
        } else if (typeof defaultDate === 'string') {
            // Parse YYYY-MM-DD as local date to avoid timezone shift
            const [year, month, day] = defaultDate.split('-').map(Number);
            dateToSet = new Date(year, month - 1, day);
        }
        
        if (dateToSet && !isNaN(dateToSet.getTime())) {
            purchaseDatePicker.setDate(dateToSet);
        } else {
            // Invalid date, use today
            purchaseDatePicker.setDate(today);
        }
    } else {
        // No default date provided, use today
        purchaseDatePicker.setDate(today);
    }
    
    // Show/hide Add Package button based on admin status
    const addPackageBtn = document.querySelector('.btn-add-package');
    if (addPackageBtn) {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const isAdmin = user && user.email === 'dance@urbanswing.co.nz';
        addPackageBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    
    // Load packages and populate dropdown
    await populatePackageOptions();
    
    // Show student info if provided
    if (studentId) {
        showPurchaseStudentInfo(studentId);
    } else {
        document.getElementById('purchase-student-info').style.display = 'none';
    }
    
    // Reset form
    resetPurchaseForm();
    
    modal.style.display = 'flex';
}

/**
 * Close purchase modal
 */
function closePurchaseConcessionsModal() {
    const modal = document.getElementById('purchase-concessions-modal');
    modal.style.display = 'none';
    
    // If there's a parent modal, reopen it
    if (purchaseModalParentModal) {
        const parentModal = document.getElementById(purchaseModalParentModal);
        if (parentModal) {
            parentModal.style.display = 'flex';
            
            // Restore the selected student if provided
            if (purchaseModalParentStudent && typeof setSelectedStudent === 'function') {
                setSelectedStudent(purchaseModalParentStudent);
            }
        }
    }
    
    purchaseModalStudentId = null;
    purchaseModalCallback = null;
    purchaseModalParentModal = null;
    purchaseModalParentStudent = null;
}

/**
 * Populate package options from Firestore
 */
async function populatePackageOptions() {
    try {
        const select = document.getElementById('purchase-package-select');
        const packages = await loadConcessionPackages();
        
        // Clear existing options except first
        select.innerHTML = '<option value="">Select a package</option>';
        
        // Add package options
        packages.forEach(pkg => {
            const option = document.createElement('option');
            option.value = pkg.id;
            option.textContent = `${pkg.name} - $${pkg.price} (${pkg.expiryMonths} months)`;
            
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating package options:', error);
        throw error;
    }
}

/**
 * Show student info in modal
 */
function showPurchaseStudentInfo(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    const fullName = getStudentFullName(student);
    document.getElementById('purchase-student-name').textContent = fullName;
    document.getElementById('purchase-student-email').textContent = student.email || '';
    document.getElementById('purchase-student-info').style.display = 'block';
}

/**
 * Reset purchase form
 */
function resetPurchaseForm() {
    document.getElementById('purchase-package-select').value = '';
    document.getElementById('purchase-payment-select').value = '';
    document.getElementById('purchase-total-amount').textContent = '$0.00';
    document.getElementById('confirm-purchase-concessions-btn').disabled = true;
}

/**
 * Setup modal event listeners
 */
function setupPurchaseModalListeners() {
    const packageSelect = document.getElementById('purchase-package-select');
    const paymentSelect = document.getElementById('purchase-payment-select');
    const confirmBtn = document.getElementById('confirm-purchase-concessions-btn');
    
    // Package selection updates amount
    packageSelect.addEventListener('change', () => {
        const packageId = packageSelect.value;
        if (packageId) {
            const pkg = getConcessionPackageById(packageId);
            if (pkg) {
                document.getElementById('purchase-total-amount').textContent = `$${pkg.price.toFixed(2)}`;
            }
        } else {
            document.getElementById('purchase-total-amount').textContent = '$0.00';
        }
        updatePurchaseButton();
    });
    
    // Payment selection enables button
    paymentSelect.addEventListener('change', () => {
        updatePurchaseButton();
    });
    
    // Confirm button
    confirmBtn.addEventListener('click', handlePurchaseSubmit);
}

/**
 * Update purchase button state
 */
function updatePurchaseButton() {
    const packageSelected = document.getElementById('purchase-package-select').value !== '';
    const paymentSelected = document.getElementById('purchase-payment-select').value !== '';
    const confirmBtn = document.getElementById('confirm-purchase-concessions-btn');
    
    confirmBtn.disabled = !(packageSelected && paymentSelected);
}

/**
 * Handle purchase submission
 */
async function handlePurchaseSubmit() {
    const packageId = document.getElementById('purchase-package-select').value;
    const paymentMethod = document.getElementById('purchase-payment-select').value;
    const parsedDate = purchaseDatePicker.getSelectedDate();
    
    if (!packageId || !paymentMethod) {
        showError('Please select package and payment method');
        return;
    }
    
    if (!purchaseModalStudentId) {
        showError('No student selected');
        return;
    }
    
    if (!parsedDate) {
        showError('Please select a purchase date');
        return;
    }
    
    try {
        showLoading();
        
        // Validate the date
        if (isNaN(parsedDate.getTime())) {
            showError('Invalid purchase date selected');
            return;
        }
        
        console.log('Purchase date:', parsedDate);
        
        // Complete purchase in Firestore
        const result = await completeConcessionPurchase(
            purchaseModalStudentId,
            packageId,
            paymentMethod,
            parsedDate
        );
        
        showLoading(false);
        
        // Call callback FIRST (to refresh concession info while data is fresh)
        if (purchaseModalCallback && typeof purchaseModalCallback === 'function') {
            // Wait for callback to complete (in case it's async)
            await Promise.resolve(purchaseModalCallback(result));
            // Add small delay to ensure UI updates before modal switches
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Close modal and reopen parent
        closePurchaseConcessionsModal();
        
        // Show success message with snackbar
        if (typeof showSnackbar === 'function') {
            showSnackbar(`Purchase successful! ${result.package.name} added to student's account.`, 'success');
        } else {
            alert(`Purchase successful! ${result.package.name} added to student's account.`);
        }
        
    } catch (error) {
        showLoading(false);
        console.error('Purchase error:', error);
        showError('Failed to complete purchase: ' + error.message);
    }
}

/**
 * Close modal when clicking outside
 */
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('purchase-concessions-modal');
        if (modal && e.target === modal) {
            closePurchaseConcessionsModal();
        }
    });
});
