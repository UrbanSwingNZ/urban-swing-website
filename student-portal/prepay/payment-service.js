/**
 * Payment Service
 * Handles Stripe integration and payment processing for prepay
 */

class PaymentService {
    constructor() {
        this.stripe = null;
        this.cardElement = null;
        this.initialized = false;
        this.isCardComplete = false;
    }
    
    /**
     * Initialize Stripe and create card element
     * @param {string} cardElementId - DOM element ID to mount card element
     * @param {string} cardErrorsId - DOM element ID for displaying errors
     * @returns {boolean} - True if successful
     */
    initialize(cardElementId = 'card-element', cardErrorsId = 'card-errors') {
        if (this.initialized) {
            console.warn('PaymentService already initialized');
            return true;
        }
        
        try {
            console.log('Initializing Stripe...');
            
            // Initialize Stripe with publishable key from config
            this.stripe = Stripe(stripeConfig.publishableKey);
            
            // Create card element
            const elements = this.stripe.elements();
            this.cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#333',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        '::placeholder': {
                            color: '#aab7c4'
                        }
                    },
                    invalid: {
                        color: '#e74c3c',
                        iconColor: '#e74c3c'
                    }
                },
                hidePostalCode: true,
                disableLink: true
            });
            
            // Mount card element to the DOM
            this.cardElement.mount(`#${cardElementId}`);
            
            // Handle real-time validation errors
            const cardErrorsElement = document.getElementById(cardErrorsId);
            this.cardElement.on('change', (event) => {
                // Track if card is complete
                this.isCardComplete = event.complete;
                
                if (event.error) {
                    cardErrorsElement.textContent = event.error.message;
                    cardErrorsElement.style.display = 'block';
                } else {
                    cardErrorsElement.textContent = '';
                    cardErrorsElement.style.display = 'none';
                }
                
                // Trigger update of submit button state if function exists
                if (typeof window.updateSubmitButtonState === 'function') {
                    window.updateSubmitButtonState();
                }
            });
            
            this.initialized = true;
            console.log('Stripe initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Error initializing Stripe:', error);
            showSnackbar('Failed to initialize payment system. Please refresh the page.', 'error');
            return false;
        }
    }
    
    /**
     * Create a payment method from the card element
     * @returns {Promise<Object>} - {success: boolean, paymentMethod: Object, error: string}
     */
    async createPaymentMethod() {
        if (!this.initialized) {
            return {
                success: false,
                error: 'Payment system not initialized'
            };
        }
        
        try {
            const { paymentMethod, error } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.cardElement,
                billing_details: {
                    name: 'Cardholder Name'
                }
            });
            
            if (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
            
            return {
                success: true,
                paymentMethod: paymentMethod
            };
            
        } catch (error) {
            console.error('Error creating payment method:', error);
            return {
                success: false,
                error: error.message || 'Failed to create payment method'
            };
        }
    }
    
    /**
     * Process casual payment
     * @param {string} studentId - Student ID
     * @param {string} rateId - Rate ID
     * @param {Date} classDate - Class date
     * @returns {Promise<Object>} - {success: boolean, result: Object, error: string}
     */
    async processCasualPayment(studentId, rateId, classDate) {
        try {
            // Create payment method
            const paymentMethodResult = await this.createPaymentMethod();
            
            if (!paymentMethodResult.success) {
                throw new Error(paymentMethodResult.error);
            }
            
            // Get Firebase auth token
            const user = firebase.auth().currentUser;
            const token = user ? await user.getIdToken() : null;
            
            // Call Firebase Function to process payment
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(API_CONFIG.CASUAL_PAYMENT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    studentId: studentId,
                    rateId: rateId,
                    classDate: classDate.toISOString(),
                    paymentMethodId: paymentMethodResult.paymentMethod.id,
                    returnUrl: window.location.href
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment processing failed');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Payment failed');
            }
            
            return {
                success: true,
                result: result
            };
            
        } catch (error) {
            console.error('Payment error:', error);
            return {
                success: false,
                error: error.message || 'Payment failed. Please try again.'
            };
        }
    }
    
    /**
     * Process concession purchase
     * @param {string} studentId - Student ID
     * @param {string} packageId - Package ID
     * @returns {Promise<Object>} - {success: boolean, result: Object, error: string}
     */
    async processConcessionPurchase(studentId, packageId) {
        try {
            // Create payment method
            const paymentMethodResult = await this.createPaymentMethod();
            
            if (!paymentMethodResult.success) {
                throw new Error(paymentMethodResult.error);
            }
            
            // Get Firebase auth token
            const user = firebase.auth().currentUser;
            const token = user ? await user.getIdToken() : null;
            
            // Call Firebase Function to process purchase
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(API_CONFIG.CONCESSION_PURCHASE, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    studentId: studentId,
                    packageId: packageId,
                    paymentMethodId: paymentMethodResult.paymentMethod.id,
                    returnUrl: window.location.href
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Purchase processing failed');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Purchase failed');
            }
            
            return {
                success: true,
                result: result
            };
            
        } catch (error) {
            console.error('Purchase error:', error);
            return {
                success: false,
                error: error.message || 'Purchase failed. Please try again.'
            };
        }
    }
    
    /**
     * Reset the card element (clear all input)
     */
    reset() {
        if (this.cardElement) {
            this.cardElement.clear();
            this.isCardComplete = false;
            
            // Trigger update of submit button state if function exists
            if (typeof updateSubmitButtonState === 'function') {
                updateSubmitButtonState();
            }
        }
    }
    
    /**
     * Destroy the payment service
     */
    destroy() {
        if (this.cardElement) {
            this.cardElement.unmount();
            this.cardElement = null;
        }
        this.stripe = null;
        this.initialized = false;
        this.isCardComplete = false;
    }
}
