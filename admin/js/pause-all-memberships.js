/**
 * Pause All Memberships Functionality
 * Bulk update functionality for extending all active membership expiry dates
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

// Global state for pause all modal
let pauseAllDatePicker = null;
let pauseAllData = {
    method: 'date', // 'date' or 'duration'
    memberships: [],
    selectedDate: null,
    durationValue: null,
    durationUnit: 'weeks'
};

/**
 * Initialize Pause All modal (date picker)
 */
function initializePauseAllModal() {
    if (pauseAllDatePicker) return; // Already initialized

    // Initialize DatePicker with string IDs (not DOM elements)
    pauseAllDatePicker = new DatePicker('pause-all-date-picker', 'pause-all-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: true, // Don't allow dates in the past
        ignoreClosedown: true, // Admin can select any date
        showTime: false,
        onDateSelected: () => {
            pauseAllData.selectedDate = pauseAllDatePicker.selectedDate;
            const previewBtn = document.getElementById('preview-pause-all-btn');
            if (previewBtn) previewBtn.disabled = false;
            // Hide preview when date changes
            const previewSection = document.getElementById('pause-all-preview');
            if (previewSection) previewSection.style.display = 'none';
            const confirmBtn = document.getElementById('confirm-pause-all-btn');
            if (confirmBtn) confirmBtn.disabled = true;
        }
    });

    console.log('Pause All modal date picker initialized');
}

/**
 * Open Pause All Memberships modal
 */
function openPauseAllModal() {
    const modal = document.getElementById('pause-all-modal');
    if (!modal) return;

    // Show modal first so elements are available
    modal.style.display = 'flex';

    // Initialize date picker if not already initialized
    if (!pauseAllDatePicker) {
        initializePauseAllModal();
    }

    // Reset modal state
    pauseAllData = {
        method: 'duration',
        memberships: [],
        selectedDate: null,
        durationValue: null,
        durationUnit: 'weeks'
    };

    // Reset UI
    switchPauseAllMethod('duration');
    
    // Clear date picker safely
    if (pauseAllDatePicker && typeof pauseAllDatePicker.clearDate === 'function') {
        try {
            pauseAllDatePicker.clearDate();
        } catch (error) {
            console.warn('Error clearing date picker:', error);
            // Manually reset if clearDate fails
            const inputElement = document.getElementById('pause-all-date-picker');
            if (inputElement) inputElement.value = '';
        }
    }
    
    document.getElementById('pause-all-duration-value').value = '';
    document.getElementById('pause-all-duration-unit').value = 'weeks';
    document.getElementById('pause-all-reason').value = '';
    document.getElementById('pause-all-preview').style.display = 'none';
    document.getElementById('preview-pause-all-btn').disabled = true;
    document.getElementById('confirm-pause-all-btn').disabled = true;
}

/**
 * Close Pause All Memberships modal
 */
function closePauseAllModal() {
    const modal = document.getElementById('pause-all-modal');
    if (!modal) return;

    modal.style.display = 'none';
    pauseAllData = {
        method: 'date',
        memberships: [],
        selectedDate: null,
        durationValue: null,
        durationUnit: 'weeks'
    };
}

/**
 * Switch between date picker and duration methods
 * @param {string} method - 'date' or 'duration'
 */
