/**
 * UpdatePaymentModal - Modal for updating payment method
 * Allows students to update their credit card for recurring memberships
 */

import { BaseModal } from '/components/modals/modal-base.js';
import { showSnackbar } from '/js/utils/index.js';

class UpdatePaymentModal extends BaseModal {
    /**
     * Create update payment modal
     * @param {Object} options - Configuration options
     * @param {Object} options.currentMembership - Current membership object
     * @param {Function} options.onSuccess - Callback when payment method updated successfully
     */
    constructor(options = {}) {
        const content = `
            <div class="update-payment-container">
                <p class="update-payment-description">
                    Update the credit card used for your ${options.currentMembership?.membershipType || 'membership'}.
                    Your next payment will use the new card.
                </p>
                
                <div class="current-card-info">
                    <strong>Current Card:</strong> 
                    <span class="card-last4">•••• ${options.currentMembership?.paymentMethodLast4 || '****'}</span>
                </div>
                
                <div class="form-group">
                    <label for="update-card-element">New Card Details</label>
                    <div id="update-card-element" class="stripe-card-element"></div>
                    <div id="update-card-errors" class="card-errors" role="alert"></div>
                </div>
                
                <div class="update-payment-note">
                    <i class="fas fa-info-circle"></i>
                    <span>Your new card will be charged on your next billing date. No charge will be made now.</span>
                </div>
            </div>
        `;

        const buttons = [
            {
                text: 'Cancel',
                class: 'btn-cancel',
                onClick: () => this.hide()
            },
            {
                text: 'Update Card',
                class: 'btn-primary',
                id: 'update-payment-submit',
                disabled: true,
                onClick: () => this._handleSubmit()
            }
        ];

        super({
            title: 'Update Payment Method',
            content,
            buttons,
            size: 'medium',
            showCloseButton: true
        });

        this.options = options;
        this.stripe = null;
        this.cardElement = null;
        this.isCardComplete = false;

        // Add custom CSS
        this._addStyles();
    }

    /**
     * Show modal and initialize Stripe
     */
    async show() {
        super.show();
        await this._initializeStripe();
    }

    /**
     * Initialize Stripe and card element
     * @private
     */
    async _initializeStripe() {
        try {
            // Wait for Stripe to be loaded
            if (typeof Stripe === 'undefined') {
                throw new Error('Stripe not loaded');
            }

            // Initialize Stripe with publishable key
            this.stripe = Stripe(stripeConfig.publishableKey);

            // Create card element
            const elements = this.stripe.elements();
            this.cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#333',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        '::placeholder': {
                            color: '#aab7c4'
                        }
                    },
                    invalid: {
                        color: '#e74c3c',
                        iconColor: '#e74c3c'
                    }
                },
                hidePostalCode: true
            });

            // Mount card element
            this.cardElement.mount('#update-card-element');

            // Listen for card changes
            this.cardElement.on('change', (event) => {
                this._handleCardChange(event);
            });

        } catch (error) {
            console.error('Error initializing Stripe:', error);
            showSnackbar('Failed to load payment form', 'error');
            this.hide();
        }
    }

    /**
     * Handle card element changes
     * @private
     */
    _handleCardChange(event) {
        const displayError = document.getElementById('update-card-errors');
        const submitBtn = document.getElementById('update-payment-submit');

        if (event.error) {
            displayError.textContent = event.error.message;
            displayError.style.display = 'block';
            this.isCardComplete = false;
            submitBtn.disabled = true;
        } else {
            displayError.textContent = '';
            displayError.style.display = 'none';
            this.isCardComplete = event.complete;
            submitBtn.disabled = !event.complete;
        }
    }

    /**
     * Handle form submission
     * @private
     */
    async _handleSubmit() {
        if (!this.isCardComplete) {
            showSnackbar('Please enter valid card details', 'error');
            return;
        }

        const submitBtn = document.getElementById('update-payment-submit');
        const originalText = submitBtn.textContent;
        
        try {
            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            // Create payment method
            const { paymentMethod, error } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.cardElement
            });

            if (error) {
                throw new Error(error.message);
            }

            // Call Cloud Function to update payment method
            const updatePaymentMethod = firebase.functions().httpsCallable('updateMembershipPaymentMethod');
            const result = await updatePaymentMethod({
                membershipId: this.options.currentMembership.id,
                paymentMethodId: paymentMethod.id
            });

            if (result.data.success) {
                showSnackbar('Payment method updated successfully', 'success');
                
                // Call success callback
                if (this.options.onSuccess) {
                    await this.options.onSuccess(result.data);
                }
                
                this.hide();
            } else {
                throw new Error(result.data.error || 'Failed to update payment method');
            }

        } catch (error) {
            console.error('Error updating payment method:', error);
            showSnackbar(error.message || 'Failed to update payment method', 'error');
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Clean up when modal is hidden
     */
    hide() {
        if (this.cardElement) {
            this.cardElement.destroy();
            this.cardElement = null;
        }
        super.hide();
    }

    /**
     * Add custom styles for the modal
     * @private
     */
    _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .update-payment-container {
                padding: 10px 0;
            }

            .update-payment-description {
                color: #666;
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .current-card-info {
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 24px;
            }

            .current-card-info strong {
                color: #333;
            }

            .card-last4 {
                color: #666;
                font-family: monospace;
                font-size: 15px;
            }

            .stripe-card-element {
                border: 1px solid #ccc;
                border-radius: 6px;
                padding: 12px;
                background: white;
                transition: border-color 0.3s;
            }

            .stripe-card-element:hover {
                border-color: #9a16f5;
            }

            .stripe-card-element:focus-within {
                border-color: #9a16f5;
                box-shadow: 0 0 0 3px rgba(154, 22, 245, 0.1);
            }

            .card-errors {
                color: #e74c3c;
                font-size: 14px;
                margin-top: 8px;
                display: none;
            }

            .update-payment-note {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                background: #e8f4fd;
                border: 1px solid #b3d9f2;
                border-radius: 6px;
                padding: 12px;
                margin-top: 20px;
                font-size: 14px;
                color: #0c5e9e;
            }

            .update-payment-note i {
                margin-top: 2px;
                flex-shrink: 0;
            }

            /* Loading state for submit button */
            #update-payment-submit:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `;
        this.element.appendChild(style);
    }
}

export { UpdatePaymentModal };
