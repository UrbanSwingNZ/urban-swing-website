/**
 * Student Portal - Workshops Page
 * Loads workshops for the current student, handles registration and video access.
 */

import { BaseModal } from '/components/modals/modal-base.js';
import { showSnackbar } from '/components/snackbar/snackbar.js';
import { LoadingSpinner } from '/components/loading-spinner/loading-spinner.js';

// ============================================
// STATE
// ============================================

let currentStudentId = null;
let currentStudentName = null;
let allWorkshops = [];
let currentFilter = 'upcoming';
let registrationModal = null;
let paymentService = null;

const db = window.db || firebase.firestore();

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeWorkshops();
});

/**
 * Re-initialize when admin switches student
 */
window.addEventListener('studentSelected', async (event) => {
    const student = event.detail?.student;
    if (student) {
        currentStudentId = student.id;
        currentStudentName = `${student.firstName} ${student.lastName}`;
        await loadWorkshops(currentStudentId);
    }
});

/**
 * Initialize the workshops page
 */
async function initializeWorkshops() {
    try {
        // waitForAuth() resolves as soon as isAuthorized is *defined* (initially false),
        // which is before the actual async Firebase auth check sets it to true.
        // Instead, wait for the authCheckComplete event that auth-check.js dispatches
        // once the real check finishes.
        await new Promise((resolve) => {
            window.addEventListener('authCheckComplete', resolve, { once: true });
        });

        currentStudentId = await getActiveStudentId();

        if (!currentStudentId) {
            // Admin with no student selected
            document.getElementById('empty-state').style.display = 'block';
            return;
        }

        // Get student name for header
        const student = await getStudentById(currentStudentId);
        if (student) {
            currentStudentName = `${student.firstName} ${student.lastName}`;
            document.getElementById('student-name').innerHTML =
                `${student.firstName}'s Workshops`;
        }

        await loadWorkshops(currentStudentId);

    } catch (error) {
        console.error('Error initializing workshops:', error);
        showSnackbar('Error loading workshops. Please refresh the page.', 'error');
    }
}

// ============================================
// DATA LOADING
// ============================================

/**
 * Load workshops visible to the current student
 * @param {string} studentId
 */
