/**
 * UI Controller
 * Handles UI updates and form interactions
 */

class UIController {
    constructor(rateService, validationService, paymentService) {
        this.rateService = rateService;
        this.validationService = validationService;
        this.paymentService = paymentService;
        
        // Initialize cancel confirmation modal
        this.cancelModal = new ConfirmationModal({
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
    }
    
    /**
     * Populate the rate radio buttons
     * @param {Array} rates - Array of rate objects
     */
    populateRateOptions(rates) {
        const container = document.getElementById('entry-type-options');
        
        if (rates.length === 0) {
            container.innerHTML = '<p class="loading-text">No entry types available</p>';
            return;
        }
        
        // Clear loading text
        container.innerHTML = '';
        
        // Add radio options
        rates.forEach((rate) => {
            const option = this.createRateOption(rate);
            container.appendChild(option);
        });
        
        // Set initial selection
        const checkedRadio = container.querySelector('input[type="radio"]:checked');
        if (checkedRadio) {
            this.rateService.selectRate(checkedRadio.value);
            this.updateSubmitButtonText();
        }
        
        // Add change listeners to all radio buttons
        container.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.handleRateSelection();
                this.toggleStudentNotices();
            });
        });
        
        // Show notice for initially selected student rate
        this.toggleStudentNotices();
    }
    
    /**
     * Create a rate option element
     * @param {Object} rate - Rate data
     * @returns {HTMLElement} - The created option element
     */
    createRateOption(rate) {
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
            this.handleRateSelection();
            this.toggleStudentNotices();
        });
        
        return option;
    }
    
    /**
     * Toggle student ID notices based on selection
     */
    toggleStudentNotices() {
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
    handleRateSelection() {
        const selectedRadio = document.querySelector('input[name="entry-type"]:checked');
        
        if (!selectedRadio) {
            this.rateService.clearSelection();
            this.updateSubmitButtonText();
            this.updateSubmitButtonState();
            return;
        }
        
        this.rateService.selectRate(selectedRadio.value);
        
        // Update selected styling
        document.querySelectorAll('.radio-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        selectedRadio.closest('.radio-option').classList.add('selected');
        
        // Update submit button
        this.updateSubmitButtonText();
        this.updateSubmitButtonState();
    }
    
    /**
     * Update submit button text based on selection
     */
    updateSubmitButtonText() {
        const submitText = document.getElementById('submit-text');
        const selectedRate = this.rateService.getSelectedRate();
        
        if (selectedRate) {
            submitText.innerHTML = `Pay ${formatCurrency(selectedRate.price)}`;
        } else {
            submitText.innerHTML = 'Pay Now';
        }
    }
    
    /**
     * Update submit button state based on form completion
     */
    updateSubmitButtonState() {
        const submitBtn = document.getElementById('submit-btn');
        const classDateInput = document.getElementById('class-date');
        const classDate = classDateInput ? classDateInput.value : '';
        const selectedRate = this.rateService.getSelectedRate();
        const termsCheckbox = document.getElementById('terms-accepted');
        
        // Check if all required fields are filled
        const hasDate = classDate && classDate.trim() !== '';
        const hasRate = selectedRate !== null;
        const hasValidCard = this.paymentService && this.paymentService.cardElement && this.paymentService.isCardComplete;
        const hasAcceptedTerms = termsCheckbox && termsCheckbox.checked;
        
        // Check if date validation passed (no error message shown)
        const validationMessage = document.getElementById('date-validation-message');
        const hasValidDate = hasDate && (!validationMessage || validationMessage.style.display === 'none');
        
        // Enable button only if all conditions are met
        if (hasValidDate && hasRate && hasValidCard && hasAcceptedTerms) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }
    
    /**
     * Reset the form after successful payment
     * @param {Function} datePicker - Date picker instance
     */
    resetForm(datePicker) {
        document.getElementById('prepay-form').reset();
        document.getElementById('class-date').value = '';
        
        // Uncheck terms checkbox
        const termsCheckbox = document.getElementById('terms-accepted');
        if (termsCheckbox) {
            termsCheckbox.checked = false;
        }
        
        if (datePicker) {
            datePicker.clearDate();
        }
        this.paymentService.reset();
        
        // Clear any validation messages
        const validationEl = document.getElementById('date-validation-message');
        if (validationEl) {
            validationEl.style.display = 'none';
        }
    }
    
    /**
     * Show cancel confirmation modal
     */
    showCancelModal() {
        this.cancelModal.show();
    }
}
