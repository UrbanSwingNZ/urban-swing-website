/**
 * payment-handler.js
 * Handles Stripe payment processing for student registration
 */

// Initialize Stripe
let stripe;
let cardElement;
let selectedPackageId = null;
let availablePackages = {};

/**
 * Initialize Stripe and card element
 */
function initializeStripe() {
    try {
        // Initialize Stripe with publishable key
        stripe = Stripe(stripeConfig.publishableKey);
        
        // Create card element
        const elements = stripe.elements();
        cardElement = elements.create('card', {
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
            hidePostalCode: true,  // Hide postal code field for NZ market
            disableLink: true      // Disable "Save with Link" feature
        });
        
        // Mount card element to the DOM
        cardElement.mount('#card-element');
        
        // Handle real-time validation errors
        cardElement.on('change', function(event) {
            const cardErrors = document.getElementById('card-errors');
            if (event.error) {
                cardErrors.textContent = event.error.message;
                cardErrors.style.display = 'block';
            } else {
                cardErrors.textContent = '';
                cardErrors.style.display = 'none';
            }
        });
        
        console.log('Stripe initialized successfully');
    } catch (error) {
        console.error('Error initializing Stripe:', error);
        showError('Failed to initialize payment system. Please refresh the page.');
    }
}

/**
 * Load available casual rates from Firestore
 */
async function loadCasualRates() {
    const rateOptionsContainer = document.getElementById('rate-options');
    
    try {
        // Query casualRates collection for active, non-promo rates
        const snapshot = await db.collection('casualRates')
            .where('isActive', '==', true)
            .where('isPromo', '==', false)
            .get();
        
        if (snapshot.empty) {
            rateOptionsContainer.innerHTML = `
                <div class="error-message" style="display: block;">
                    <i class="fas fa-exclamation-triangle"></i>
                    No payment options available. Please contact us.
                </div>
            `;
            return;
        }
        
        // Build packages object and sort by price
        const packages = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            availablePackages[doc.id] = {
                id: doc.id,
                name: data.name,
                price: data.price,
                description: data.description || null
            };
            packages.push(availablePackages[doc.id]);
        });
        
        // Sort by price (descending) so regular casual entry appears first
        packages.sort((a, b) => b.price - a.price);
        
        // Render rate options
        rateOptionsContainer.innerHTML = '';
        packages.forEach((pkg, index) => {
            const rateOption = document.createElement('label');
            rateOption.className = 'rate-option';
            rateOption.innerHTML = `
                <input 
                    type="radio" 
                    name="rateType" 
                    value="${pkg.id}" 
                    ${index === 0 ? 'checked' : ''}
                    required
                >
                <span class="rate-label">
                    <span class="rate-name">${pkg.name}</span>
                    <span class="rate-price">$${pkg.price.toFixed(2)}</span>
                </span>
            `;
            
            // Add change event listener
            const radioInput = rateOption.querySelector('input[type="radio"]');
            radioInput.addEventListener('change', function() {
                selectedPackageId = this.value;
                console.log('Selected package:', selectedPackageId, availablePackages[selectedPackageId]);
            });
            
            rateOptionsContainer.appendChild(rateOption);
        });
        
        // Set default selection
        if (packages.length > 0) {
            selectedPackageId = packages[0].id;
            console.log('Default package selected:', selectedPackageId);
        }
        
    } catch (error) {
        console.error('Error loading casual rates:', error);
        rateOptionsContainer.innerHTML = `
            <div class="error-message" style="display: block;">
                <i class="fas fa-exclamation-triangle"></i>
                Failed to load payment options. Please try again.
            </div>
        `;
    }
}

/**
 * Create payment method from card element
 * @returns {Promise<string|null>} Payment method ID or null if failed
 */
async function createPaymentMethod() {
    try {
        const {paymentMethod, error} = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement
        });
        
        if (error) {
            console.error('Payment method creation error:', error);
            showError(error.message);
            return null;
        }
        
        console.log('Payment method created:', paymentMethod.id);
        return paymentMethod.id;
        
    } catch (error) {
        console.error('Unexpected error creating payment method:', error);
        showError('Failed to process card details. Please try again.');
        return null;
    }
}

/**
 * Process payment and create student account
 * @param {Object} formData - Registration form data
 * @returns {Promise<Object>} Result object
 */
async function processRegistrationWithPayment(formData) {
    try {
        // Validate package is selected
        if (!selectedPackageId) {
            throw new Error('Please select a payment option');
        }
        
        // Create payment method
        const paymentMethodId = await createPaymentMethod();
        if (!paymentMethodId) {
            throw new Error('Failed to create payment method');
        }
        
        // Call Firebase Function
        console.log('Calling createStudentWithPayment function...');
        
        // Check if functions is initialized
        if (!window.functions) {
            throw new Error('Firebase Functions not initialized');
        }
        
        const createStudentWithPayment = window.functions.httpsCallable('createStudentWithPayment');
        
        const result = await createStudentWithPayment({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            packageId: selectedPackageId,
            paymentMethodId: paymentMethodId
        });
        
        console.log('Payment result:', result.data);
        
        if (result.data.success) {
            return {
                success: true,
                studentId: result.data.studentId,
                receiptUrl: result.data.receiptUrl
            };
        } else {
            throw new Error(result.data.error || 'Payment processing failed');
        }
        
    } catch (error) {
        console.error('Payment processing error:', error);
        throw error;
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Scroll to error
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initialize Stripe when DOM is ready and Firebase is initialized
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be initialized
    const checkFirebase = setInterval(() => {
        if (window.db && window.functions && typeof Stripe !== 'undefined' && typeof stripeConfig !== 'undefined') {
            clearInterval(checkFirebase);
            initializeStripe();
            loadCasualRates();
        }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!stripe) {
            console.error('Failed to initialize Stripe - timeout');
            console.error('Debug info:', {
                db: !!window.db,
                functions: !!window.functions,
                Stripe: typeof Stripe !== 'undefined',
                stripeConfig: typeof stripeConfig !== 'undefined'
            });
            showError('Failed to load payment system. Please refresh the page.');
        }
    }, 10000);
});
