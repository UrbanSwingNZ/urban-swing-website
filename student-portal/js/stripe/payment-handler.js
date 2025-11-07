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
            
            // Add student ID notice for student rates
            if (pkg.name.toLowerCase().includes('student')) {
                const notice = document.createElement('div');
                notice.className = 'radio-notice';
                notice.style.display = 'none';
                notice.innerHTML = `
                    <i class="fas fa-id-card"></i>
                    <p><strong>Note:</strong> You will be required to present a valid student ID when you arrive for class.</p>
                `;
                rateOption.appendChild(notice);
            }
            
            // Add change event listener
            const radioInput = rateOption.querySelector('input[type="radio"]');
            radioInput.addEventListener('change', function() {
                selectedPackageId = this.value;
                console.log('Selected package:', selectedPackageId, availablePackages[selectedPackageId]);
                
                // Show/hide student ID notices based on selection
                document.querySelectorAll('.radio-notice').forEach(notice => {
                    const parentOption = notice.closest('.rate-option');
                    const parentRadio = parentOption.querySelector('input[type="radio"]');
                    
                    if (parentRadio.checked) {
                        notice.style.display = 'flex';
                        // Trigger animation
                        setTimeout(() => notice.classList.add('show'), 10);
                    } else {
                        notice.classList.remove('show');
                        setTimeout(() => notice.style.display = 'none', 300);
                    }
                });
            });
            
            rateOptionsContainer.appendChild(rateOption);
        });
        
        // Set default selection
        if (packages.length > 0) {
            selectedPackageId = packages[0].id;
            console.log('Default package selected:', selectedPackageId);
            
            // Show notice for initially selected student rate
            setTimeout(() => {
                const checkedRadio = rateOptionsContainer.querySelector('input[type="radio"]:checked');
                if (checkedRadio) {
                    const parentOption = checkedRadio.closest('.rate-option');
                    const notice = parentOption.querySelector('.radio-notice');
                    if (notice) {
                        notice.style.display = 'flex';
                        setTimeout(() => notice.classList.add('show'), 10);
                    }
                }
            }, 50);
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
        
        // Call Firebase Function (HTTP endpoint)
        console.log('Calling createStudentWithPayment function...');
        
        const functionUrl = 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/createStudentWithPayment';
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                pronouns: formData.pronouns,
                over16Confirmed: formData.over16Confirmed,
                termsAccepted: formData.termsAccepted,
                emailConsent: formData.emailConsent,
                packageId: selectedPackageId,
                paymentMethodId: paymentMethodId
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Payment processing failed');
        }
        
        const result = await response.json();
        
        console.log('Payment result:', result);
        
        if (result.success) {
            return {
                success: true,
                studentId: result.studentId,
                receiptUrl: result.receiptUrl
            };
        } else {
            throw new Error(result.error || 'Payment processing failed');
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
