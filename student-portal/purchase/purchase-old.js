// Purchase Concessions Page
// Handles concession package selection and payment processing

console.log('Purchase page loaded');

let stripe = null;
let cardElement = null;
let selectedPackage = null;
let concessionPackages = [];

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Purchase page DOM loaded');
    initializePage();
});

// Listen for student selection changes (from admin dropdown)
window.addEventListener('studentSelected', async (event) => {
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
        
        // Show main container
        document.getElementById('main-container').style.display = 'block';
        
        // Determine which student to load
        let studentId = null;
        
        if (isAuthorized) {
            // Admin view - check sessionStorage for selected student
            studentId = sessionStorage.getItem('currentStudentId');
            
            if (!studentId) {
                // Show empty state (admin only - no student selected)
                document.getElementById('empty-state').style.display = 'block';
                return;
            }
        } else {
            // Student view - load their own data
            studentId = await getCurrentStudentId();
            
            if (!studentId) {
                console.error('Could not load student data');
                alert('Error loading your data. Please try refreshing the page.');
                return;
            }
        }
        
        // Load purchase page for the student
        await loadPurchasePage(studentId);
        
    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Error loading page. Please try refreshing.');
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

// Get the current logged-in student's ID
async function getCurrentStudentId() {
    try {
        // Wait for Firebase Auth to be ready
        const user = await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
        
        if (!user) {
            console.error('No user logged in');
            return null;
        }
        
        const email = user.email.toLowerCase();
        
        // Find student by email
        const studentSnapshot = await window.db.collection('students')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (studentSnapshot.empty) {
            console.error('Student not found for email:', email);
            return null;
        }
        
        return studentSnapshot.docs[0].id;
        
    } catch (error) {
        console.error('Error getting current student ID:', error);
        return null;
    }
}

async function loadPurchasePage(studentId) {
    // Show content
    document.getElementById('purchase-content').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    
    // Load concession packages
    await loadConcessionPackages();
    
    // Initialize Stripe
    initializeStripe();
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

// Initialize Stripe Elements
function initializeStripe() {
    console.log('Initializing Stripe...');
    
    try {
        // Initialize Stripe with publishable key from config
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
        showSnackbar('Failed to initialize payment system. Please refresh the page.', 'error');
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
    
    // Process purchase
    await processPurchase();
});

// Process the purchase
async function processPurchase() {
    console.log('Processing purchase...');
    
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const originalText = submitText.textContent;
    
    submitBtn.disabled = true;
    submitText.textContent = 'Processing...';
    showLoading(true);
    
    try {
        // Get current student ID (works for both admin and student views)
        let studentId;
        if (isAuthorized) {
            studentId = sessionStorage.getItem('currentStudentId');
        } else {
            studentId = await getCurrentStudentId();
        }
        
        if (!studentId) {
            throw new Error('No student selected');
        }
        
        if (!selectedPackage) {
            throw new Error('No package selected');
        }
        
        // Create payment method from card element
        const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        console.log('Payment method created:', paymentMethod.id);
        
        // Call Firebase Function to process payment, create concession block, and create transaction
        const functionUrl = 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processConcessionPurchase';
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: studentId,
                packageId: selectedPackage.id,
                paymentMethodId: paymentMethod.id
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Purchase processing failed');
        }
        
        const result = await response.json();
        
        console.log('Purchase result:', result);
        
        if (result.success) {
            showSnackbar(`Purchase successful! ${result.numberOfClasses} classes added to your account.`, 'success');
            
            // Redirect to concessions page after short delay
            setTimeout(() => {
                window.location.href = '../concessions/index.html';
            }, 2000);
        } else {
            throw new Error(result.error || 'Purchase failed');
        }
        
    } catch (error) {
        console.error('Purchase error:', error);
        showSnackbar(error.message || 'Purchase failed. Please try again.', 'error');
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        showLoading(false);
    }
}

// Cancel button handler
document.getElementById('cancel-btn').addEventListener('click', () => {
    // Check if form has been modified
    if (checkForChanges()) {
        // Show confirmation modal
        showCancelModal();
    } else {
        // Navigate back to dashboard
        window.location.href = '../dashboard/index.html';
    }
});

/**
 * Check if form has unsaved changes
 */
function checkForChanges() {
    const packageSelect = document.getElementById('package-select');
    const cardName = document.getElementById('card-name');
    
    // Check if any field has been filled
    return packageSelect.value || cardName.value.trim();
}

/**
 * Show cancel confirmation modal
 */
function showCancelModal() {
    const modal = document.getElementById('cancel-modal');
    modal.style.display = 'flex';
    
    // Add event listeners
    document.getElementById('cancel-modal-stay').onclick = closeCancelModal;
    document.getElementById('cancel-modal-leave').onclick = () => {
        window.location.href = '../dashboard/index.html';
    };
}

/**
 * Close cancel confirmation modal
 */
function closeCancelModal() {
    const modal = document.getElementById('cancel-modal');
    modal.style.display = 'none';
}

// Uses global window.showSnackbar from /components/snackbar/snackbar.js
// (Loaded via /js/utils/index.js)
