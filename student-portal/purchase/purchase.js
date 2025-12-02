/**
 * Purchase Concessions Page (Refactored)
 * Handles concession package selection and payment processing
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

console.log('Purchase page loaded');

// Services
let paymentService = null;
let packageService = null;

// Current state
let currentStudentId = null;

// Modal instances
let cancelModal = null;

/**
 * Page Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Purchase page DOM loaded');
    initializePage();
});

/**
 * Listen for student selection changes (from admin dropdown)
 */
window.addEventListener('studentSelected', async (event) => {
    const student = event.detail;
    
    if (student) {
        await loadPurchasePage(student.id);
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
        
        // Load purchase page for the student
        await loadPurchasePage(currentStudentId);
        
    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Error loading page. Please try refreshing.');
    }
}

/**
 * Load purchase page for a specific student
 */
async function loadPurchasePage(studentId) {
    currentStudentId = studentId;
    
    // Show content
    document.getElementById('purchase-content').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    
    // Initialize services
    initializeServices();
    
    // Load concession packages
    await loadConcessionPackages();
}

/**
 * Initialize all services
 */
function initializeServices() {
    // Initialize services
    paymentService = new PaymentService();
    packageService = new PackageService();
    
    // Initialize Stripe payment
    paymentService.initialize('card-element', 'card-errors');
    
    // Initialize cancel confirmation modal
    cancelModal = new ConfirmationModal({
        title: 'Unsaved Changes',
        message: `
            <p>You have unsaved changes. Are you sure you want to cancel?</p>
            <p class="text-muted">Your changes will be lost if you leave this page.</p>
        `,
        icon: 'fas fa-exclamation-triangle',
        confirmText: 'Leave Page',
        confirmClass: 'btn-delete',
        cancelText: 'Stay on Page',
        cancelClass: 'btn-cancel',
        onConfirm: () => {
            navigateTo('../dashboard/index.html');
        }
    });
    
    // Setup form handlers
    setupFormHandlers();
}

/**
 * Load concession packages from Firestore
 */
async function loadConcessionPackages() {
    try {
        const packages = await packageService.loadPackages();
        
        if (packages.length === 0) {
            showSnackbar('No concession packages available at this time.', 'warning');
            return;
        }
        
        // Populate dropdown
        populatePackageDropdown(packages);
        
        // Set initial button state (should be disabled)
        updateSubmitButtonState();
        
    } catch (error) {
        console.error('Error loading concession packages:', error);
        showSnackbar('Failed to load concession packages. Please try again.', 'error');
    }
}

/**
 * Populate the package dropdown
 */
function populatePackageDropdown(packages) {
    const select = document.getElementById('package-select');
    
    // Clear existing options
    select.innerHTML = '<option value="">Select a package...</option>';
    
    // Add package options
    packages.forEach(pkg => {
        const option = document.createElement('option');
        option.value = pkg.id;
        option.textContent = `${pkg.name} - ${formatCurrency(pkg.price)}`;
        option.dataset.package = JSON.stringify(pkg);
        select.appendChild(option);
    });
    
    // Add change event listener
    select.addEventListener('change', handlePackageSelection);
}

/**
 * Handle package selection
 */
function handlePackageSelection(event) {
    const select = event.target;
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption.value) {
        // No package selected
        packageService.clearSelection();
        document.getElementById('package-details').style.display = 'none';
        updateSubmitButton();
        updateSubmitButtonState();
        return;
    }
    
    // Get package data
    const pkg = JSON.parse(selectedOption.dataset.package);
    packageService.selectPackage(pkg.id);
    
    console.log('Package selected:', pkg.name);
    
    // Show package details
    const detailsDiv = document.getElementById('package-details');
    const descriptionSpan = document.getElementById('package-description');
    
    descriptionSpan.textContent = packageService.formatPackageDescription(pkg);
    detailsDiv.style.display = 'block';
    
    // Update submit button text and state
    updateSubmitButton();
    updateSubmitButtonState();
}

/**
 * Update submit button text based on selection
 */
function updateSubmitButton() {
    const submitText = document.getElementById('submit-text');
    const selectedPackage = packageService.getSelectedPackage();
    
    if (selectedPackage) {
        submitText.textContent = `Purchase for ${formatCurrency(selectedPackage.price)}`;
    } else {
        submitText.textContent = 'Purchase Concessions';
    }
}

/**
 * Update submit button state based on form completion
 */
function updateSubmitButtonState() {
    const submitBtn = document.getElementById('submit-btn');
    const selectedPackage = packageService.getSelectedPackage();
    const termsCheckbox = document.getElementById('terms-accepted');
    
    // Check if all required fields are filled
    const hasPackage = selectedPackage !== null;
    const hasValidCard = paymentService && paymentService.cardElement && paymentService.isCardComplete;
    const hasAcceptedTerms = termsCheckbox && termsCheckbox.checked;
    
    // Enable button only if all conditions are met
    if (hasPackage && hasValidCard && hasAcceptedTerms) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
    // Form submit
    document.getElementById('purchase-form').addEventListener('submit', handleFormSubmit);
    
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
    const selectedPackage = packageService.getSelectedPackage();
    if (!selectedPackage) {
        showSnackbar('Please select a concession package.', 'error');
        return;
    }
    
    // Process purchase
    await processPurchase(selectedPackage);
}

/**
 * Process the purchase
 */
async function processPurchase(pkg) {
    console.log('Processing purchase...');
    
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
        
        // Process purchase through payment service
        const result = await paymentService.processConcessionPurchase(
            currentStudentId,
            pkg.id
        );
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        showSnackbar(`Purchase successful! ${result.result.numberOfClasses} classes added to your account.`, 'success');
        
        // Redirect to concessions page after short delay
        setTimeout(() => {
            navigateTo('../concessions/index.html');
        }, 2000);
        
    } catch (error) {
        console.error('Purchase error:', error);
        showSnackbar(error.message || 'Purchase failed. Please try again.', 'error');
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
        cancelModal.show();
    } else {
        navigateTo('../dashboard/index.html');
    }
}

/**
 * Check if form has unsaved changes
 */
function checkForChanges() {
    const packageSelect = document.getElementById('package-select');
    return packageSelect.value !== '';
}
