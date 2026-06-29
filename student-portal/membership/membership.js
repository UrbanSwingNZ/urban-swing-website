/**
 * Membership Page Logic
 * Handles membership purchase, management, and auto-renew
 */

import { showSnackbar } from '/js/utils/index.js';
import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { UpdatePaymentModal } from './update-payment-modal.js';
import MembershipService from './membership-service.js';

let currentUser = null;
let currentStudentId = null;
let membershipService = null;
let paymentService = null;
let selectedMembershipType = null;
let currentMembership = null;
let isViewingAsAdmin = false;

// Wait for Firebase and DOM
window.addEventListener('load', async () => {
    if (typeof firebase === 'undefined') {
        showSnackbar('Firebase SDK not loaded', 'error');
        return;
    }

    membershipService = new MembershipService();
    paymentService = new PaymentService();

    // Wait for auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            
            // Check if viewing as admin
            isViewingAsAdmin = typeof isAuthorized !== 'undefined' && isAuthorized;
            
            if (isViewingAsAdmin) {
                // Admin view - wait for student selection
                const savedStudentId = sessionStorage.getItem('currentStudentId');
                if (savedStudentId) {
                    currentStudentId = savedStudentId;
                    await initializePage();
                } else {
                    // Show empty state - waiting for student selection
                    showLoading(false);
                    document.getElementById('main-container').style.display = 'none';
                    document.getElementById('empty-state').style.display = 'block';
                }
            } else {
                // Regular student view
                currentStudentId = await getStudentIdByEmail(user.email);
                await initializePage();
            }
        } else {
            // Redirect to login
            window.location.href = '../index.html';
        }
    });
});

// Listen for student selection (admin view)
window.addEventListener('studentSelected', async (event) => {
    if (event.detail && event.detail.student) {
        currentStudentId = event.detail.student.id;
        
        // Hide empty state
        document.getElementById('empty-state').style.display = 'none';
        
        await initializePage();
    } else {
        // No student selected - show empty state
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
    }
});

/**
 * Get student ID by email
 */
async function getStudentIdByEmail(email) {
    try {
        const snapshot = await firebase.firestore()
            .collection('students')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error getting student ID:', error);
        return null;
    }
}

/**
 * Initialize the membership page
 */
