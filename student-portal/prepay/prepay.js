// Pre-Pay for Class Page
// Handles casual entry payment processing

console.log('Pre-pay page loaded');

let stripe = null;
let cardNumber = null;
let cardExpiry = null;
let cardCvc = null;
let selectedRateId = null;
let casualRates = [];

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Pre-pay page DOM loaded');
    initializePage();
    
    // Set minimum date to today
    const dateInput = document.getElementById('class-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
});

// Listen for student selection changes (from admin dropdown)
window.addEventListener('studentSelected', async (event) => {
    console.log('Student selection changed:', event.detail);
    const student = event.detail;
    
    if (student) {
        // Reload the prepay page for the new student
        await loadPrepayPage(student.id);
    }
});

async function initializePage() {
    try {
        // Wait for auth to be ready
        await waitForAuth();
        
        // Check if student is selected (from sessionStorage)
        const studentId = sessionStorage.getItem('currentStudentId');
        
        if (!studentId && !isAuthorized) {
            // Student not logged in and no student selected
            console.error('No student selected');
            window.location.href = '../dashboard/index.html';
            return;
        }
        
        // Show main container
        document.getElementById('main-container').style.display = 'block';
        
        if (studentId) {
            // Load prepay page for the selected student
            await loadPrepayPage(studentId);
        } else {
            // Show empty state (admin only)
            document.getElementById('empty-state').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

function waitForAuth() {
    return new Promise((resolve) => {
        if (typeof isAuthorized !== 'undefined') {
            resolve();
        } else {
            const checkAuth = setInterval(() => {
                if (typeof isAuthorized !== 'undefined') {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        }
    });
}

async function loadPrepayPage(studentId) {
    console.log('Loading prepay page for student:', studentId);
    
    // Show content
    document.getElementById('prepay-content').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    
    // Load casual rates
    await loadCasualRates();
    
    // Initialize Stripe (disabled for now - coming soon)
    // initializeStripe();
}

// Load casual rates from Firestore
async function loadCasualRates() {
    console.log('Loading casual rates...');
    
    try {
        // Get all casual rates (filter in JS to avoid composite index)
        const ratesQuery = firebase.firestore()
            .collection('casualRates');
        
        const snapshot = await ratesQuery.get();
        
        if (snapshot.empty) {
            console.warn('No casual rates found');
            showSnackbar('No entry types available at this time.', 'warning');
            return;
        }
        
        casualRates = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Filter in JavaScript: only include active rates
            if (data.isActive !== false) {
                casualRates.push({
                    id: doc.id,
                    name: data.name,
                    price: data.price,
                    description: data.description || '',
                    isPromo: data.isPromo === true,
                    displayOrder: data.displayOrder || 999
                });
            }
        });
        
        // Sort by display order
        casualRates.sort((a, b) => a.displayOrder - b.displayOrder);
        
        console.log(`Loaded ${casualRates.length} rates:`, casualRates);
        
        // Populate radio buttons
        populateRateOptions();
        
    } catch (error) {
        console.error('Error loading casual rates:', error);
        showSnackbar('Failed to load entry types. Please try again.', 'error');
    }
}

// Populate the rate radio buttons
function populateRateOptions() {
    const container = document.getElementById('entry-type-options');
    
    if (casualRates.length === 0) {
        container.innerHTML = '<p class="loading-text">No entry types available</p>';
        return;
    }
    
    // Clear loading text
    container.innerHTML = '';
    
    // Add radio options
    casualRates.forEach((rate, index) => {
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
                    <span class="radio-price">$${rate.price.toFixed(2)}</span>
                </div>
        `;
        
        if (rate.description) {
            optionHTML += `<p class="radio-description">${escapeHtml(rate.description)}</p>`;
        }
        
        // Add student ID notice for student rates
        if (rate.name.toLowerCase().includes('student')) {
            optionHTML += `
                <div class="radio-notice">
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
            handleRateSelection();
        });
        
        container.appendChild(option);
    });
    
    // Set initial selection
    const checkedRadio = container.querySelector('input[type="radio"]:checked');
    if (checkedRadio) {
        selectedRateId = checkedRadio.value;
        updateSubmitButton();
    }
    
    // Add change listeners to all radio buttons
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', handleRateSelection);
    });
}