async function loadWorkshops(studentId) {
    try {
        LoadingSpinner.showGlobal('Loading workshops...');

        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('workshops-content').style.display = 'block';
        document.getElementById('no-workshops').style.display = 'none';
        document.getElementById('workshops-list').innerHTML = '';

        // Two queries: open-to-all and invited
        const [openSnap, invitedSnap] = await Promise.all([
            db.collection('workshops')
                .where('openToAll', '==', true)
                .get(),
            db.collection('workshops')
                .where('invitedStudents', 'array-contains', studentId)
                .get()
        ]);

        const workshopMap = new Map();

        openSnap.forEach(doc => {
            workshopMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        invitedSnap.forEach(doc => {
            if (!workshopMap.has(doc.id)) {
                workshopMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });

        // Sort by date descending
        allWorkshops = Array.from(workshopMap.values()).sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(0);
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(0);
            return dateB - dateA;
        });

        applyFilter(currentFilter);

    } catch (error) {
        console.error('Error loading workshops:', error);
        showSnackbar('Error loading workshops.', 'error');
    } finally {
        LoadingSpinner.hideGlobal();
    }
}

/**
 * Get the student's registration status for a workshop
 * @param {Object} workshop
 * @param {string} studentId
 * @returns {'attended'|'registered'|'not-registered'}
 */
function getStudentStatus(workshop, studentId) {
    const checkedIn = workshop.checkedInStudents || [];
    if (checkedIn.includes(studentId)) return 'attended';

    const registered = workshop.registeredStudents || [];
    if (registered.some(r => r.studentId === studentId)) return 'registered';

    return 'not-registered';
}

// ============================================
// RENDERING
// ============================================

/**
 * Apply filter and re-render workshop list
 * @param {string} filter - 'upcoming'|'past'|'registered'
 */
function applyFilter(filter) {
    currentFilter = filter;

    // Update tab active state
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    const now = new Date();
    let filtered;

    if (filter === 'upcoming') {
        filtered = allWorkshops.filter(w => {
            const date = w.date?.toDate ? w.date.toDate() : new Date(0);
            return date >= now;
        }).reverse(); // Upcoming: ascending order
    } else { // 'past'
        filtered = allWorkshops.filter(w => {
            const date = w.date?.toDate ? w.date.toDate() : new Date(0);
            if (date >= now) return false;
            const status = getStudentStatus(w, currentStudentId);
            return status === 'registered' || status === 'attended';
        });
    }

    renderWorkshops(filtered);
}

/**
 * Render workshop cards into the list
 * @param {Array} workshops
 */
function renderWorkshops(workshops) {
    const list = document.getElementById('workshops-list');
    const noWorkshops = document.getElementById('no-workshops');

    if (workshops.length === 0) {
        list.innerHTML = '';
        noWorkshops.style.display = 'block';

        const titles = {
            upcoming: 'No Upcoming Workshops',
            past: 'No Past Workshops'
        };
        const messages = {
            upcoming: 'There are no upcoming workshops at this time. Check back soon!',
            past: 'You have not attended or registered for any past workshops.'
        };
        document.getElementById('no-workshops-title').textContent = titles[currentFilter] || 'No Workshops';
        document.getElementById('no-workshops-message').textContent = messages[currentFilter] || '';
        return;
    }

    noWorkshops.style.display = 'none';
    list.innerHTML = workshops.map(w => renderWorkshopCard(w)).join('');

    // Attach card button listeners
    list.querySelectorAll('[data-action="register"]').forEach(btn => {
        btn.addEventListener('click', () => openWorkshopRegistrationModal(btn.dataset.workshopId));
    });
    list.querySelectorAll('[data-action="deregister"]').forEach(btn => {
        btn.addEventListener('click', () => handleDeregister(btn.dataset.workshopId));
    });
    list.querySelectorAll('[data-action="videos"]').forEach(btn => {
        btn.addEventListener('click', () => openWorkshopVideosModal(btn.dataset.workshopId));
    });
    list.querySelectorAll('[data-action="desc-toggle"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const wrapper = btn.parentElement;
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            if (expanded) {
                wrapper.classList.remove('expanded');
                btn.setAttribute('aria-expanded', 'false');
                btn.textContent = 'See more...';
            } else {
                wrapper.classList.add('expanded');
                btn.setAttribute('aria-expanded', 'true');
                btn.textContent = 'See less';
            }
        });
    });
}

/**
 * Render a single workshop card
 * @param {Object} workshop
 * @returns {string} HTML string
 */
