/**
 * RefundModal - Custom modal for processing refunds
 * Extends BaseModal with refund-specific form handling
 * Assumes BaseModal is loaded globally from modal-base.js
 */

(function() {
    'use strict';
    
    // BaseModal should be available globally
    if (typeof BaseModal === 'undefined') {
        console.error('BaseModal is not defined. Make sure modal-base.js is loaded before refund-modal.js');
        return;
    }

class RefundModal extends BaseModal {
    /**
     * Create a refund modal
     * @param {Object} options - Configuration options
     * @param {Object} options.transaction - Original transaction data
     * @param {Function} options.onRefund - Callback when refund is confirmed (receives refund data)
     */
    constructor(options = {}) {
        const { transaction, onRefund } = options;
        
        if (!transaction) {
            throw new Error('Transaction data is required for RefundModal');
        }
        
        // Calculate refund information
        const originalAmount = transaction.amount;
        
        // Calculate previouslyRefunded by summing only non-reversed refunds from history
        let previouslyRefunded = 0;
        if (transaction.refundHistory && transaction.refundHistory.length > 0) {
            previouslyRefunded = transaction.refundHistory.reduce((sum, entry) => {
                return entry.reversed ? sum : sum + (entry.amount || 0);
            }, 0);
        }
        
        const availableToRefund = originalAmount - previouslyRefunded;
        const hasPartialRefunds = previouslyRefunded > 0 && previouslyRefunded < originalAmount;
        const isStripeTransaction = transaction.stripeCustomerId || 
                                   transaction.paymentMethod === 'stripe' || 
                                   transaction.paymentMethod === 'online';
        
        // Store transaction-specific data
        const refundData = {
            transaction,
            originalAmount,
            previouslyRefunded,
            availableToRefund,
            hasPartialRefunds,
            isStripeTransaction,
            onRefund: onRefund || null
        };
        
        // Build modal content
        const content = RefundModal._buildModalContent(refundData);
        
        // Build buttons
        const buttons = [
            {
                text: 'Cancel',
                class: 'btn-cancel',
                onClick: (modal) => modal.hide()
            },
            {
                text: 'Process Refund',
                id: 'process-refund-btn',
                class: 'btn-primary',
                disabled: true,
                onClick: (modal) => modal._handleRefundSubmit()
            }
        ];
        
        // Initialize base modal
        super({
            id: `refund-modal-${transaction.id}-${Date.now()}`,
            title: '<i class="fas fa-undo"></i> Process Refund',
            content,
            buttons,
            size: 'medium',
            showCloseButton: true,
            closeOnEscape: true,
            closeOnOverlay: false,
            onOpen: () => RefundModal._setupFormListeners(refundData),
            onClose: () => RefundModal._cleanupModal()
        });
        
        // Store refund-specific data
        this.refundData = refundData;
        
        // Add refund modal class
        this.element.classList.add('refund-modal');
    }
    
    /**
     * Cleanup when modal closes
     * @private
     */
    static _cleanupModal() {
        // Remove any lingering validation state
        RefundModal._resetValidationState();
    }
    
    /**
     * Build modal content HTML
     * @private
     */
    static _buildModalContent(refundData) {
        const {
            transaction,
            originalAmount,
            previouslyRefunded,
            availableToRefund,
            hasPartialRefunds,
            isStripeTransaction
        } = refundData;
        
        return `
            ${hasPartialRefunds ? RefundModal._buildPartialRefundBanner(previouslyRefunded, availableToRefund) : ''}
            
            ${RefundModal._buildTransactionSummary(originalAmount, previouslyRefunded, availableToRefund)}
            
            <div class="refund-form-group">
                <label for="refund-amount" class="required">Refund Amount</label>
                <div class="currency-input-wrapper">
                    <input 
                        type="number" 
                        id="refund-amount" 
                        min="0.01" 
                        max="${availableToRefund.toFixed(2)}" 
                        step="0.01" 
                        placeholder="0.00"
                        required
                    />
                </div>
                <span class="error-message" id="amount-error"></span>
                <span class="help-text">Maximum refundable: $${availableToRefund.toFixed(2)}</span>
            </div>
            
            <div class="refund-form-group">
                <label for="refund-payment-method" class="required">Refund Payment Method</label>
                <select id="refund-payment-method" required>
                    <option value="">Select payment method...</option>
                    <option value="cash" ${transaction.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option>
                    <option value="eftpos" ${transaction.paymentMethod === 'eftpos' ? 'selected' : ''}>EFTPOS</option>
                    <option value="online" ${transaction.paymentMethod === 'online' || transaction.paymentMethod === 'stripe' ? 'selected' : ''}>Online</option>
                    <option value="bank-transfer" ${transaction.paymentMethod === 'bank-transfer' ? 'selected' : ''}>Bank Transfer</option>
                </select>
                <span class="error-message" id="payment-method-error"></span>
                <span class="help-text">Select how the refund will be issued to the student</span>
            </div>
            
            <div id="refund-type-indicator" style="display: none;"></div>
            
            <div class="refund-form-group">
                <label for="refund-reason" class="required">Reason</label>
                <textarea 
                    id="refund-reason" 
                    maxlength="500" 
                    placeholder="Enter the reason for this refund..."
                    required
                ></textarea>
                <span class="error-message" id="reason-error"></span>
                <span class="help-text" id="reason-char-count">0 / 500 characters</span>
            </div>
            
            ${isStripeTransaction ? RefundModal._buildStripeStatusMessage() : RefundModal._buildManualRefundMessage()}
        `;
    }
    
    /**
     * Build partial refund info banner
     * @private
     */
    static _buildPartialRefundBanner(previouslyRefunded, availableToRefund) {
        return `
            <div class="refund-info-banner partial">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Previous Refunds:</strong> 
                    $${previouslyRefunded.toFixed(2)} has already been refunded on this transaction.
                    <br>
                    <strong>Remaining refundable:</strong> $${availableToRefund.toFixed(2)}
                </div>
            </div>
        `;
    }
    
    /**
     * Build transaction summary section
     * @private
     */
    static _buildTransactionSummary(originalAmount, previouslyRefunded, availableToRefund) {
        return `
            <div class="refund-summary">
                <h4>Transaction Summary</h4>
                <div class="refund-summary-row">
                    <span class="refund-summary-label">Original Amount:</span>
                    <span class="refund-summary-value">$${originalAmount.toFixed(2)}</span>
                </div>
                ${previouslyRefunded > 0 ? `
                    <div class="refund-summary-row">
                        <span class="refund-summary-label">Previously Refunded:</span>
                        <span class="refund-summary-value">$${previouslyRefunded.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="refund-summary-row">
                    <span class="refund-summary-label">Available to Refund:</span>
                    <span class="refund-summary-value highlight">$${availableToRefund.toFixed(2)}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Build Stripe status message
     * @private
     */
    static _buildStripeStatusMessage() {
        return `
            <div class="stripe-status-message">
                <i class="fab fa-stripe"></i>
                <span>This refund will be processed through Stripe</span>
            </div>
        `;
    }
    
    /**
     * Build manual refund message
     * @private
     */
    static _buildManualRefundMessage() {
        return `
            <div class="stripe-status-message manual">
                <i class="fas fa-hand-holding-usd"></i>
                <span>Database-only refund (no payment processor action)</span>
            </div>
        `;
    }
    
    /**
     * Setup form event listeners
     * @private
     */
    static _setupFormListeners(refundData) {
        const amountInput = document.getElementById('refund-amount');
        const paymentMethodSelect = document.getElementById('refund-payment-method');
        const reasonTextarea = document.getElementById('refund-reason');
        const processBtn = document.getElementById('process-refund-btn');
        const refundTypeIndicator = document.getElementById('refund-type-indicator');
        const charCount = document.getElementById('reason-char-count');
        
        // Reset all validation state from previous modal instances
        RefundModal._resetValidationState();
        
        // Amount input validation
        amountInput?.addEventListener('input', () => {
            RefundModal._validateAmount(amountInput, refundData.availableToRefund);
            RefundModal._updateRefundTypeIndicator(amountInput.value, refundData.availableToRefund, refundTypeIndicator);
            RefundModal._validateForm(amountInput, paymentMethodSelect, reasonTextarea, processBtn, refundData.availableToRefund);
        });
        
        // Payment method validation
        paymentMethodSelect?.addEventListener('change', () => {
            RefundModal._validatePaymentMethod(paymentMethodSelect);
            RefundModal._validateForm(amountInput, paymentMethodSelect, reasonTextarea, processBtn, refundData.availableToRefund);
        });
        
        // Reason character count
        reasonTextarea?.addEventListener('input', () => {
            if (charCount) {
                charCount.textContent = `${reasonTextarea.value.length} / 500 characters`;
            }
            RefundModal._validateReason(reasonTextarea);
            RefundModal._validateForm(amountInput, paymentMethodSelect, reasonTextarea, processBtn, refundData.availableToRefund);
        });
        
        // Run initial validation check after a short delay to ensure DOM is ready
        setTimeout(() => {
            if (amountInput && paymentMethodSelect && reasonTextarea && processBtn) {
                // Explicitly reset button state
                processBtn.disabled = true;
                RefundModal._validateForm(amountInput, paymentMethodSelect, reasonTextarea, processBtn, refundData.availableToRefund);
            }
        }, 200);
    }
    
    /**
     * Reset all validation state (clear errors, remove classes)
     * @private
     */
    static _resetValidationState() {
        // Clear all error classes
        const amountInput = document.getElementById('refund-amount');
        const paymentMethodSelect = document.getElementById('refund-payment-method');
        const reasonTextarea = document.getElementById('refund-reason');
        
        amountInput?.classList.remove('error');
        paymentMethodSelect?.classList.remove('error');
        reasonTextarea?.classList.remove('error');
        
        // Hide all error messages
        const amountError = document.getElementById('amount-error');
        const paymentMethodError = document.getElementById('payment-method-error');
        const reasonError = document.getElementById('reason-error');
        
        amountError?.classList.remove('visible');
        paymentMethodError?.classList.remove('visible');
        reasonError?.classList.remove('visible');
    }
    
    /**
     * Validate refund amount
     * @private
     */
    static _validateAmount(amountInput, maxRefundable) {
        const amountError = document.getElementById('amount-error');
        const amount = parseFloat(amountInput.value);
        
        if (!amountInput.value || isNaN(amount)) {
            amountInput.classList.add('error');
            amountError.textContent = 'Please enter a refund amount';
            amountError.classList.add('visible');
            return false;
        }
        
        if (amount <= 0) {
            amountInput.classList.add('error');
            amountError.textContent = 'Amount must be greater than $0';
            amountError.classList.add('visible');
            return false;
        }
        
        if (amount > maxRefundable) {
            amountInput.classList.add('error');
            amountError.textContent = `Amount cannot exceed $${maxRefundable.toFixed(2)}`;
            amountError.classList.add('visible');
            return false;
        }
        
        amountInput.classList.remove('error');
        amountError.classList.remove('visible');
        return true;
    }
    
    /**
     * Validate payment method
     * @private
     */
    static _validatePaymentMethod(paymentMethodSelect) {
        const paymentMethodError = document.getElementById('payment-method-error');
        
        if (!paymentMethodSelect.value) {
            paymentMethodSelect.classList.add('error');
            paymentMethodError.textContent = 'Please select a payment method';
            paymentMethodError.classList.add('visible');
            return false;
        }
        
        paymentMethodSelect.classList.remove('error');
        paymentMethodError.classList.remove('visible');
        return true;
    }
    
    /**
     * Validate reason
     * @private
     */
    static _validateReason(reasonTextarea) {
        const reasonError = document.getElementById('reason-error');
        const reason = reasonTextarea.value.trim();
        
        if (!reason) {
            reasonTextarea.classList.add('error');
            reasonError.textContent = 'Please enter a reason for the refund';
            reasonError.classList.add('visible');
            return false;
        }
        
        reasonTextarea.classList.remove('error');
        reasonError.classList.remove('visible');
        return true;
    }
    
    /**
     * Update refund type indicator (Full vs Partial)
     * @private
     */
    static _updateRefundTypeIndicator(amountValue, maxRefundable, indicator) {
        const amount = parseFloat(amountValue);
        
        if (!amountValue || isNaN(amount) || amount <= 0) {
            indicator.style.display = 'none';
            return;
        }
        
        indicator.style.display = 'flex';
        
        if (Math.abs(amount - maxRefundable) < 0.01) {
            // Full refund
            indicator.className = 'refund-type-indicator full';
            indicator.innerHTML = '<i class="fas fa-check-circle"></i> This will <strong>fully refund</strong> the remaining balance.';
        } else {
            // Partial refund
            indicator.className = 'refund-type-indicator partial';
            indicator.innerHTML = '<i class="fas fa-info-circle"></i> This will be a <strong>partial refund</strong>.';
        }
    }
    
    /**
     * Validate entire form
     * @private
     */
    static _validateForm(amountInput, paymentMethodSelect, reasonTextarea, processBtn, maxRefundable) {
        const isAmountValid = RefundModal._validateAmount(amountInput, maxRefundable);
        const isPaymentMethodValid = RefundModal._validatePaymentMethod(paymentMethodSelect);
        const isReasonValid = RefundModal._validateReason(reasonTextarea);
        
        // Get fresh button reference in case it was re-rendered
        const btn = document.getElementById('process-refund-btn') || processBtn;
        
        if (isAmountValid && isPaymentMethodValid && isReasonValid) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    }
    
    /**
     * Handle refund submission
     * @private
     */
    async _handleRefundSubmit() {
        const amountInput = document.getElementById('refund-amount');
        const paymentMethodSelect = document.getElementById('refund-payment-method');
        const reasonTextarea = document.getElementById('refund-reason');
        
        const refundAmount = parseFloat(amountInput.value);
        const paymentMethod = paymentMethodSelect.value;
        const reason = reasonTextarea.value.trim();
        
        // Check for past check-in (per BA requirement)
        if (this.refundData.transaction.type === 'casual' || 
            this.refundData.transaction.type === 'casual-student') {
            const hasPastCheckIn = await hasPastCheckin(this.refundData.transaction);
            
            if (hasPastCheckIn) {
                showSnackbar('Cannot refund transactions with past check-ins', 'error');
                return;
            }
        }
        
        // Prepare refund data
        const refundDataToSubmit = {
            transactionId: this.refundData.transaction.id,
            transaction: this.refundData.transaction,
            amount: refundAmount,
            paymentMethod,
            reason,
            isFullRefund: Math.abs(refundAmount - this.refundData.availableToRefund) < 0.01
        };
        
        // Close modal and call callback
        this.hide();
        
        if (this.refundData.onRefund) {
            this.refundData.onRefund(refundDataToSubmit);
        }
    }
}

// Make RefundModal available globally
window.RefundModal = RefundModal;

})(); // End IIFE