async function initializePage() {
    try {
        showLoading(true);

        // Check if student is improver
        const isImprover = await membershipService.isImprover(currentStudentId);

        if (!isImprover) {
            // Show not eligible section
            showSection('not-eligible');
            return;
        }

        // Load current membership (active or most recently expired)
        currentMembership = await membershipService.getCurrentMembership(currentStudentId);

        if (currentMembership) {
            if (currentMembership.status === 'active') {
                // Student has active membership - show management view
                // Reset section header in case it was changed
                const sectionHeader = document.querySelector('#current-membership-section .section-header h2');
                if (sectionHeader) {
                    sectionHeader.innerHTML = '<i class="fas fa-id-card"></i> My Membership';
                }
                await displayCurrentMembership();
                showSection('current-membership');
            } else if (currentMembership.status === 'expired') {
                // Student has expired membership - show both expired details and purchase options
                // Update section header for expired membership
                const sectionHeader = document.querySelector('#current-membership-section .section-header h2');
                if (sectionHeader) {
                    sectionHeader.innerHTML = '<i class="fas fa-history"></i> Previous Membership';
                }
                await displayCurrentMembership();
                await displayAvailableMemberships();
                showSection('expired-membership');
            } else {
                // Inactive or other status - show purchase view
                await displayAvailableMemberships();
                showSection('purchase-membership');
            }
        } else {
            // No membership at all - show purchase view
            await displayAvailableMemberships();
            showSection('purchase-membership');
        }

    } catch (error) {
        console.error('Error initializing page:', error);
        showSnackbar('Failed to load membership information', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Show specific section
 */
function showSection(section) {
    document.getElementById('current-membership-section').style.display = 'none';
    document.getElementById('purchase-membership-section').style.display = 'none';
    document.getElementById('not-eligible-section').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';

    if (section === 'current-membership') {
        document.getElementById('current-membership-section').style.display = 'block';
    } else if (section === 'expired-membership') {
        // Show both expired details and purchase options
        document.getElementById('current-membership-section').style.display = 'block';
        document.getElementById('purchase-membership-section').style.display = 'block';
    } else if (section === 'purchase-membership') {
        document.getElementById('purchase-membership-section').style.display = 'block';
    } else if (section === 'not-eligible') {
        document.getElementById('not-eligible-section').style.display = 'block';
    }
}

/**
 * Display current membership details
 */
async function displayCurrentMembership() {
    const container = document.getElementById('membership-details-card');

    const expiryDate = currentMembership.currentPeriodEnd.toDate();
    const formattedExpiry = expiryDate.toLocaleDateString('en-NZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const isRecurring = currentMembership.isRecurring === true;
    const paymentMethod = (currentMembership.paymentMethod || '').toLowerCase();
    
    // Determine status badge
    let statusBadge;
    if (currentMembership.status === 'active') {
        statusBadge = '<span class="membership-status-badge active">Active</span>';
    } else if (currentMembership.status === 'expired') {
        statusBadge = '<span class="membership-status-badge expired">Expired</span>';
    } else {
        statusBadge = '<span class="membership-status-badge inactive">Inactive</span>';
    }
    
    // If membership is expired, show special UI
    if (currentMembership.status === 'expired') {
        container.innerHTML = `
            <div class="membership-status">
                <h3><i class="fas fa-id-card"></i> ${currentMembership.typeName}</h3>
                ${statusBadge}
            </div>
            
            <div class="expired-message">
                <h3><i class="fas fa-exclamation-triangle"></i> Your membership has expired</h3>
                <p>Your membership expired on ${formattedExpiry}. Purchase a new membership below to continue attending classes.</p>
                <button class="btn-primary btn-primary-lg" id="scroll-to-purchase-btn">
                    <i class="fas fa-shopping-cart"></i> Purchase Membership
                </button>
            </div>
        `;
        
        // Add event listener for scroll button
        const scrollBtn = document.getElementById('scroll-to-purchase-btn');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', scrollToPurchase);
        }
        
        return;
    }

    container.innerHTML = `
        <div class="membership-status">
            <h3><i class="fas fa-id-card"></i> ${currentMembership.typeName}</h3>
            ${statusBadge}
        </div>

        <div class="membership-details-grid">
            <div class="detail-item">
                <span class="detail-label"><i class="fas fa-dollar-sign"></i> Monthly Price</span>
                <span class="detail-value price">$${currentMembership.price.toFixed(2)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label"><i class="fas fa-calendar-alt"></i> Valid Until</span>
                <span class="detail-value">${formattedExpiry}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label"><i class="fas fa-sync-alt"></i> Membership Type</span>
                <span class="detail-value">${isRecurring ? 'Auto-Renewing' : 'One-Time'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label"><i class="fas fa-credit-card"></i> Payment Method</span>
                <span class="detail-value">${formatPaymentMethod(currentMembership)}</span>
            </div>
        </div>

        ${isRecurring && paymentMethod === 'online' && currentMembership.status === 'active' ? `
        <div class="autorenew-toggle">
            <div class="autorenew-toggle-header">
                <h4><i class="fas fa-sync-alt"></i> Auto-Renew</h4>
                <label class="toggle-switch">
                    <input 
                        type="checkbox" 
                        id="autorenew-toggle-input"
                        ${currentMembership.autoRenew ? 'checked' : ''}
                    >
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <p class="autorenew-description">
                When enabled, your membership will automatically renew monthly. 
                Turning this off will not cancel your current membership - you'll have access until ${formattedExpiry}.
            </p>
        </div>
        ` : ''}

        ${isRecurring ? `
        <div class="membership-actions">
            ${paymentMethod === 'online' ? `
            <button class="btn-secondary btn-secondary-lg" id="update-payment-btn">
                <i class="fas fa-credit-card"></i> Update Payment Method
            </button>
            ` : ''}
            <button class="btn-secondary btn-secondary-lg" id="view-transactions-btn">
                <i class="fas fa-receipt"></i> View Transaction History
            </button>
        </div>
        ` : ''}
    `;

    // Setup event listeners
    if (isRecurring && paymentMethod === 'online' && currentMembership.status === 'active') {
        const toggleInput = document.getElementById('autorenew-toggle-input');
        toggleInput.addEventListener('change', handleAutoRenewToggle);
    }

    const updatePaymentBtn = document.getElementById('update-payment-btn');
    if (updatePaymentBtn) {
        updatePaymentBtn.addEventListener('click', handleUpdatePaymentMethod);
    }

    const viewTransactionsBtn = document.getElementById('view-transactions-btn');
    if (viewTransactionsBtn) {
        viewTransactionsBtn.addEventListener('click', () => {
            window.location.href = '../transactions/index.html';
        });
    }
}

/**
 * Display available memberships for purchase
 */
async function displayAvailableMemberships() {
    try {
        const membershipTypes = await membershipService.getActiveMembershipTypes();
        const container = document.getElementById('available-memberships');

        if (membershipTypes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <h3>No Memberships Available</h3>
                    <p>Memberships are not currently available. Please contact an admin.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        membershipTypes.forEach(membershipType => {
            const card = createMembershipOptionCard(membershipType);
            container.appendChild(card);
        });

        // Setup cancel purchase button
        document.getElementById('cancel-purchase-button').addEventListener('click', () => {
            document.getElementById('payment-form-container').style.display = 'none';
            selectedMembershipType = null;
            // Remove selected class from all cards
            document.querySelectorAll('.membership-option-card').forEach(card => {
                card.classList.remove('selected');
            });
        });

        // Setup form submission
        document.getElementById('membership-purchase-form').addEventListener('submit', handlePurchaseSubmit);

        // Update submit button state when terms checkbox changes
        document.getElementById('terms-accepted').addEventListener('change', updateSubmitButtonState);

        // Update disclosure visibility when membership type changes
        document.querySelectorAll('input[name="membership-type"]').forEach(radio => {
            radio.addEventListener('change', updateDisclosureVisibility);
        });

    } catch (error) {
        console.error('Error loading memberships:', error);
        showSnackbar('Failed to load memberships', 'error');
    }
}

/**
 * Create membership option card
 */
function createMembershipOptionCard(membershipType) {
    const card = document.createElement('div');
    card.className = 'membership-option-card';
    card.setAttribute('data-membership-id', membershipType.id);

    card.innerHTML = `
        <div class="membership-option-name">${membershipType.name}</div>
        <div class="membership-option-price">$${membershipType.price.toFixed(2)} <span>/month</span></div>
        ${membershipType.description ? `
            <div class="membership-option-description">${membershipType.description}</div>
        ` : ''}
        <ul class="membership-option-features">
            <li><i class="fas fa-check-circle"></i> Unlimited class access</li>
            <li><i class="fas fa-check-circle"></i> Priority booking</li>
            <li><i class="fas fa-check-circle"></i> Cancel anytime</li>
        </ul>
        <button class="btn-primary btn-primary-lg btn-select-membership">
            <i class="fas fa-arrow-right"></i> Select This Membership
        </button>
    `;

    // Add click handler
    const selectButton = card.querySelector('.btn-select-membership');
    selectButton.addEventListener('click', (e) => {
        e.stopPropagation();
        selectMembership(membershipType, card);
    });

    return card;
}

/**
 * Select a membership for purchase
 */
function selectMembership(membershipType, card) {
    selectedMembershipType = membershipType;

    // Update selected state
    document.querySelectorAll('.membership-option-card').forEach(c => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');

    // Show payment form
    const formContainer = document.getElementById('payment-form-container');
    formContainer.style.display = 'block';

    // Populate summary
    const summary = document.getElementById('selected-membership-summary');
    summary.innerHTML = `
        <h4>${membershipType.name}</h4>
        <p><strong>$${membershipType.price.toFixed(2)}/month</strong></p>
        ${membershipType.description ? `<p>${membershipType.description}</p>` : ''}
    `;

    // Initialize Stripe if not already done
    if (!paymentService.initialized) {
        paymentService.initialize('card-element', 'card-errors');
    }

    // Scroll to form
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Update submit button state
 */
function updateSubmitButtonState() {
    const termsAccepted = document.getElementById('terms-accepted').checked;
    const cardComplete = paymentService.isCardComplete;
    const submitButton = document.getElementById('submit-button');

    submitButton.disabled = !(termsAccepted && cardComplete);
}

// Make function available globally for PaymentService
window.updateSubmitButtonState = updateSubmitButtonState;

/**
 * Update disclosure visibility based on membership type
 */
function updateDisclosureVisibility() {
    const isRecurring = document.querySelector('input[name="membership-type"]:checked').value === 'recurring';
    const disclosure = document.getElementById('autorenew-disclosure');
    disclosure.style.display = isRecurring ? 'flex' : 'none';
}

/**
 * Handle purchase form submission
 */
async function handlePurchaseSubmit(event) {
    event.preventDefault();

    if (!selectedMembershipType) {
        showSnackbar('Please select a membership', 'error');
        return;
    }

    const submitButton = document.getElementById('submit-button');
    const originalText = submitButton.innerHTML;

    try {
        // Disable submit button
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Get membership type (recurring or one-time)
        const membershipType = document.querySelector('input[name="membership-type"]:checked').value;
        const isRecurring = membershipType === 'recurring';

        // Process payment
        let result;
        if (isRecurring) {
            result = await paymentService.processMembershipPurchaseRecurring(currentStudentId, selectedMembershipType.id);
        } else {
            result = await paymentService.processMembershipPurchaseOneTime(currentStudentId, selectedMembershipType.id);
        }

        if (result.success) {
            showSnackbar('Membership activated successfully!', 'success');
            
            // Wait a moment then reload to show membership details
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            throw new Error(result.error || 'Purchase failed');
        }

    } catch (error) {
        console.error('Purchase error:', error);
        showSnackbar(error.message || 'Failed to process purchase', 'error');
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Handle auto-renew toggle
 */
async function handleAutoRenewToggle(event) {
    const enabled = event.target.checked;
    const toggleInput = event.target;

    // Show confirmation modal
    const modal = new ConfirmationModal({
        title: enabled ? 'Enable Auto-Renew?' : 'Disable Auto-Renew?',
        message: enabled 
            ? 'Your membership will automatically renew monthly until you turn off auto-renew or cancel your membership.'
            : 'Your membership will not renew after the current period ends. You will keep access until the expiry date.',
        confirmText: enabled ? 'Enable Auto-Renew' : 'Disable Auto-Renew',
        cancelText: 'Cancel',
        type: enabled ? 'primary' : 'warning',
        onConfirm: async () => {
            try {
                showLoading(true);
                
                const result = await paymentService.toggleMembershipAutoRenew(currentMembership.id, enabled);
                
                if (result.success) {
                    showSnackbar(enabled ? 'Auto-renew enabled' : 'Auto-renew disabled', 'success');
                    // Reload to show updated status
                    await initializePage();
                } else {
                    throw new Error(result.error || 'Failed to update auto-renew');
                }
            } catch (error) {
                console.error('Auto-renew toggle error:', error);
                showSnackbar(error.message || 'Failed to update auto-renew', 'error');
                // Revert toggle
                toggleInput.checked = !enabled;
            } finally {
                showLoading(false);
            }
        },
        onCancel: () => {
            // Revert toggle
            toggleInput.checked = !enabled;
        }
    });

    modal.show();
}

/**
 * Handle update payment method button click
 */
async function handleUpdatePaymentMethod() {
    if (!currentMembership) {
        showSnackbar('No active membership found', 'error');
        return;
    }

    // Create and show the update payment modal
    const modal = new UpdatePaymentModal({
        currentMembership: currentMembership,
        onSuccess: async (result) => {
            // Refresh the page to show updated card info
            await initializePage();
        }
    });
    
    modal.show();
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(membership) {
    const method = (membership.paymentMethod || '').toLowerCase();
    
    // If it's an online payment with a card, show the last4 digits
    if (method === 'online' && membership.last4) {
        return `Card ending •••• ${membership.last4}`;
    }
    
    // Otherwise, show the payment method name
    switch (method) {
        case 'cash':
            return 'Cash';
        case 'eftpos':
            return 'EFTPOS';
        case 'bank-transfer':
        case 'bank transfer':
            return 'Bank Transfer';
        case 'online':
            return 'Online';
        case 'comp':
            return 'Complimentary';
        default:
            return 'Unknown';
    }
}

/**
 * Scroll to purchase section
 */
function scrollToPurchase() {
    const purchaseSection = document.getElementById('purchase-membership-section');
    if (purchaseSection) {
        purchaseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    const container = document.getElementById('main-container');
    if (show) {
        container.style.opacity = '0.5';
        container.style.pointerEvents = 'none';
    } else {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    }
}
