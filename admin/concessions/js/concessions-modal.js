/**
 * concessions-modal.js - Reusable Purchase Concessions Modal
 * Can be used from any page in the admin portal
 */

let purchaseModalStudentId = null;
let purchaseModalCallback = null;
let purchaseModalParentModal = null;
let purchaseModalParentStudent = null; // Store student object for restoration

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
                <input type="date" id="purchase-date-picker" class="purchase-date-picker" title="Purchase date (defaults to today)">
                <button class="modal-close" onclick="closePurchaseConcessionsModal()">&times;</button>
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
                <button type="button" class="btn-secondary" onclick="closePurchaseConcessionsModal()">Cancel</button>
                <button type="button" class="btn-primary" id="confirm-purchase-concessions-btn" disabled>
                    <i class="fas fa-check"></i> Complete Purchase
                </button>
            </div>
        </div>
    </div>`;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize event listeners
    setupPurchaseModalListeners();
}

/**
 * Open purchase modal
 * @param {string} studentId - Optional student ID to pre-fill
 * @param {function} callback - Optional callback after successful purchase
 * @param {string} parentModalId - Optional parent modal ID to return to on cancel
 * @param {object} parentStudent - Optional student object to restore when canceling
 */
async function openPurchaseConcessionsModal(studentId = null, callback = null, parentModalId = null, parentStudent = null) {
    purchaseModalStudentId = studentId;
    purchaseModalCallback = callback;
    purchaseModalParentModal = parentModalId;
    purchaseModalParentStudent = parentStudent;
    
    const modal = document.getElementById('purchase-concessions-modal');
    
    // Set default date to today
    const datePicker = document.getElementById('purchase-date-picker');
    const today = new Date();
    datePicker.value = today.toISOString().split('T')[0];
    datePicker.max = today.toISOString().split('T')[0]; // Prevent future dates
    
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
    const datePicker = document.getElementById('purchase-date-picker');
    
    // Date picker validation
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
            datePicker.title = 'Purchase date (defaults to today)';
        }
    });
    
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
    const purchaseDate = document.getElementById('purchase-date-picker').value;
    
    if (!packageId || !paymentMethod) {
        showError('Please select package and payment method');
        return;
    }
    
    if (!purchaseModalStudentId) {
        showError('No student selected');
        return;
    }
    
    if (!purchaseDate) {
        showError('Please select a purchase date');
        return;
    }
    
    try {
        showLoading();
        
        // Complete purchase in Firestore
        const result = await completeConcessionPurchase(
            purchaseModalStudentId,
            packageId,
            paymentMethod,
            new Date(purchaseDate) // Pass the selected date
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
