/**
 * Merge Records - Main Controller
 * Coordinates the merge workflow and UI state
 */

// Super admin check
const SUPER_ADMINS = ['dance@urbanswing.co.nz'];
let currentUser = null;

// Selected students
let primaryStudent = null;
let deprecatedStudent = null;

// Firebase db and auth are already initialized by firebase-config.js

/**
 * Initialize the merge records page
 */
async function initialize() {
    try {
        // Check authentication and authorization
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '../../index.html';
                return;
            }

            currentUser = user;

            // Check if super admin
            if (!SUPER_ADMINS.includes(user.email.toLowerCase())) {
                alert('Access Denied: This feature is only available to super administrators.');
                window.location.href = '../index.html';
                return;
            }

            // Initialize the page
            initializeSearch();
            setupEventListeners();
        });
    } catch (error) {
        console.error('Error initializing:', error);
        alert('Error initializing page. Please refresh and try again.');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Continue to review button
    document.getElementById('btn-continue-review').addEventListener('click', proceedToReview);

    // Back to selection button
    document.getElementById('btn-back-selection').addEventListener('click', backToSelection);

    // Continue to confirm button
    document.getElementById('btn-continue-confirm').addEventListener('click', showConfirmationModal);

    // Merge another button
    document.getElementById('btn-merge-another').addEventListener('click', resetMerge);
}

/**
 * Proceed to review step
 */
function proceedToReview() {
    if (!primaryStudent || !deprecatedStudent) {
        alert('Please select both students before continuing.');
        return;
    }

    // Switch to review step
    document.getElementById('step-selection').classList.remove('active');
    document.getElementById('step-review').classList.add('active');

    // Build field comparison
    buildFieldComparison();
}

/**
 * Back to selection step
 */
function backToSelection() {
    document.getElementById('step-review').classList.remove('active');
    document.getElementById('step-selection').classList.add('active');
}

/**
 * Show confirmation modal
 */
function showConfirmationModal() {
    // TODO: Implement confirmation modal in Phase 4
    console.log('Show confirmation modal');
}

/**
 * Reset merge workflow
 */
function resetMerge() {
    primaryStudent = null;
    deprecatedStudent = null;

    // Reset UI
    document.getElementById('primary-search').value = '';
    document.getElementById('deprecated-search').value = '';
    document.getElementById('primary-card').innerHTML = `
        <i class="fas fa-user"></i>
        <p>Search for a student to select</p>
    `;
    document.getElementById('deprecated-card').innerHTML = `
        <i class="fas fa-user"></i>
        <p>Search for a student to select</p>
    `;

    // Hide all steps
    document.querySelectorAll('.merge-step').forEach(step => step.classList.remove('active'));
    
    // Show selection step
    document.getElementById('step-selection').classList.add('active');

    // Disable continue button
    document.getElementById('btn-continue-review').disabled = true;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
