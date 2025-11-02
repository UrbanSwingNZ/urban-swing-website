// Purchase Concessions Page
// Handles concession package selection and payment processing

console.log('Purchase page loaded');

let stripe = null;
let cardNumber = null;
let cardExpiry = null;
let cardCvc = null;
let selectedPackage = null;
let concessionPackages = [];

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Purchase page DOM loaded');
    initializePage();
});

// Listen for student selection changes (from admin dropdown)
window.addEventListener('studentSelected', async (event) => {
    console.log('Student selection changed:', event.detail);
    const student = event.detail;
    
    if (student) {
        // Reload the purchase page for the new student
        await loadPurchasePage(student.id);
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
            // Load purchase page for the selected student
            await loadPurchasePage(studentId);
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

async function loadPurchasePage(studentId) {
    console.log('Loading purchase page for student:', studentId);
    
    // Show content
    document.getElementById('purchase-content').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    
    // Load concession packages
    await loadConcessionPackages();
    
    // Initialize Stripe (disabled for now - coming soon)
    // initializeStripe();
}

// Load concession packages from Firestore
async function loadConcessionPackages() {
    console.log('Loading concession packages...');
    
    try {
        // Get all concession packages (filter in JS to avoid composite index)
        const packagesQuery = firebase.firestore()
            .collection('concessionPackages');
        
        const snapshot = await packagesQuery.get();
        
        if (snapshot.empty) {
            console.warn('No concession packages found');
            showSnackbar('No concession packages available at this time.', 'warning');
            return;
        }
        
        concessionPackages = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Filter in JavaScript: only include active, non-promo packages
            if (data.isActive !== false && data.isPromo === false) {
                concessionPackages.push({
                    id: doc.id,
                    name: data.name,
                    numberOfClasses: data.numberOfClasses,
                    price: data.price,
                    expiryMonths: data.expiryMonths,
                    displayOrder: data.displayOrder || 0
                });
            }
        });
        
        // Sort by display order
        concessionPackages.sort((a, b) => a.displayOrder - b.displayOrder);
        
        console.log(`Loaded ${concessionPackages.length} packages:`, concessionPackages);
        
        // Populate dropdown
        populatePackageDropdown();
        
    } catch (error) {
        console.error('Error loading concession packages:', error);
        showSnackbar('Failed to load concession packages. Please try again.', 'error');
    }
}

// Populate the package dropdown
function populatePackageDropdown() {
    const select = document.getElementById('package-select');
    
    // Clear existing options
    select.innerHTML = '<option value="">Select a package...</option>';
    
    // Add package options
    concessionPackages.forEach(pkg => {
        const option = document.createElement('option');
        option.value = pkg.id;
        option.textContent = `${pkg.name} - $${pkg.price.toFixed(2)}`;
        option.dataset.package = JSON.stringify(pkg);
        select.appendChild(option);
    });
    
    // Add change event listener
    select.addEventListener('change', handlePackageSelection);
}

// Handle package selection
function handlePackageSelection(event) {
    const select = event.target;
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption.value) {
        // No package selected
        selectedPackage = null;
        document.getElementById('package-details').style.display = 'none';
        updateSubmitButton();
        return;
    }
    
    // Get package data
    selectedPackage = JSON.parse(selectedOption.dataset.package);
    console.log('Package selected:', selectedPackage);
    
    // Show package details
    const detailsDiv = document.getElementById('package-details');
    const descriptionSpan = document.getElementById('package-description');
    
    let description = `${selectedPackage.numberOfClasses} class${selectedPackage.numberOfClasses > 1 ? 'es' : ''}`;
    if (selectedPackage.expiryMonths) {
        description += ` • Valid for ${selectedPackage.expiryMonths} month${selectedPackage.expiryMonths > 1 ? 's' : ''}`;
    }
    description += ` • $${selectedPackage.price.toFixed(2)}`;
    
    descriptionSpan.textContent = description;
    detailsDiv.style.display = 'block';
    
    // Update submit button text
    updateSubmitButton();
}

// Update submit button text based on selection
function updateSubmitButton() {
    const submitText = document.getElementById('submit-text');
    
    if (selectedPackage) {
        submitText.textContent = `Purchase for $${selectedPackage.price.toFixed(2)}`;
    } else {
        submitText.textContent = 'Purchase Concessions';
    }
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
document.getElementById('purchase-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Validation
    if (!selectedPackage) {
        showSnackbar('Please select a concession package.', 'error');
        return;
    }
    
    const cardName = document.getElementById('card-name').value.trim();
    if (!cardName) {
        showSnackbar('Please enter the name on the card.', 'error');
        return;
    }
    
    // Show coming soon message (since payment processing is not yet set up)
    showSnackbar('Online payments are coming soon! Please contact us to purchase concessions.', 'info', 5000);
    
    // Disabled until Stripe is fully set up:
    // await processPurchase(cardName);
});

// Process the purchase (placeholder for future Stripe integration)
async function processPurchase(cardName) {
    console.log('Processing purchase...');
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
        // Get current student
        const currentStudentId = sessionStorage.getItem('currentStudentId');
        if (!currentStudentId) {
            throw new Error('No student selected');
        }
        
        // TODO: Implement Stripe payment processing
        // 1. Create payment intent on server
        // 2. Confirm card payment with Stripe
        // 3. Create concession block in Firestore
        // 4. Create transaction record
        // 5. Send confirmation email
        
        showSnackbar('Purchase successful!', 'success');
        
        // Redirect to concessions page after short delay
        setTimeout(() => {
            window.location.href = '../concessions/index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Purchase error:', error);
        showSnackbar(error.message || 'Purchase failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// Cancel button handler
document.getElementById('cancel-btn').addEventListener('click', () => {
    // Check if form has been modified
    const packageSelect = document.getElementById('package-select');
    const cardName = document.getElementById('card-name');
    
    if (packageSelect.value || cardName.value) {
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
