/**
 * Modal Service
 * Handles change date modal functionality
 */

import { BaseModal } from '/components/modals/modal-base.js';

class ModalService {
    constructor(prepaidClassesService, validationService) {
        this.prepaidClassesService = prepaidClassesService;
        this.validationService = validationService;
        this.changeDatePicker = null;
        this.currentTransactionId = null;
        this.currentStudentId = null;
        this.onDateChangedCallback = null;
        this.isInitialized = false;
        this.modal = null;
    }
    
    /**
     * Initialize the modal service
     */
    initialize(changeDatePicker, studentId, onDateChangedCallback) {
        this.currentStudentId = studentId;
        this.onDateChangedCallback = onDateChangedCallback;
        
        // Setup accordion
        this.setupAccordion();
        
        // Don't setup date picker yet - will do it when modal is first shown
        // This ensures all DOM elements exist
    }
    
    /**
     * Setup date picker with calendar open/close callbacks
     */
    setupDatePickerCallbacks() {
        // Get modal content for resizing
        const modalContent = this.modal?.element?.querySelector('.modal-content');
        
        if (!modalContent) {
            console.error('Modal content not found for resize callbacks');
            return;
        }
        
        // Reinitialize the change date picker with callbacks
        const changeDateInput = document.getElementById('new-class-date');
        const changeDateCalendar = document.getElementById('new-custom-calendar');
        
        if (changeDateInput && changeDateCalendar) {
            // Create new DatePicker instance with callbacks
            this.changeDatePicker = new DatePicker('new-class-date', 'new-custom-calendar', {
                allowedDays: [4], // Thursday only
                disablePastDates: true,
                onDateSelected: async (date) => {
                    await this.handleDateSelection(date);
                },
                onCalendarOpen: () => {
                    modalContent.classList.add('calendar-open');
                },
                onCalendarClose: () => {
                    modalContent.classList.remove('calendar-open');
                }
            });
            console.log('DatePicker initialized successfully with callbacks');
        } else {
            console.error('Failed to find date picker elements');
        }
    }
    
    /**
     * Update current student ID
     */
    setStudentId(studentId) {
        this.currentStudentId = studentId;
    }
    
    /**
     * Show change date modal
     */
    show(transactionId) {
        this.currentTransactionId = transactionId;
        
        // Create modal HTML content
        const formHtml = `
            <p style="margin: 0 0 20px 0; color: var(--text-color);">Change the class date for your prepaid entry.</p>
            <div class="form-group" style="display: flex; flex-direction: column;">
                <label for="new-class-date" style="font-weight: 600; color: var(--text-color); margin-bottom: 8px; font-size: 0.95rem;">
                    <i class="fas fa-calendar-alt"></i> New Class Date
                    <span class="required" style="color: var(--error);">*</span>
                </label>
                <div class="date-input-wrapper">
                    <input 
                        type="text" 
                        id="new-class-date" 
                        required
                        readonly
                        placeholder="Click to select a Thursday"
                        style="padding: 12px 16px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 1rem; width: 100%; cursor: pointer; background: white; font-family: inherit; transition: all 0.2s ease;"
                    >
                </div>
                <div id="new-custom-calendar" class="custom-calendar" style="display: none;"></div>
                <p class="field-help" style="margin: 8px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Select a Thursday - classes are only held on Thursdays</p>
                <div id="new-date-validation-message" class="validation-message" style="display: none;"></div>
            </div>
        `;
        
        // Destroy existing modal if present
        if (this.modal) {
            this.modal.destroy();
        }
        
        // Create new modal with BaseModal
        this.modal = new BaseModal({
            title: '<i class="fas fa-calendar-alt"></i> Change Class Date',
            content: formHtml,
            size: 'medium',
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-cancel',
                    onClick: () => this.close()
                },
                {
                    text: '<i class="fas fa-check"></i> Confirm Change',
                    class: 'btn-primary',
                    id: 'change-date-confirm',
                    disabled: true,
                    onClick: () => this.confirmChange()
                }
            ],
            onOpen: () => {
                // Initialize date picker on first show
                if (!this.isInitialized) {
                    this.setupDatePickerCallbacks();
                    this.isInitialized = true;
                }
                // Reset modal state
                this.resetModal();
            },
            onClose: () => {
                this.currentTransactionId = null;
            }
        });
        
        this.modal.show();
    }
    
    /**
     * Close change date modal
     */
    close() {
        if (this.modal) {
            this.modal.hide();
        }
        this.currentTransactionId = null;
    }
    
    /**
     * Reset modal to initial state
     */
    resetModal() {
        document.getElementById('new-class-date').value = '';
        document.getElementById('change-date-confirm').disabled = true;
        
        const validationEl = document.getElementById('new-date-validation-message');
        if (validationEl) {
            validationEl.style.display = 'none';
        }
        
        if (this.changeDatePicker) {
            this.changeDatePicker.clearDate();
        }
    }
    
    /**
     * Handle new date selection
     */
    async handleDateSelection(date) {
        if (!this.currentStudentId) return;
        
        // Validate the selected date
        const validation = await this.validationService.validateClassDate(date, this.currentStudentId);
        
        // Update UI based on validation
        this.updateValidationUI(validation);
    }
    
    /**
     * Update validation UI in modal
     */
    updateValidationUI(validation) {
        const messageEl = document.getElementById('new-date-validation-message');
        const confirmBtn = document.getElementById('change-date-confirm');
        const fieldHelp = document.querySelector('#change-date-modal .field-help');
        
        if (!messageEl) return;
        
        if (!validation.isValid) {
            messageEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${validation.message}`;
            messageEl.className = 'validation-message error';
            messageEl.style.display = 'block';
            
            if (fieldHelp) fieldHelp.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = true;
        } else {
            messageEl.style.display = 'none';
            if (fieldHelp) fieldHelp.style.display = 'block';
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }
    
    /**
     * Confirm date change
     */
    async confirmChange() {
        if (!this.currentTransactionId) {
            showSnackbar('No transaction selected', 'error');
            return;
        }
        
        const newDate = this.changeDatePicker.getSelectedDate();
        if (!newDate) {
            showSnackbar('Please select a new date', 'error');
            return;
        }
        
        const confirmBtn = document.getElementById('change-date-confirm');
        const originalText = confirmBtn.innerHTML;
        
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            // Update the class date
            await this.prepaidClassesService.updateClassDate(this.currentTransactionId, newDate);
            
            // Close modal
            this.close();
            
            // Show success message
            showSnackbar('Class date updated successfully!', 'success', 3000);
            
            // Trigger callback to reload prepaid classes
            if (this.onDateChangedCallback) {
                await this.onDateChangedCallback();
            }
            
        } catch (error) {
            console.error('Error updating class date:', error);
            showSnackbar('Failed to update class date. Please try again.', 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
        }
    }
    
    /**
     * Setup accordion functionality
     */
    setupAccordion() {
        const header = document.getElementById('prepaid-header');
        const toggle = document.getElementById('prepaid-accordion-toggle');
        const list = document.getElementById('prepaid-classes-list');
        
        if (!header || !toggle || !list) return;
        
        header.addEventListener('click', () => {
            list.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        });
    }
}

export { ModalService };
