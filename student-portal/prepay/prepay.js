/**
 * Pre-Pay for Class Page (Refactored)
 * Handles casual entry payment processing
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { UIController } from './ui-controller.js';

// Services
let paymentService = null;
let rateService = null;
let validationService = null;
let prepaidClassesService = null;
let uiController = null;
let modalService = null;

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
    
    // Note: changeDatePicker will be initialized by modal-service with callbacks
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
    prepaidClassesService = new PrepaidClassesService();
    uiController = new UIController(rateService, validationService, paymentService);
    modalService = new ModalService(prepaidClassesService, validationService);
    
    // Initialize modal service (will create its own changeDatePicker with callbacks)
    modalService.initialize(null, currentStudentId, () => loadPrepaidClasses(currentStudentId));
    
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
        const prepaidClasses = await prepaidClassesService.loadPrepaidClasses(studentId);
        prepaidClassesService.displayPrepaidClasses(prepaidClasses);
        
        // Update modal service with current student ID
        if (modalService) {
            modalService.setStudentId(studentId);
        }
        
        // Attach event listeners to change date buttons
        document.querySelectorAll('.btn-change-date').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const transactionId = btn.dataset.transactionId;
                if (modalService) {
                    modalService.show(transactionId);
                }
            });
        });
    } catch (error) {
        console.error('Error loading prepaid classes:', error);
        document.getElementById('prepaid-classes-section').style.display = 'none';
    }
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
        uiController.populateRateOptions(rates);
        
        // Initial button state check after everything is loaded
        updateSubmitButtonState();
        
    } catch (error) {
        console.error('Error loading casual rates:', error);
        showSnackbar('Failed to load entry types. Please try again.', 'error');
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
    
    // Update submit button state
    updateSubmitButtonState();
}

/**
 * Update submit button state based on form completion
 * This is a global function so it can be called from payment-service.js
 */
function updateSubmitButtonState() {
    if (uiController) {
        uiController.updateSubmitButtonState();
    }
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
    // Form submit
    document.getElementById('prepay-form').addEventListener('submit', handleFormSubmit);
    
    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', handleCancel);
    
    // Terms checkbox
    const termsCheckbox = document.getElementById('terms-accepted');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', updateSubmitButtonState);
    }
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
        
        // Hide loading spinner first
        showLoading(false);
        
        // Show success message
        showSnackbar('Payment successful! Your class has been pre-paid.', 'success', 4000);
        
        // Reset form and reload prepaid classes
        uiController.resetForm(datePicker);
        
        // Reload prepaid classes to show the new one
        await loadPrepaidClasses(currentStudentId);
        
        // Re-enable submit button with correct state
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        
        // Update button state to reflect empty form
        updateSubmitButtonState();
        
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
        uiController.showCancelModal();
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