function switchPauseAllMethod(method) {
    pauseAllData.method = method;

    // Update tab buttons
    const tabs = document.querySelectorAll('#pause-all-modal .tab-button');
    tabs.forEach(tab => {
        if ((method === 'date' && tab.textContent.includes('Specific Date')) ||
            (method === 'duration' && tab.textContent.includes('Duration'))) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Show/hide content
    if (method === 'date') {
        document.getElementById('pause-all-date-method').style.display = 'block';
        document.getElementById('pause-all-duration-method').style.display = 'none';
    } else {
        document.getElementById('pause-all-date-method').style.display = 'none';
        document.getElementById('pause-all-duration-method').style.display = 'block';
    }

    // Reset preview
    document.getElementById('pause-all-preview').style.display = 'none';
    document.getElementById('confirm-pause-all-btn').disabled = true;

    // Enable/disable preview button based on inputs
    updatePauseAllPreviewButton();
}

/**
 * Update preview button state based on inputs
 */
function updatePauseAllPreviewButton() {
    const previewBtn = document.getElementById('preview-pause-all-btn');
    if (!previewBtn) return;
    
    if (pauseAllData.method === 'date') {
        // Check if date picker has a selected date
        const hasDate = pauseAllDatePicker && pauseAllDatePicker.selectedDate;
        previewBtn.disabled = !hasDate;
    } else {
        // Check if duration value is valid
        const valueInput = document.getElementById('pause-all-duration-value');
        const value = valueInput ? valueInput.value : '';
        previewBtn.disabled = !value || parseInt(value) < 1;
    }
}

/**
 * Calculate target date based on duration input
 * @param {Date} fromDate - Starting date
 * @param {number} value - Duration value
 * @param {string} unit - 'days', 'weeks', or 'months'
 * @returns {Date} Calculated date
 */
function calculateTargetDate(fromDate, value, unit) {
    const result = new Date(fromDate);
    
    switch (unit) {
        case 'days':
            result.setDate(result.getDate() + value);
            break;
        case 'weeks':
            result.setDate(result.getDate() + (value * 7));
            break;
        case 'months':
            result.setMonth(result.getMonth() + value);
            break;
    }
    
    return result;
}

/**
 * Fetch all active memberships and show preview
 */
async function previewPauseAll() {
    const previewBtn = document.getElementById('preview-pause-all-btn');
    const originalHTML = previewBtn.innerHTML;
    previewBtn.disabled = true;
    previewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    try {
        // Fetch all active memberships from Firestore
        const db = firebase.firestore();
        const membershipsSnapshot = await db.collection('memberships')
            .where('status', '==', 'active')
            .get();

        const memberships = [];
        const studentIds = [];

        membershipsSnapshot.forEach(doc => {
            const data = doc.data();
            memberships.push({
                id: doc.id,
                studentId: data.studentId,
                currentExpiryDate: data.currentPeriodEnd.toDate(),
                isAutoRenewing: data.isRecurring || false
            });
            studentIds.push(data.studentId);
        });

        // Fetch student details
        const studentsPromises = studentIds.map(id => 
            db.collection('students').doc(id).get()
        );
        const studentsSnapshots = await Promise.all(studentsPromises);

        // Merge student data
        memberships.forEach((membership, index) => {
            if (studentsSnapshots[index].exists) {
                const studentData = studentsSnapshots[index].data();
                membership.studentName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim() || 'Unknown';
                membership.studentEmail = studentData.email || '';
            }
        });

        // Calculate target date
        let targetDate;
        if (pauseAllData.method === 'date') {
            targetDate = pauseAllDatePicker.selectedDate;
            if (!targetDate) {
                alert('Please select a date first');
                previewBtn.disabled = false;
                previewBtn.innerHTML = originalHTML;
                return;
            }
        } else {
            const value = parseInt(document.getElementById('pause-all-duration-value').value);
            const unit = document.getElementById('pause-all-duration-unit').value;
            
            // Find the earliest expiry date among all memberships
            const earliestExpiry = memberships.reduce((earliest, m) => {
                return (!earliest || m.currentExpiryDate < earliest) ? m.currentExpiryDate : earliest;
            }, null);
            
            targetDate = calculateTargetDate(earliestExpiry, value, unit);
            pauseAllData.selectedDate = targetDate;
        }

        // Validate: Check if at least one membership would be extended
        const membershipsToExtend = memberships.filter(m => targetDate > m.currentExpiryDate);
        
        if (membershipsToExtend.length === 0) {
            // Find the latest expiry date to provide helpful error message
            const latestExpiry = memberships.reduce((latest, m) => {
                return (!latest || m.currentExpiryDate > latest) ? m.currentExpiryDate : latest;
            }, null);
            
            const latestExpiryStr = latestExpiry ? latestExpiry.toLocaleDateString('en-NZ', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'unknown';
            
            const validationModal = new ConfirmationModal({
                title: 'Invalid Date',
                message: `The selected date (${targetDate.toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })}) is not later than any current membership expiry dates. The latest expiry date is ${latestExpiryStr}. Memberships can only be extended, not shortened.`,
                confirmText: 'OK',
                showCancel: false
            });
            validationModal.show();
            
            previewBtn.disabled = false;
            previewBtn.innerHTML = originalHTML;
            return;
        }

        // Store memberships data
        pauseAllData.memberships = memberships;

        // Display preview
        displayPauseAllPreview(memberships, targetDate);

        // Enable confirm button
        document.getElementById('confirm-pause-all-btn').disabled = false;

        // Restore preview button
        previewBtn.disabled = false;
        previewBtn.innerHTML = originalHTML;

    } catch (error) {
        console.error('Error fetching memberships:', error);
        
        previewBtn.disabled = false;
        previewBtn.innerHTML = originalHTML;

        const errorModal = new ConfirmationModal({
            title: 'Preview Failed',
            message: `<p>Failed to fetch memberships: ${error.message}</p>`,
            icon: 'fas fa-exclamation-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        errorModal.show();
    }
}

/**
 * Display preview of affected memberships
 * @param {Array} memberships - Array of membership objects
 * @param {Date} targetDate - Target expiry date
 */
function displayPauseAllPreview(memberships, targetDate) {
    const previewSection = document.getElementById('pause-all-preview');
    const totalCount = document.getElementById('pause-all-total-count');
    const autoRenewCount = document.getElementById('pause-all-auto-renew-count');
    const previewList = document.getElementById('pause-all-preview-list');
    const skippedSection = document.getElementById('pause-all-skipped-section');
    const skippedCount = document.getElementById('pause-all-skipped-count');
    const skippedList = document.getElementById('pause-all-skipped-list');

    // Split memberships into those to extend and those to skip
    const membershipsToExtend = memberships.filter(m => targetDate > m.currentExpiryDate);
    const membershipsToSkip = memberships.filter(m => targetDate <= m.currentExpiryDate);
    
    // Count auto-renewing memberships that will be extended
    const autoRenewingCount = membershipsToExtend.filter(m => m.isAutoRenewing).length;

    // Update stats for memberships to update
    totalCount.textContent = membershipsToExtend.length;
    autoRenewCount.textContent = autoRenewingCount;

    // Build and display memberships to update list
    buildMembershipsList(previewList, membershipsToExtend, false, false);

    // Handle skipped memberships section
    if (membershipsToSkip.length > 0) {
        skippedCount.textContent = membershipsToSkip.length;
        buildMembershipsList(skippedList, membershipsToSkip, true, false);
        skippedSection.style.display = 'block';
    } else {
        skippedSection.style.display = 'none';
    }

    // Show preview section
    previewSection.style.display = 'block';
}

/**
 * Build a memberships list HTML
 * @param {HTMLElement} container - Container element
 * @param {Array} memberships - Array of membership objects
 * @param {boolean} isSkipped - Whether this is the skipped list
 * @param {boolean} showAll - Whether to show all items or limit the list
 */
function buildMembershipsList(container, memberships, isSkipped, showAll) {
    let listHTML = '';
    const limit = isSkipped ? 5 : 10;
    const displayMemberships = showAll ? memberships : memberships.slice(0, limit);
    
    displayMemberships.forEach(membership => {
        const badge = membership.isAutoRenewing ? 
            '<span class="preview-item-badge">Auto-Renew</span>' : '';
        
        if (isSkipped) {
            const currentExpiryStr = membership.currentExpiryDate.toLocaleDateString('en-NZ', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            listHTML += `
                <div class="preview-item">
                    <div>
                        <div class="preview-item-name">${membership.studentName}</div>
                        <div class="preview-item-email" style="color: #856404;">Current expiry: ${currentExpiryStr}</div>
                    </div>
                    ${badge}
                </div>
            `;
        } else {
            listHTML += `
                <div class="preview-item">
                    <div>
                        <div class="preview-item-name">${membership.studentName}</div>
                        <div class="preview-item-email">${membership.studentEmail}</div>
                    </div>
                    ${badge}
                </div>
            `;
        }
    });

    if (!showAll && memberships.length > limit) {
        const colorStyle = isSkipped ? 'color: #856404;' : 'color: var(--text-secondary);';
        listHTML += `
            <div class="preview-item" style="font-style: italic; ${colorStyle} cursor: pointer;" 
                 onclick="expandMembershipsList('${isSkipped ? 'skipped' : 'update'}')" 
                 title="Click to show all">
                <div style="text-decoration: underline;">And ${memberships.length - limit} more... (click to show all)</div>
            </div>
        `;
    } else if (showAll && memberships.length > limit) {
        const colorStyle = isSkipped ? 'color: #856404;' : 'color: var(--text-secondary);';
        listHTML += `
            <div class="preview-item" style="font-style: italic; ${colorStyle} cursor: pointer;" 
                 onclick="collapseMembershipsList('${isSkipped ? 'skipped' : 'update'}')" 
                 title="Click to show less">
                <div style="text-decoration: underline;">Show less...</div>
            </div>
        `;
    }

    container.innerHTML = listHTML;
}

/**
 * Expand a memberships list to show all items
 * @param {string} listType - 'update' or 'skipped'
 */
function expandMembershipsList(listType) {
    if (!pauseAllData.memberships) return;
    
    const targetDate = pauseAllData.selectedDate;
    const membershipsToExtend = pauseAllData.memberships.filter(m => targetDate > m.currentExpiryDate);
    const membershipsToSkip = pauseAllData.memberships.filter(m => targetDate <= m.currentExpiryDate);
    
    if (listType === 'update') {
        const previewList = document.getElementById('pause-all-preview-list');
        buildMembershipsList(previewList, membershipsToExtend, false, true);
    } else {
        const skippedList = document.getElementById('pause-all-skipped-list');
        buildMembershipsList(skippedList, membershipsToSkip, true, true);
    }
}

/**
 * Collapse a memberships list to show limited items
 * @param {string} listType - 'update' or 'skipped'
 */
function collapseMembershipsList(listType) {
    if (!pauseAllData.memberships) return;
    
    const targetDate = pauseAllData.selectedDate;
    const membershipsToExtend = pauseAllData.memberships.filter(m => targetDate > m.currentExpiryDate);
    const membershipsToSkip = pauseAllData.memberships.filter(m => targetDate <= m.currentExpiryDate);
    
    if (listType === 'update') {
        const previewList = document.getElementById('pause-all-preview-list');
        buildMembershipsList(previewList, membershipsToExtend, false, false);
    } else {
        const skippedList = document.getElementById('pause-all-skipped-list');
        buildMembershipsList(skippedList, membershipsToSkip, true, false);
    }
}

/**
 * Confirm and execute bulk membership expiry update
 */
async function confirmPauseAll() {
    if (!pauseAllData.memberships || pauseAllData.memberships.length === 0) {
        alert('No memberships to update');
        return;
    }

    const confirmBtn = document.getElementById('confirm-pause-all-btn');
    const originalHTML = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    const reason = document.getElementById('pause-all-reason').value.trim();
    const targetDate = pauseAllData.selectedDate;

    // Format date as YYYY-MM-DD
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const updateMembershipExpiry = firebase.functions().httpsCallable('updateMembershipExpiry');

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const failures = [];
    const skipped = [];

    // Process each membership
    for (const membership of pauseAllData.memberships) {
        try {
            // Only extend if target date is after current expiry
            if (targetDate > membership.currentExpiryDate) {
                await updateMembershipExpiry({
                    membershipId: membership.id,
                    newExpiryDate: dateString,
                    reason: reason || 'Bulk pause all memberships'
                });
                successCount++;
            } else {
                // Track skipped memberships
                skippedCount++;
                const currentExpiryStr = membership.currentExpiryDate.toLocaleDateString('en-NZ', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                skipped.push({
                    name: membership.studentName,
                    currentExpiry: currentExpiryStr
                });
            }
        } catch (error) {
            console.error(`Failed to update ${membership.studentName}:`, error);
            failureCount++;
            failures.push({
                name: membership.studentName,
                error: error.message
            });
        }
    }

    // Restore button
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalHTML;

    // Show results
    let resultMessage = `<p>Successfully updated <strong>${successCount}</strong> membership(s).</p>`;
    
    if (skippedCount > 0) {
        resultMessage += `<p style="color: var(--warning-color, #f39c12); margin-top: 1rem;">Skipped <strong>${skippedCount}</strong> membership(s) that already expire after the selected date:</p>`;
        resultMessage += '<ul style="text-align: left; margin-top: 0.5rem; max-height: 150px; overflow-y: auto;">';
        skipped.forEach(skip => {
            resultMessage += `<li>${skip.name} (currently expires ${skip.currentExpiry})</li>`;
        });
        resultMessage += '</ul>';
    }
    
    if (failureCount > 0) {
        resultMessage += `<p style="color: var(--error-color); margin-top: 1rem;">Failed to update <strong>${failureCount}</strong> membership(s):</p>`;
        resultMessage += '<ul style="text-align: left; margin-top: 0.5rem;">';
        failures.forEach(failure => {
            resultMessage += `<li>${failure.name}: ${failure.error}</li>`;
        });
        resultMessage += '</ul>';
    }

    const resultModal = new ConfirmationModal({
        title: failureCount > 0 ? 'Bulk Update Completed with Errors' : 'Bulk Update Successful',
        message: resultMessage,
        icon: failureCount > 0 ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle',
        confirmText: 'OK',
        confirmClass: 'btn-primary'
    });
    resultModal.show();

    // Close modal
    closePauseAllModal();

    // Refresh the current page data if applicable
    if (typeof loadAllStudents === 'function') {
        await loadAllStudents();
    }
}

// Listen for duration input changes
document.addEventListener('DOMContentLoaded', () => {
    const durationValueInput = document.getElementById('pause-all-duration-value');
    const durationUnitSelect = document.getElementById('pause-all-duration-unit');
    
    if (durationValueInput) {
        durationValueInput.addEventListener('input', () => {
            updatePauseAllPreviewButton();
            // Hide preview when value changes
            document.getElementById('pause-all-preview').style.display = 'none';
            document.getElementById('confirm-pause-all-btn').disabled = true;
        });
    }
    
    if (durationUnitSelect) {
        durationUnitSelect.addEventListener('change', () => {
            // Hide preview when unit changes
            document.getElementById('pause-all-preview').style.display = 'none';
            document.getElementById('confirm-pause-all-btn').disabled = true;
        });
    }
});

// Expose functions globally for onclick handlers
if (typeof window !== 'undefined') {
    window.openPauseAllModal = openPauseAllModal;
    window.closePauseAllModal = closePauseAllModal;
    window.switchPauseAllMethod = switchPauseAllMethod;
    window.previewPauseAll = previewPauseAll;
    window.confirmPauseAll = confirmPauseAll;
    window.expandMembershipsList = expandMembershipsList;
    window.collapseMembershipsList = collapseMembershipsList;
}
