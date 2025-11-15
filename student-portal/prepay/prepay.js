/**
 * Pre-Pay for Class Page (Refactored)
 * Handles casual entry payment processing
 */

// Services
let paymentService = null;
let rateService = null;
let validationService = null;

// Date picker instance
let datePicker = null;

// Current state
let currentStudentId = null;

/**
 * Page Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Pre-pay page DOM loaded');
    initializePage();
    
    // Setup custom calendar using the reusable DatePicker component
    datePicker = new DatePicker('class-date', 'custom-calendar', {
        allowedDays: [4], // Thursday only
        disablePastDates: true,
        onDateSelected: async (date, formattedDate) => {
            console.log('Date selected:', date);
            await handleDateSelection(date);
        }
    });
});

/**
 * Listen for student selection changes (from admin dropdown)
 */
window.addEventListener('studentSelected', async (event) => {
    const student = event.detail;
    
    if (student) {
        await loadPrepayPage(student.id);
    }
});

/**
 * Initialize the page
 */
async function initializePage() {
    try {
        // Wait for auth to be ready
        await waitForAuth();
        
        // Show main container
        document.getElementById('main-container').style.display = 'block';
        
        // Get the student ID to load
        currentStudentId = await getActiveStudentId();
        
        if (!currentStudentId) {
            // Show empty state (admin only - no student selected)
            document.getElementById('empty-state').style.display = 'block';
            return;
        }
        
        // Load prepay page for the student
        await loadPrepayPage(currentStudentId);
        
    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Error loading page. Please try refreshing.');
    }
}

/**
 * Load prepay page for a specific student
 */
async function loadPrepayPage(studentId) {
    currentStudentId = studentId;
    
    // Show content
    document.getElementById('prepay-content').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    
    // Initialize services
    initializeServices();
    
    // Load prepaid classes
    await loadPrepaidClasses(studentId);
    
    // Load casual rates
    await loadCasualRates();
}

/**
 * Initialize all services
 */
function initializeServices() {
    // Initialize services
    paymentService = new PaymentService();
    rateService = new RateService();
    validationService = new ValidationService();
    
    // Initialize Stripe payment
    paymentService.initialize('card-element', 'card-errors');
    
    // Setup form handlers
    setupFormHandlers();
}

/**
 * Load prepaid classes for the student
 */
async function loadPrepaidClasses(studentId) {
    try {
        const db = window.db || firebase.firestore();
        
        // Query transactions for prepaid classes
        const snapshot = await db.collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Filter for future prepaid classes (casual entries that haven't happened yet)
        const today = normalizeDate(new Date());
        const prepaidClasses = [];
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Check if it's a casual transaction (not reversed) with a future class date
            if ((data.type === 'casual' || data.type === 'casual-student' || 
                 data.type === 'casual-entry') && !data.reversed) {
                
                let classDate = null;
                if (data.classDate) {
                    classDate = data.classDate.toDate();
                } else if (data.transactionDate) {
                    // Backwards compatibility
                    classDate = data.transactionDate.toDate();
                }
                
                if (classDate && normalizeDate(classDate) >= today) {
                    prepaidClasses.push({
                        id: doc.id,
                        classDate: classDate,
                        purchaseDate: data.transactionDate?.toDate() || classDate,
                        type: data.type,
                        entryType: data.entryType || data.type,
                        ...data
                    });
                }
            }
        });
        
        // Sort by class date (earliest first)
        prepaidClasses.sort((a, b) => a.classDate - b.classDate);
        
        // Display prepaid classes
        displayPrepaidClasses(prepaidClasses);
        
    } catch (error) {
        console.error('Error loading prepaid classes:', error);
        // Don't show error to user - just hide the section
        document.getElementById('prepaid-classes-section').style.display = 'none';
    }
}

/**
 * Display prepaid classes in the UI
 */