function renderWorkshopCard(workshop) {
    const status = getStudentStatus(workshop, currentStudentId);
    const date = workshop.date?.toDate ? workshop.date.toDate() : null;
    const formattedDate = date ? formatWorkshopDate(date) : 'Date TBC';
    const cost = workshop.cost != null ? `$${workshop.cost}` : 'Free';
    const isCheckedIn = status === 'attended';
    const isPast = date && date < new Date();
    const videoCount = (workshop.videos || []).length;

    const statusLabels = {
        'not-registered': 'Not Registered',
        'registered': 'Registered',
        'attended': 'Attended'
    };

    const actionButtons = (() => {
        if (isPast) {
            const disabledBtn = (status === 'registered' || status === 'attended') ? `
                <button class="btn-deregister" disabled>
                    <i class="fas fa-times-circle"></i> De-register
                </button>
            ` : '';
            const videosBtn = isCheckedIn && videoCount > 0 ? `
                <button class="btn-videos" data-action="videos" data-workshop-id="${workshop.id}">
                    <i class="fas fa-video"></i> Videos (${videoCount})
                </button>
            ` : '';
            return disabledBtn + videosBtn;
        }

        if (status === 'not-registered') {
            return `
                <button class="btn-register" data-action="register" data-workshop-id="${workshop.id}">
                    <i class="fas fa-ticket-alt"></i> Register
                </button>
            `;
        }

        if (status === 'registered') {
            return `
                <button class="btn-deregister" data-action="deregister" data-workshop-id="${workshop.id}">
                    <i class="fas fa-times-circle"></i> De-register
                </button>
            `;
        }

        return ''; // attended on upcoming (edge case)
    })();

    return `
        <div class="workshop-card">
            <div class="workshop-card-header">
                <div class="workshop-card-title">
                    <div class="workshop-name">${escapeHtml(workshop.name || 'Untitled Workshop')}</div>
                    ${workshop.topic ? `<div class="workshop-topic">${escapeHtml(workshop.topic)}</div>` : ''}
                </div>
                <span class="workshop-status-badge ${status}">${statusLabels[status]}</span>
            </div>
            <div class="workshop-card-body">
                <div class="workshop-meta">
                    <div class="workshop-meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="workshop-meta-item">
                        <i class="fas fa-dollar-sign"></i>
                        <strong>${cost}</strong>
                    </div>
                    ${workshop.description ? `
                        <div class="description-wrapper">
                            <div class="workshop-description">${escapeHtml(workshop.description)}</div>
                            <button class="desc-toggle" data-action="desc-toggle" aria-expanded="false">See more...</button>
                        </div>
                    ` : ''}
                </div>
                <div class="workshop-card-actions">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;
}

// ============================================
// DE-REGISTRATION
// ============================================

/**
 * Cancel a student's registration for a workshop
 * @param {string} workshopId
 */
async function handleDeregister(workshopId) {
    const workshop = allWorkshops.find(w => w.id === workshopId);
    if (!workshop) return;

    try {
        LoadingSpinner.showGlobal('Cancelling registration...');

        const user = firebase.auth().currentUser;
        const token = user ? await user.getIdToken() : null;

        const response = await fetch(API_CONFIG.WORKSHOP_DEREGISTER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ studentId: currentStudentId, workshopId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to cancel registration.');
        }

        showSnackbar('Registration cancelled.', 'success');
        await loadWorkshops(currentStudentId);

    } catch (error) {
        console.error('De-register error:', error);
        showSnackbar(error.message || 'Failed to cancel registration. Please try again.', 'error');
    } finally {
        LoadingSpinner.hideGlobal();
    }
}

// ============================================
// VIDEOS MODAL (stub — implemented separately)
// ============================================

/**
 * Open the workshop videos modal
 * @param {string} workshopId
 */
function openWorkshopVideosModal(workshopId) {
    showSnackbar('Videos coming soon!', 'info');
}

// ============================================
// REGISTRATION MODAL
// ============================================

/**
 * Open the registration modal with Stripe payment
 * @param {string} workshopId
 */
function openWorkshopRegistrationModal(workshopId) {
    const workshop = allWorkshops.find(w => w.id === workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found.', 'error');
        return;
    }

    // Destroy previous payment service if any
    paymentService = null;

    registrationModal = new BaseModal({
        id: 'workshop-registration-modal',
        title: `Register: ${escapeHtml(workshop.name || 'Workshop')}`,
        size: 'medium',
        content: generateRegistrationContent(workshop),
        buttons: [],
        onOpen: () => {
            initializeRegistrationStripe(workshopId);
        }
    });

    registrationModal.show();
}

/**
 * Generate the HTML for the registration modal
 * @param {Object} workshop
 * @returns {string}
 */
function generateRegistrationContent(workshop) {
    const date = workshop.date?.toDate ? workshop.date.toDate() : null;
    const formattedDate = date ? formatWorkshopDate(date) : 'Date TBC';
    const cost = workshop.cost != null ? workshop.cost : 0;
    const hasCost = cost > 0;

    return `
        <div class="registration-content">
            <div class="registration-summary">
                <div class="summary-row">
                    <span class="label">Workshop</span>
                    <span class="value">${escapeHtml(workshop.name || 'Workshop')}</span>
                </div>
                <div class="summary-row">
                    <span class="label">Date</span>
                    <span class="value">${formattedDate}</span>
                </div>
                ${workshop.topic ? `
                    <div class="summary-row">
                        <span class="label">Topic</span>
                        <span class="value">${escapeHtml(workshop.topic)}</span>
                    </div>
                ` : ''}
                <div class="summary-row total">
                    <span class="label">Total</span>
                    <span class="value">${hasCost ? `$${cost.toFixed(2)}` : 'Free'}</span>
                </div>
            </div>

            ${hasCost ? `
                <div class="payment-section">
                    <h4><i class="fas fa-credit-card"></i> Payment Details</h4>
                    <div id="card-element" class="stripe-card-element"></div>
                    <div id="card-errors" class="card-errors" role="alert"></div>
                    <div class="security-notice">
                        <i class="fas fa-lock"></i>
                        Secured by Stripe. Your card details are never stored.
                    </div>
                </div>

                <div class="registration-actions">
                    <button id="btn-pay-now" class="btn-primary btn-pay-now" onclick="handleWorkshopRegistration('${workshop.id}', true)">
                        <i class="fas fa-credit-card"></i> Pay $${cost.toFixed(2)} &amp; Register
                    </button>
                    <button class="btn-pay-later" onclick="handleWorkshopRegistration('${workshop.id}', false)">
                        <i class="fas fa-clock"></i> Register &amp; Pay at the Door
                    </button>
                    <p class="pay-later-info">Pay later at the event. Spot reserved but not guaranteed if full.</p>
                </div>
            ` : `
                <div class="registration-actions">
                    <button class="btn-primary btn-pay-now" onclick="handleWorkshopRegistration('${workshop.id}', false)">
                        <i class="fas fa-ticket-alt"></i> Register (Free)
                    </button>
                </div>
            `}
        </div>
    `;
}

/**
 * Initialize Stripe Elements in the registration modal
 * @param {string} workshopId
 */
function initializeRegistrationStripe(workshopId) {
    const workshop = allWorkshops.find(w => w.id === workshopId);
    if (!workshop || !workshop.cost || workshop.cost <= 0) return;

    // Only initialize if card element is present in the DOM
    const cardEl = document.getElementById('card-element');
    if (!cardEl) return;

    paymentService = new PaymentService();
    paymentService.initialize('card-element', 'card-errors');
}

/**
 * Handle workshop registration (pay now or pay later)
 * @param {string} workshopId
 * @param {boolean} payNow
 */
window.handleWorkshopRegistration = async function(workshopId, payNow) {
    const workshop = allWorkshops.find(w => w.id === workshopId);
    if (!workshop) return;

    const hasCost = workshop.cost && workshop.cost > 0;
    const payBtn = document.getElementById('btn-pay-now');

    try {
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        LoadingSpinner.showGlobal('Registering...');

        let paymentMethodId = null;

        if (payNow && hasCost) {
            if (!paymentService) {
                throw new Error('Payment system not ready. Please try again.');
            }

            const result = await paymentService.createPaymentMethod();
            if (!result.success) {
                throw new Error(result.error || 'Payment failed. Please check your card details.');
            }
            paymentMethodId = result.paymentMethod.id;
        }

        // Get auth token
        const user = firebase.auth().currentUser;
        const token = user ? await user.getIdToken() : null;

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(API_CONFIG.WORKSHOP_PAYMENT, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                studentId: currentStudentId,
                workshopId,
                paymentMethodId,
                paidOnline: payNow && hasCost
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Registration failed. Please try again.');
        }

        // Success
        const message = payNow && hasCost
            ? 'Payment successful! You are registered for this workshop.'
            : 'Registered successfully! Payment due at the event.';

        showSnackbar(message, 'success');

        if (registrationModal) {
            registrationModal.hide();
            registrationModal = null;
        }

        // Refresh workshops
        await loadWorkshops(currentStudentId);

    } catch (error) {
        console.error('Registration error:', error);
        showSnackbar(error.message || 'Registration failed. Please try again.', 'error');

        if (payBtn) {
            payBtn.disabled = false;
            const workshop = allWorkshops.find(w => w.id === workshopId);
            const cost = workshop?.cost || 0;
            payBtn.innerHTML = `<i class="fas fa-credit-card"></i> Pay $${cost.toFixed(2)} &amp; Register`;
        }
    } finally {
        LoadingSpinner.hideGlobal();
    }
};

// ============================================
// FILTER TAB LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => applyFilter(tab.dataset.filter));
    });
});

// ============================================
// HELPERS
// ============================================

/**
 * Format a Date to a human-readable NZ format
 * @param {Date} date
 * @returns {string}
 */
function formatWorkshopDate(date) {
    return date.toLocaleDateString('en-NZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
