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
                    classDate: classDate,
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
     * Process one-time membership purchase
     * @param {string} studentId - Student ID
     * @param {string} membershipTypeId - Membership type ID
     * @param {string} startDate - Optional ISO date string for scheduled membership
     * @returns {Promise<Object>} - {success: boolean, result: Object, error: string}
     */
    async processMembershipPurchaseOneTime(studentId, membershipTypeId, startDate = null) {
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
            
            const requestBody = {
                studentId: studentId,
                membershipTypeId: membershipTypeId,
                paymentMethodId: paymentMethodResult.paymentMethod.id
            };
            
            if (startDate) {
                requestBody.startDate = startDate;
            }
            
            const response = await fetch(API_CONFIG.MEMBERSHIP_PURCHASE_ONETIME, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Membership purchase failed');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Membership purchase failed');
            }
            
            return {
                success: true,
                result: result
            };
            
        } catch (error) {
            console.error('Membership purchase error:', error);
            return {
                success: false,
                error: error.message || 'Membership purchase failed. Please try again.'
            };
        }
    }
    
    /**
     * Process recurring membership purchase (auto-renewing subscription)
     * @param {string} studentId - Student ID
     * @param {string} membershipTypeId - Membership type ID
     * @param {string} startDate - Optional ISO date string for scheduled membership
     * @returns {Promise<Object>} - {success: boolean, result: Object, error: string}
     */
    async processMembershipPurchaseRecurring(studentId, membershipTypeId, startDate = null) {
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
            
            const requestBody = {
                studentId: studentId,
                membershipTypeId: membershipTypeId,
                paymentMethodId: paymentMethodResult.paymentMethod.id
            };
            
            if (startDate) {
                requestBody.startDate = startDate;
            }
            
            const response = await fetch(API_CONFIG.MEMBERSHIP_PURCHASE_RECURRING, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Membership subscription failed');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Membership subscription failed');
            }
            
            return {
                success: true,
                result: result
            };
            
        } catch (error) {
            console.error('Membership subscription error:', error);
            return {
                success: false,
                error: error.message || 'Membership subscription failed. Please try again.'
            };
        }
    }
    
    /**
     * Toggle membership auto-renew
     * @param {string} membershipId - Membership document ID
     * @param {boolean} enabled - True to enable auto-renew, false to disable
     * @returns {Promise<Object>} - {success: boolean, result: Object, error: string}
     */
    async toggleMembershipAutoRenew(membershipId, enabled) {
        try {
            // Get Firebase auth token
            const user = firebase.auth().currentUser;
            const token = user ? await user.getIdToken() : null;
            
            // Call Firebase Function
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(API_CONFIG.MEMBERSHIP_TOGGLE_AUTORENEW, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    membershipId: membershipId,
                    enabled: enabled
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update auto-renew');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to update auto-renew');
            }
            
            return {
                success: true,
                result: result
            };
            
        } catch (error) {
            console.error('Auto-renew toggle error:', error);
            return {
                success: false,
                error: error.message || 'Failed to update auto-renew. Please try again.'
            };
        }
    }
    
    /**
     * Cancel membership
     * @param {string} membershipId - Membership document ID
     * @returns {Promise<Object>} - {success: boolean, result: Object, error: string}
     */
    async cancelMembership(membershipId) {
        try {
            // Get Firebase auth token
            const user = firebase.auth().currentUser;
            const token = user ? await user.getIdToken() : null;
            
            // Get user's name for cancelledBy field
            const studentDoc = await firebase.firestore().collection('students').doc(user.uid).get();
            const studentData = studentDoc.data();
            const cancelledBy = `${studentData.firstName} ${studentData.lastName}`;
            
            // Call Firebase Function
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(API_CONFIG.MEMBERSHIP_CANCEL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    membershipId: membershipId,
                    cancelledBy: cancelledBy
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to cancel membership');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to cancel membership');
            }
            
            return {
                success: true,
                result: result
            };
            
        } catch (error) {
            console.error('Membership cancellation error:', error);
            return {
                success: false,
                error: error.message || 'Failed to cancel membership. Please try again.'
            };
        }
    }
    
    /**
     * Update membership payment method
     * @param {string} membershipId - Membership document ID
     * @param {string} paymentMethodId - Stripe payment method ID
     * @returns {Promise<Object>} - {success: boolean, result: Object, error: string}
     */
    async updateMembershipPaymentMethod(membershipId, paymentMethodId) {
        try {
            // Get Firebase auth token
            const user = firebase.auth().currentUser;
            const token = user ? await user.getIdToken() : null;
            
            // Call Firebase Function
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(API_CONFIG.MEMBERSHIP_UPDATE_PAYMENT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    membershipId: membershipId,
                    paymentMethodId: paymentMethodId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update payment method');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to update payment method');
            }
            
            return {
                success: true,
                result: result
            };
            
        } catch (error) {
            console.error('Payment method update error:', error);
            return {
                success: false,
                error: error.message || 'Failed to update payment method. Please try again.'
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
