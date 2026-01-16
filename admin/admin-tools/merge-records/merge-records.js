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
 * Build field comparison table
 */
function buildFieldComparison() {
    const reviewContainer = document.querySelector('#field-comparison');
    if (!reviewContainer) return;

    const fields = [
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'firstName', label: 'First Name', type: 'text' },
        { key: 'lastName', label: 'Last Name', type: 'text' },
        { key: 'phoneNumber', label: 'Phone Number', type: 'text' },
        { key: 'pronouns', label: 'Pronouns', type: 'text' },
        { key: 'stripeCustomerId', label: 'Stripe Customer ID', type: 'text' }
    ];

    let tableHTML = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th style="width: 15%;">Field</th>
                    <th style="width: 32%; text-align: left;">Primary (Keep)</th>
                    <th style="width: 6%; text-align: center;"></th>
                    <th style="width: 32%; text-align: left;">Deprecated (Discard)</th>
                    <th style="width: 6%; text-align: center;"></th>
                </tr>
            </thead>
            <tbody>
    `;

    fields.forEach(field => {
        const primaryValue = primaryStudent[field.key] || '';
        const deprecatedValue = deprecatedStudent[field.key] || '';
        const hasDifference = primaryValue !== deprecatedValue;
        
        // Auto-select primary value by default
        const primaryChecked = 'checked';
        const deprecatedChecked = '';

        tableHTML += `
            <tr ${hasDifference ? 'style="background: var(--bg-orange-light);"' : ''}>
                <td class="field-label" style="font-weight: var(--font-weight-semibold);">${field.label}</td>
                <td>
                    <span class="field-value ${!primaryValue ? 'empty' : ''}">${primaryValue || 'Not set'}</span>
                </td>
                <td style="text-align: center;">
                    <input 
                        type="radio" 
                        name="field-${field.key}" 
                        value="primary" 
                        ${primaryChecked}
                        ${!hasDifference ? 'disabled' : ''}
                        style="width: 20px; height: 20px; cursor: ${hasDifference ? 'pointer' : 'not-allowed'};"
                    >
                </td>
                <td>
                    <span class="field-value ${!deprecatedValue ? 'empty' : ''}">${deprecatedValue || 'Not set'}</span>
                </td>
                <td style="text-align: center;">
                    <input 
                        type="radio" 
                        name="field-${field.key}" 
                        value="deprecated" 
                        ${deprecatedChecked}
                        ${!hasDifference ? 'disabled' : ''}
                        style="width: 20px; height: 20px; cursor: ${hasDifference ? 'pointer' : 'not-allowed'};"
                    >
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
        <div style="margin-top: var(--space-md); padding: var(--space-md); background: var(--bg-light); border-radius: var(--radius-md);">
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">
                <i class="fas fa-info-circle"></i> 
                Highlighted rows show differences between records. The primary student's values will be used for all fields.
                Related documents: <strong>${primaryStudent.counts.transactions + deprecatedStudent.counts.transactions} transactions</strong>, 
                <strong>${primaryStudent.counts.checkins + deprecatedStudent.counts.checkins} check-ins</strong>, 
                <strong>${primaryStudent.counts.concessionBlocks + deprecatedStudent.counts.concessionBlocks} concessions</strong>
            </p>
        </div>
    `;

    reviewContainer.innerHTML = tableHTML;
}

/**
 * Show confirmation modal
 */
function showConfirmationModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="merge-confirmation-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        ">
            <div style="
                background: white;
                border-radius: var(--radius-lg);
                max-width: 500px;
                width: 100%;
                padding: var(--space-xl);
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
            ">
                <div style="text-align: center; margin-bottom: var(--space-lg);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error); margin-bottom: var(--space-md);"></i>
                    <h3 style="margin: 0 0 var(--space-sm) 0; color: var(--text-primary);">Confirm Merge Operation</h3>
                    <p style="margin: 0; color: var(--text-secondary);">This action cannot be undone.</p>
                </div>

                <div style="background: var(--bg-light); padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-lg);">
                    <div style="margin-bottom: var(--space-sm);">
                        <strong style="color: var(--success);">Primary (will be kept):</strong><br>
                        <span style="color: var(--text-primary);">${primaryStudent.firstName} ${primaryStudent.lastName}</span><br>
                        <span style="color: var(--text-secondary); font-size: 0.875rem;">${primaryStudent.email}</span>
                    </div>
                    <div>
                        <strong style="color: var(--error);">Deprecated (will be deleted):</strong><br>
                        <span style="color: var(--text-primary);">${deprecatedStudent.firstName} ${deprecatedStudent.lastName}</span><br>
                        <span style="color: var(--text-secondary); font-size: 0.875rem;">${deprecatedStudent.email}</span>
                    </div>
                </div>

                <div style="margin-bottom: var(--space-lg);">
                    <label style="display: block; font-weight: 600; margin-bottom: var(--space-sm); color: var(--text-primary);">
                        Type <strong>MERGE</strong> to confirm:
                    </label>
                    <input 
                        type="text" 
                        id="merge-confirm-input" 
                        style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid var(--border-light);
                            border-radius: var(--radius-md);
                            font-size: 1rem;
                            font-family: monospace;
                            text-transform: uppercase;
                        "
                        placeholder="Type MERGE"
                        autocomplete="off"
                    >
                </div>

                <div style="display: flex; gap: var(--space-md);">
                    <button id="merge-cancel-btn" class="btn-cancel" style="flex: 1;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button id="merge-execute-btn" class="btn-danger" style="flex: 1;" disabled>
                        <i class="fas fa-check"></i> Merge Students
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get elements
    const modal = document.getElementById('merge-confirmation-modal');
    const input = document.getElementById('merge-confirm-input');
    const executeBtn = document.getElementById('merge-execute-btn');
    const cancelBtn = document.getElementById('merge-cancel-btn');

    // Enable execute button only when "MERGE" is typed
    input.addEventListener('input', () => {
        if (input.value.toUpperCase() === 'MERGE') {
            executeBtn.disabled = false;
        } else {
            executeBtn.disabled = true;
        }
    });

    // Focus input
    input.focus();

    // Handle enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !executeBtn.disabled) {
            executeBtn.click();
        }
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });

    // Execute button
    executeBtn.addEventListener('click', () => {
        modal.remove();
        executeMerge();
    });
}

/**
 * Execute the merge operation
 */
async function executeMerge() {
    // Collect field selections
    const fieldSelections = {};
    const fields = ['email', 'firstName', 'lastName', 'phoneNumber', 'pronouns', 'stripeCustomerId'];
    
    fields.forEach(field => {
        const selected = document.querySelector(`input[name="field-${field}"]:checked`);
        if (selected) {
            fieldSelections[field] = selected.value; // 'primary' or 'deprecated'
        }
    });

    // Switch to progress step
    document.getElementById('step-review').classList.remove('active');
    const progressStep = document.getElementById('step-progress');
    progressStep.style.display = '';
    progressStep.classList.add('active');

    // Build progress steps
    const progressSteps = document.getElementById('progress-steps');
    progressSteps.innerHTML = `
        <div id="progress-transactions" class="progress-step pending">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Updating transactions...</span>
        </div>
        <div id="progress-checkins" class="progress-step pending">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Updating check-ins...</span>
        </div>
        <div id="progress-concessions" class="progress-step pending">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Updating concessions...</span>
        </div>
        <div id="progress-students" class="progress-step pending">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Updating student records...</span>
        </div>
        <div id="progress-users" class="progress-step pending">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Removing user access...</span>
        </div>
    `;

    // Update progress status
    updateProgressStatus('Merging student records...', 'active');

    try {
        // Step 1: Update transactions
        updateProgressStep('progress-transactions', 'active');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 2: Update check-ins
        updateProgressStep('progress-transactions', 'complete');
        updateProgressStep('progress-checkins', 'active');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 3: Update concessions
        updateProgressStep('progress-checkins', 'complete');
        updateProgressStep('progress-concessions', 'active');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 4: Update student records
        updateProgressStep('progress-concessions', 'complete');
        updateProgressStep('progress-students', 'active');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 5: Remove user access
        updateProgressStep('progress-students', 'complete');
        updateProgressStep('progress-users', 'active');

        // Perform the actual merge with field selections
        const result = await performMerge(primaryStudent.id, deprecatedStudent.id, fieldSelections);

        updateProgressStep('progress-users', 'complete');

        // Show success
        if (result.success) {
            await new Promise(resolve => setTimeout(resolve, 500));
            showSuccess(result.summary);
        } else {
            throw new Error('Merge operation failed');
        }

    } catch (error) {
        console.error('Error executing merge:', error);
        updateProgressStatus('Merge failed: ' + error.message, 'error');
        
        // Show error in progress steps
        progressSteps.innerHTML += `
            <div class="progress-step" style="background: var(--bg-error-light); color: var(--error); border: 1px solid var(--error);">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${error.message}</span>
            </div>
        `;
        
        alert('Error merging records: ' + error.message + '\n\nPlease check the console for details and contact support if needed.');
    }
}

/**
 * Update progress status message
 */
function updateProgressStatus(message, status) {
    const statusElement = document.querySelector('.progress-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

/**
 * Update individual progress step
 */
function updateProgressStep(stepId, status) {
    const stepElement = document.getElementById(stepId);
    if (stepElement) {
        stepElement.classList.remove('pending', 'active', 'complete');
        stepElement.classList.add(status);
    }
}

/**
 * Show success screen
 */
function showSuccess(summary) {
    // Switch to success step
    document.getElementById('step-progress').classList.remove('active');
    const successStep = document.getElementById('step-success');
    successStep.style.display = '';
    successStep.classList.add('active');

    // Build enhanced success screen
    const successContainer = document.querySelector('#step-success .success-container');
    if (successContainer) {
        successContainer.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h4>Students Merged Successfully!</h4>
            
            <div class="merge-summary">
                <div class="summary-row">
                    <span class="summary-label">Primary Student:</span>
                    <span class="summary-value">${primaryStudent.firstName} ${primaryStudent.lastName}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Email:</span>
                    <span class="summary-value">${primaryStudent.email}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Merged From:</span>
                    <span class="summary-value">${deprecatedStudent.firstName} ${deprecatedStudent.lastName}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Transactions Updated:</span>
                    <span class="summary-value">${summary.transactionsUpdated || 0}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Check-ins Updated:</span>
                    <span class="summary-value">${summary.checkinsUpdated || 0}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Concessions Updated:</span>
                    <span class="summary-value">${summary.concessionBlocksUpdated || 0}</span>
                </div>
            </div>

            <div class="success-actions">
                <a href="../student-database/?student=${primaryStudent.id}" class="btn-primary btn-primary-lg">
                    <i class="fas fa-user"></i> View Merged Student
                </a>
                <button id="btn-merge-another" class="btn-cancel btn-cancel-lg">
                    <i class="fas fa-redo"></i> Merge Another Record
                </button>
            </div>
        `;

        // Re-attach event listener for merge another button
        document.getElementById('btn-merge-another').addEventListener('click', resetMerge);
    }
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
    document.querySelectorAll('.merge-step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
    });
    
    // Show selection step
    const selectionStep = document.getElementById('step-selection');
    selectionStep.style.display = '';
    selectionStep.classList.add('active');

    // Disable continue button
    document.getElementById('btn-continue-review').disabled = true;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
