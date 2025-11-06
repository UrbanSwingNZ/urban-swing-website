// Pre-Pay for Class Page
// Handles casual entry payment processing

console.log('Pre-pay page loaded');

let stripe = null;
let cardElement = null;
let selectedRateId = null;
let casualRates = [];

// Calendar state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Pre-pay page DOM loaded');
    initializePage();
    
    // Setup custom calendar
    setupCustomCalendar();
});

// Setup custom calendar
function setupCustomCalendar() {
    const dateInput = document.getElementById('class-date');
    const calendar = document.getElementById('custom-calendar');
    
    // Show calendar when input is clicked
    dateInput.addEventListener('click', () => {
        calendar.style.display = 'block';
        renderCalendar();
    });
    
    // Close calendar when clicking outside
    document.addEventListener('click', (e) => {
        if (!dateInput.contains(e.target) && !calendar.contains(e.target)) {
            calendar.style.display = 'none';
        }
    });
}

// Render the calendar
function renderCalendar() {
    const calendar = document.getElementById('custom-calendar');
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    let html = `
        <div class="calendar-header">
            <button type="button" class="calendar-nav-btn" id="prev-month">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="calendar-month-year">${monthNames[currentMonth]} ${currentYear}</div>
            <button type="button" class="calendar-nav-btn" id="next-month">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="calendar-weekdays">
            <div class="calendar-weekday">Sun</div>
            <div class="calendar-weekday">Mon</div>
            <div class="calendar-weekday">Tue</div>
            <div class="calendar-weekday">Wed</div>
            <div class="calendar-weekday thursday">Thu</div>
            <div class="calendar-weekday">Fri</div>
            <div class="calendar-weekday">Sat</div>
        </div>
        <div class="calendar-days">
    `;
    
    // Add empty cells for days before the first day of month
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();
        const isThursday = dayOfWeek === 4;
        const isPast = date < today;
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        
        let classes = ['calendar-day'];
        if (isPast) {
            classes.push('past');
        } else if (isThursday) {
            classes.push('thursday');
            if (isToday) classes.push('today');
            if (isSelected) classes.push('selected');
        } else {
            classes.push('not-thursday');
        }
        
        html += `<div class="${classes.join(' ')}" data-date="${date.toISOString()}">${day}</div>`;
    }
    
    html += '</div>';
    calendar.innerHTML = html;
    
    // Add event listeners
    document.getElementById('prev-month').addEventListener('click', (e) => {
        e.stopPropagation();
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    document.getElementById('next-month').addEventListener('click', (e) => {
        e.stopPropagation();
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    // Add click listeners to Thursday dates
    calendar.querySelectorAll('.calendar-day.thursday:not(.past)').forEach(dayElement => {
        dayElement.addEventListener('click', (e) => {
            e.stopPropagation();
            const dateStr = dayElement.dataset.date;
            selectedDate = new Date(dateStr);
            
            // Format date for display
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            const formattedDate = selectedDate.toLocaleDateString('en-US', options);
            
            document.getElementById('class-date').value = formattedDate;
            document.getElementById('custom-calendar').style.display = 'none';
            
            console.log('Date selected:', selectedDate);
        });
    });
}

// Listen for student selection changes (from admin dropdown)
window.addEventListener('studentSelected', async (event) => {
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
        
        // Load prepay page for the student
        await loadPrepayPage(studentId);
        
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

async function loadPrepayPage(studentId) {
    // Show content
    document.getElementById('prepay-content').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    
    // Load casual rates
    await loadCasualRates();
    
    // Initialize Stripe
    initializeStripe();
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
document.getElementById('prepay-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Validation
    if (!selectedRateId) {
        showSnackbar('Please select an entry type.', 'error');
        return;
    }
    
    const classDate = document.getElementById('class-date').value;
    if (!classDate || !selectedDate) {
        showSnackbar('Please select a class date.', 'error');
        return;
    }
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showSnackbar('Please select a current or future date.', 'error');
        return;
    }
    
    // Validate it's a Thursday (should always be true with custom calendar)
    if (selectedDate.getDay() !== 4) {
        showSnackbar('Please select a Thursday. Classes are only held on Thursdays.', 'error');
        return;
    }
    
    // Process payment
    await processPayment();
});

// Process the payment
async function processPayment() {
    console.log('Processing payment...');
    
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
        
        const rate = casualRates.find(r => r.id === selectedRateId);
        if (!rate) {
            throw new Error('Invalid entry type selected');
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
        
        // Call Firebase Function to process payment and create transaction
        const functionUrl = 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processCasualPayment';
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: studentId,
                rateId: selectedRateId,
                classDate: selectedDate.toISOString(),
                paymentMethodId: paymentMethod.id
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Payment processing failed');
        }
        
        const result = await response.json();
        
        console.log('Payment result:', result);
        
        if (result.success) {
            showSnackbar('Payment successful! Your class has been pre-paid.', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '../dashboard/index.html';
            }, 2000);
        } else {
            throw new Error(result.error || 'Payment failed');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showSnackbar(error.message || 'Payment failed. Please try again.', 'error');
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
    const classDate = document.getElementById('class-date');
    const cardName = document.getElementById('card-name');
    
    // Check if any field has been filled
    return classDate.value.trim() || cardName.value.trim();
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