// Handle rate selection
function handleRateSelection() {
    const selectedRadio = document.querySelector('input[name="entry-type"]:checked');
    
    if (!selectedRadio) {
        selectedRateId = null;
        updateSubmitButton();
        return;
    }
    
    selectedRateId = selectedRadio.value;
    const rateData = JSON.parse(selectedRadio.dataset.rate);
    
    console.log('Rate selected:', rateData);
    
    // Update selected styling
    document.querySelectorAll('.radio-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    selectedRadio.closest('.radio-option').classList.add('selected');
    
    // Update submit button
    updateSubmitButton();
}

// Update submit button text based on selection
function updateSubmitButton() {
    const submitText = document.getElementById('submit-text');
    
    if (selectedRateId) {
        const rate = casualRates.find(r => r.id === selectedRateId);
        if (rate) {
            submitText.innerHTML = `Pay $${rate.price.toFixed(2)}`;
        }
    } else {
        submitText.innerHTML = 'Pay Now';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize Stripe Elements (disabled for now - coming soon)
function initializeStripe() {
    console.log('Initializing Stripe...');
    
    // NOTE: This is disabled until payment processing is set up
    // You'll need to add your Stripe publishable key here
    const STRIPE_PUBLISHABLE_KEY = 'YOUR_STRIPE_PUBLISHABLE_KEY';
    
    // Initialize Stripe
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements();
    
    // Create card elements
    const elementStyles = {
        base: {
            fontSize: '16px',
            color: '#333',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            '::placeholder': {
                color: '#999'
            }
        },
        invalid: {
            color: '#e74c3c'
        }
    };
    
    cardNumber = elements.create('cardNumber', {
        style: elementStyles,
        placeholder: '1234 5678 9012 3456'
    });
    cardNumber.mount('#card-number');
    
    cardExpiry = elements.create('cardExpiry', {
        style: elementStyles
    });
    cardExpiry.mount('#card-expiry');
    
    cardCvc = elements.create('cardCvc', {
        style: elementStyles,
        placeholder: '123'
    });
    cardCvc.mount('#card-cvc');
    
    // Add error handling
    cardNumber.on('change', handleStripeError);
    cardExpiry.on('change', handleStripeError);
    cardCvc.on('change', handleStripeError);
}

// Handle Stripe errors
function handleStripeError(event) {
    const errorDiv = document.getElementById('card-errors');
    if (event.error) {
        errorDiv.textContent = event.error.message;
        errorDiv.classList.add('visible');
    } else {
        errorDiv.textContent = '';
        errorDiv.classList.remove('visible');
    }
}

// Form submission handler
document.getElementById('prepay-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Validation
    if (!selectedRateId) {
        showSnackbar('Please select an entry type.', 'error');
        return;
    }
    
    const classDate = document.getElementById('class-date').value;
    if (!classDate) {
        showSnackbar('Please select a class date.', 'error');
        return;
    }
    
    // Check if date is in the past
    const selectedDate = new Date(classDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showSnackbar('Please select a current or future date.', 'error');
        return;
    }
    
    const cardName = document.getElementById('card-name').value.trim();
    if (!cardName) {
        showSnackbar('Please enter the name on the card.', 'error');
        return;
    }
    
    // Show coming soon message (since payment processing is not yet set up)
    showSnackbar('Online payments are coming soon! Please contact us to pre-pay for a class.', 'info', 5000);
    
    // Disabled until Stripe is fully set up:
    // await processPayment(classDate, cardName);
});

// Process the payment (placeholder for future Stripe integration)
async function processPayment(classDate, cardName) {
    console.log('Processing payment...');
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
        // Get current student
        const currentStudentId = sessionStorage.getItem('currentStudentId');
        if (!currentStudentId) {
            throw new Error('No student selected');
        }
        
        const rate = casualRates.find(r => r.id === selectedRateId);
        if (!rate) {
            throw new Error('Invalid entry type selected');
        }
        
        // TODO: Implement Stripe payment processing
        // 1. Create payment intent on server
        // 2. Confirm card payment with Stripe
        // 3. Create transaction record in Firestore
        // 4. Send confirmation email
        // 5. Store class date reservation
        
        showSnackbar('Payment successful!', 'success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = '../dashboard/index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Payment error:', error);
        showSnackbar(error.message || 'Payment failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// Cancel button handler
document.getElementById('cancel-btn').addEventListener('click', () => {
    // Check if form has been modified
    const classDate = document.getElementById('class-date');
    const cardName = document.getElementById('card-name');
    
    if (classDate.value || cardName.value) {
        if (confirm('Are you sure you want to cancel? Any entered information will be lost.')) {
            window.location.href = '../dashboard/index.html';
        }
    } else {
        window.location.href = '../dashboard/index.html';
    }
});

// Show snackbar notification
function showSnackbar(message, type = 'info', duration = 3000) {
    // Check if snackbar already exists
    let snackbar = document.getElementById('snackbar');
    
    if (!snackbar) {
        // Create snackbar element
        snackbar = document.createElement('div');
        snackbar.id = 'snackbar';
        snackbar.className = 'snackbar';
        document.body.appendChild(snackbar);
    }
    
    // Set message and type
    snackbar.textContent = message;
    snackbar.className = `snackbar ${type}`;
    
    // Show snackbar
    setTimeout(() => snackbar.classList.add('show'), 10);
    
    // Hide after duration
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}