function displayPrepaidClasses(prepaidClasses) {
    const section = document.getElementById('prepaid-classes-section');
    const list = document.getElementById('prepaid-classes-list');
    
    if (!prepaidClasses || prepaidClasses.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    // Show section
    section.style.display = 'block';
    
    // Clear existing content
    list.innerHTML = '';
    
    // Create items for each prepaid class
    prepaidClasses.forEach(classItem => {
        const item = document.createElement('div');
        item.className = 'prepaid-class-item';
        
        // Ensure dates are Date objects (in case they're Firestore Timestamps)
        const classDate = classItem.classDate instanceof Date 
            ? classItem.classDate 
            : (classItem.classDate?.toDate ? classItem.classDate.toDate() : new Date(classItem.classDate));
        const purchaseDate = classItem.purchaseDate instanceof Date 
            ? classItem.purchaseDate 
            : (classItem.purchaseDate?.toDate ? classItem.purchaseDate.toDate() : new Date(classItem.purchaseDate));
        
        const day = classDate.getDate();
        const monthYear = formatMonthYear(classDate);
        const classDayFormatted = formatDateDDMMYYYY(classDate);
        const purchaseDateFormatted = formatDateDDMMYYYY(purchaseDate);
        
        // Determine entry type and badge class
        const typeInfo = getEntryTypeInfo(classItem);
        
        item.innerHTML = `
            <div class=\"prepaid-class-info\">
                <div class=\"prepaid-class-date\">
                    <div class=\"day\">${day}</div>\n                    <div class=\"month-year\">${monthYear}</div>
                </div>
                <div class=\"prepaid-class-details\">
                    <div class=\"detail-row\">
                        <span class=\"detail-label\">Class Date:</span>
                        <span class=\"detail-value\">${classDayFormatted}</span>
                    </div>
                    <div class=\"detail-row\">
                        <span class=\"detail-label\">Purchased:</span>
                        <span class=\"detail-value\">${purchaseDateFormatted}</span>
                    </div>
                </div>
            </div>
            <div class=\"prepaid-class-badge\">
                <span class=\"type-badge ${typeInfo.badgeClass}\">${typeInfo.typeName}</span>
            </div>
        `;
        
        list.appendChild(item);
    });
}

/**
 * Format date as DD/MM/YYYY (matching transaction history)
 */
function formatDateDDMMYYYY(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Get entry type information for badge styling
 */
function getEntryTypeInfo(classItem) {
    const entryType = classItem.entryType || classItem.type;
    
    if (entryType === 'casual-student') {
        return {
            typeName: 'Casual Student',
            badgeClass: 'casual-student'
        };
    } else if (entryType === 'casual' || entryType === 'casual-entry') {
        return {
            typeName: 'Casual Entry',
            badgeClass: 'casual'
        };
    } else {
        return {
            typeName: 'Casual Entry',
            badgeClass: 'casual'
        };
    }
}

/**
 * Format month and year (e.g., "Nov 2025")
 */
function formatMonthYear(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Load casual rates from Firestore
 */
async function loadCasualRates() {
    try {
        const rates = await rateService.loadRates();
        
        if (rates.length === 0) {
            showSnackbar('No entry types available at this time.', 'warning');
            return;
        }
        
        // Populate radio buttons
        populateRateOptions(rates);
        
    } catch (error) {
        console.error('Error loading casual rates:', error);
        showSnackbar('Failed to load entry types. Please try again.', 'error');
    }
}

/**
 * Populate the rate radio buttons
 */
function populateRateOptions(rates) {
    const container = document.getElementById('entry-type-options');
    
    if (rates.length === 0) {
        container.innerHTML = '<p class="loading-text">No entry types available</p>';
        return;
    }
    
    // Clear loading text
    container.innerHTML = '';
    
    // Add radio options
    rates.forEach((rate) => {
        const option = document.createElement('div');
        option.className = 'radio-option';
        
        // Check if this is the "Casual Entry" (default selection)
        const isDefault = rate.name.toLowerCase() === 'casual entry';
        if (isDefault) {
            option.classList.add('selected');
        }
        
        let optionHTML = `
            <input 
                type="radio" 
                name="entry-type" 
                id="rate-${rate.id}" 
                value="${rate.id}"
                data-rate='${JSON.stringify(rate)}'
                ${isDefault ? 'checked' : ''}
            >
            <div class="radio-content">
                <div class="radio-header">
                    <span class="radio-title">
                        ${escapeHtml(rate.name)}
                        ${rate.isPromo ? '<span class="promo-badge">PROMO</span>' : ''}
                    </span>
                    <span class="radio-price">${formatCurrency(rate.price)}</span>
                </div>
        `;
        
        if (rate.description) {
            optionHTML += `<p class="radio-description">${escapeHtml(rate.description)}</p>`;
        }
        
        // Add student ID notice for student rates
        if (rate.name.toLowerCase().includes('student')) {
            optionHTML += `
                <div class="radio-notice" style="display: none;">
                    <i class="fas fa-id-card"></i>
                    <p><strong>Note:</strong> You will be required to present a valid student ID when you arrive for class.</p>
                </div>
            `;
        }
        
        optionHTML += `</div>`;
        option.innerHTML = optionHTML;
        
        // Add click handler
        option.addEventListener('click', () => {
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            handleRateSelection();
            toggleStudentNotices();
        });
        
        container.appendChild(option);
    });
    
    // Set initial selection
    const checkedRadio = container.querySelector('input[type="radio"]:checked');
    if (checkedRadio) {
        rateService.selectRate(checkedRadio.value);
        updateSubmitButton();
    }
    
    // Add change listeners to all radio buttons
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            handleRateSelection();
            toggleStudentNotices();
        });
    });
    
    // Show notice for initially selected student rate
    toggleStudentNotices();
}

/**
 * Toggle student ID notices based on selection
 */
function toggleStudentNotices() {
    document.querySelectorAll('.radio-notice').forEach(notice => {
        const parentOption = notice.closest('.radio-option');
        const parentRadio = parentOption.querySelector('input[type="radio"]');
        
        if (parentRadio.checked) {
            notice.style.display = 'flex';
            setTimeout(() => notice.classList.add('show'), 10);
        } else {
            notice.classList.remove('show');
            setTimeout(() => notice.style.display = 'none', 300);
        }
    });
}

/**
 * Handle rate selection
 */
function handleRateSelection() {
    const selectedRadio = document.querySelector('input[name="entry-type"]:checked');
    
    if (!selectedRadio) {
        rateService.clearSelection();
        updateSubmitButton();
        return;
    }
    
    rateService.selectRate(selectedRadio.value);
    const rateData = JSON.parse(selectedRadio.dataset.rate);
    
    // Update selected styling
    document.querySelectorAll('.radio-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    selectedRadio.closest('.radio-option').classList.add('selected');
    
    // Update submit button
    updateSubmitButton();
}

/**
 * Update submit button text based on selection
 */
function updateSubmitButton() {
    const submitText = document.getElementById('submit-text');
    const selectedRate = rateService.getSelectedRate();
    
    if (selectedRate) {
        submitText.innerHTML = `Pay ${formatCurrency(selectedRate.price)}`;
    } else {
        submitText.innerHTML = 'Pay Now';
    }
}

/**
 * Handle date selection
 */
async function handleDateSelection(date) {
    if (!currentStudentId) {
        return;
    }
    
    // Validate the selected date
    const validation = await validationService.validateClassDate(date, currentStudentId);
    
    // Update UI based on validation
    validationService.updateValidationUI(
        validation.isValid,
        validation.message
    );
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
    // Form submit
    document.getElementById('prepay-form').addEventListener('submit', handleFormSubmit);
    
    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', handleCancel);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validation
    const selectedRate = rateService.getSelectedRate();
    if (!selectedRate) {
        showSnackbar('Please select an entry type.', 'error');
        return;
    }
    
    const selectedDate = datePicker.getSelectedDate();
    const classDate = document.getElementById('class-date').value;
    
    if (!classDate || !selectedDate) {
        showSnackbar('Please select a class date.', 'error');
        return;
    }
    
    // Validate the date
    const validation = await validationService.validateClassDate(selectedDate, currentStudentId);
    if (!validation.isValid) {
        showSnackbar(validation.message, 'error');
        return;
    }
    
    // Process payment
    await processPayment(selectedRate, selectedDate);
}

/**
 * Process the payment
 */
async function processPayment(rate, classDate) {
    console.log('Processing payment...');
    
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const originalText = submitText.textContent;
    
    submitBtn.disabled = true;
    submitText.textContent = 'Processing...';
    showLoading(true);
    
    try {
        if (!currentStudentId) {
            throw new Error('No student selected');
        }
        
        // Process payment through payment service
        const result = await paymentService.processCasualPayment(
            currentStudentId,
            rate.id,
            classDate
        );
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        showSnackbar('Payment successful! Your class has been pre-paid.', 'success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            navigateTo('../dashboard/index.html');
        }, 2000);
        
    } catch (error) {
        console.error('Payment error:', error);
        showSnackbar(error.message || 'Payment failed. Please try again.', 'error');
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        showLoading(false);
    }
}

/**
 * Handle cancel button
 */
function handleCancel() {
    if (checkForChanges()) {
        showCancelModal();
    } else {
        navigateTo('../dashboard/index.html');
    }
}

/**
 * Check if form has unsaved changes
 */
function checkForChanges() {
    const classDate = document.getElementById('class-date');
    return classDate.value.trim() !== '';
}

/**
 * Show cancel confirmation modal
 */
function showCancelModal() {
    const modal = document.getElementById('cancel-modal');
    modal.style.display = 'flex';
    
    document.getElementById('cancel-modal-stay').onclick = closeCancelModal;
    document.getElementById('cancel-modal-leave').onclick = () => {
        navigateTo('../dashboard/index.html');
    };
}

/**
 * Close cancel confirmation modal
 */
function closeCancelModal() {
    const modal = document.getElementById('cancel-modal');
    modal.style.display = 'none';
}
