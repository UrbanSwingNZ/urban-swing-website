/**
 * student-modal.js
 * Handles viewing and editing student details
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

// Track the previous improver status to detect changes
let previousImproverStatus = false;

/**
 * View student details (read-only)
 * @param {string} studentId - Student ID
 */
export function viewStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openStudentModal(student, 'view');
}

/**
 * Edit student details
 * @param {string} studentId - Student ID
 */
export function editStudent(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    openStudentModal(student, 'edit');
}

/**
 * Open student modal
 * @param {object} student - Student object
 * @param {string} mode - 'view' or 'edit'
 */
export function openStudentModal(student, mode) {
    const modal = document.getElementById('student-modal');
    const modalTitle = document.getElementById('modal-title');
    const saveBtn = document.getElementById('save-student-btn');
    const editBtn = document.getElementById('edit-student-modal-btn');
    const form = document.getElementById('student-form');
    
    // Populate form fields
    document.getElementById('modal-student-id').value = student.id;
    document.getElementById('modal-firstName').value = student.firstName || '';
    document.getElementById('modal-lastName').value = student.lastName || '';
    document.getElementById('modal-email').value = student.email || '';
    document.getElementById('modal-phoneNumber').value = student.phoneNumber || '';
    document.getElementById('modal-pronouns').value = student.pronouns || '';
    document.getElementById('modal-emailConsent').checked = student.emailConsent || false;
    document.getElementById('modal-over16Confirmed').checked = student.over16Confirmed || false;
    document.getElementById('modal-improver').checked = student.improver || false;
    document.getElementById('modal-crewMember').checked = student.crewMember || false;
    document.getElementById('modal-adminNotes').value = student.adminNotes || '';
    
    // Store previous improver status for change detection
    previousImproverStatus = student.improver || false;
    
    // Show membership or concession info based on improver status
    updateMembershipConcessionsDisplay(student);
    
    // Populate timestamps
    document.getElementById('modal-registeredAt').textContent = formatTimestamp(student.registeredAt);
    document.getElementById('modal-createdAt').textContent = formatTimestamp(student.createdAt);
    document.getElementById('modal-updatedAt').textContent = formatTimestamp(student.updatedAt);
    
    // Configure modal based on mode
    const saveAndViewBtn = document.getElementById('save-and-view-student-btn');
    
    // Define protected fields that should only be editable in edit mode
    const protectedFieldIds = ['modal-firstName', 'modal-lastName', 'modal-email', 'modal-phoneNumber', 'modal-pronouns'];
    
    if (mode === 'view') {
        modalTitle.textContent = 'Student Details';
        
        // Make protected fields read-only
        protectedFieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.readOnly = true;
        });
        
        // Keep checkboxes and admin notes editable in view mode
        // (no changes needed - they remain enabled)
        
        saveBtn.style.display = 'none';
        if (saveAndViewBtn) saveAndViewBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'inline-flex';
    } else if (mode === 'edit') {
        modalTitle.textContent = 'Edit Student - ' + student.firstName + ' ' + student.lastName;
        
        // Enable all protected fields
        protectedFieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.readOnly = false;
        });
        
        saveBtn.style.display = 'inline-flex';
        if (saveAndViewBtn) saveAndViewBtn.style.display = 'inline-flex';
        if (editBtn) editBtn.style.display = 'none';
    }
    
    modal.style.display = 'flex';
    
    // Store current mode for save handler
    form.dataset.mode = mode;
}

/**
 * Close student modal (saves any changes before closing)
 */
export async function closeStudentModal() {
    const studentId = document.getElementById('modal-student-id').value;
    const newImproverStatus = document.getElementById('modal-improver').checked;
    const student = findStudentById(studentId);
    
    // Check if improver status changed from true to false
    if (previousImproverStatus && !newImproverStatus) {
        // Trying to uncheck improver - check if they have an active membership
        if (student && student.activeMembershipId && student.membershipExpiryDate) {
            const expiryDate = student.membershipExpiryDate.toDate ? student.membershipExpiryDate.toDate() : new Date(student.membershipExpiryDate);
            const now = new Date();
            
            if (expiryDate > now) {
                // Has active membership - show warning and prevent change
                const warningModal = new ConfirmationModal({
                    title: 'Cannot Revert to Beginner',
                    message: `
                        <p><strong>${student.firstName} ${student.lastName}</strong> has an active membership that expires on <strong>${formatDate(expiryDate)}</strong>.</p>
                        <p>Students with active memberships cannot be reverted to beginner status.</p>
                        <p>The membership must expire before this change can be made.</p>
                    `,
                    icon: 'fas fa-exclamation-triangle',
                    confirmText: 'OK',
                    confirmClass: 'btn-primary',
                    onConfirm: () => {
                        // Reset checkbox
                        document.getElementById('modal-improver').checked = true;
                    },
                    onCancel: () => {
                        // Reset checkbox on cancel too
                        document.getElementById('modal-improver').checked = true;
                    }
                });
                warningModal.show();
                return;
            }
        }
    }
    
    try {
        // Save all changes before closing
        const updateData = {
            firstName: document.getElementById('modal-firstName').value,
            lastName: document.getElementById('modal-lastName').value,
            email: document.getElementById('modal-email').value,
            phoneNumber: document.getElementById('modal-phoneNumber').value,
            pronouns: document.getElementById('modal-pronouns').value,
            emailConsent: document.getElementById('modal-emailConsent').checked,
            over16Confirmed: document.getElementById('modal-over16Confirmed').checked,
            improver: newImproverStatus,
            crewMember: document.getElementById('modal-crewMember').checked,
            adminNotes: document.getElementById('modal-adminNotes').value
        };
        
        await updateStudent(studentId, updateData);
        
        // If improver status was just enabled, check for active concessions
        if (!previousImproverStatus && newImproverStatus) {
            const student = findStudentById(studentId);
            if (student) {
                await checkForConcessionsAndAlert(studentId, `${student.firstName} ${student.lastName}`, student.email);
            }
        }
        
        console.log('Student changes saved successfully');
    } catch (error) {
        console.error('Error saving student changes:', error);
        const errorModal = new ConfirmationModal({
            title: 'Error Saving Changes',
            message: '<p>An error occurred while saving the changes. Please try again.</p>',
            icon: 'fas fa-exclamation-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        errorModal.show();
        return; // Don't close modal if save failed
    }
    
    // Close the modal
    const modal = document.getElementById('student-modal');
    modal.style.display = 'none';
}

/**
 * Save student changes
 * @param {Event} event - Form submit event
 */
export async function saveStudentChanges(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('modal-student-id').value;
    const newImproverStatus = document.getElementById('modal-improver').checked;
    
    // Check if improver status changed
    if (previousImproverStatus !== newImproverStatus) {
        if (!newImproverStatus) {
            // Unchecking improver - show confirmation
            const confirmed = confirm(
                'This student will revert to using concessions. Their active membership will remain valid until expiry. Continue?'
            );
            if (!confirmed) {
                // Reset checkbox and return
                document.getElementById('modal-improver').checked = previousImproverStatus;
                return;
            }
        }
    }
    
    try {
        // Update all fields
        const updateData = {
            firstName: document.getElementById('modal-firstName').value,
            lastName: document.getElementById('modal-lastName').value,
            email: document.getElementById('modal-email').value,
            phoneNumber: document.getElementById('modal-phoneNumber').value,
            pronouns: document.getElementById('modal-pronouns').value,
            emailConsent: document.getElementById('modal-emailConsent').checked,
            over16Confirmed: document.getElementById('modal-over16Confirmed').checked,
            improver: newImproverStatus,
            crewMember: document.getElementById('modal-crewMember').checked,
            adminNotes: document.getElementById('modal-adminNotes').value
        };
        
        await updateStudent(studentId, updateData);
        
        // If improver status was just enabled, check for active concessions
        if (!previousImproverStatus && newImproverStatus) {
            const student = findStudentById(studentId);
            if (student) {
                await checkForConcessionsAndAlert(studentId, `${student.firstName} ${student.lastName}`, student.email);
            }
        }
        
        closeStudentModal();
        
        console.log('Student updated successfully');
    } catch (error) {
        console.error('Error updating student:', error);
        const errorModal = new ConfirmationModal({
            title: 'Error Updating Student',
            message: '<p>An error occurred while updating the student. Please try again.</p>',
            icon: 'fas fa-exclamation-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        errorModal.show();
    }
}

/**
 * Save student changes and return to view mode
 * @param {Event} event - Button click event
 */
export async function saveStudentAndReturnToView(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('modal-student-id').value;
    
    try {
        // Update all fields
        const updateData = {
            firstName: document.getElementById('modal-firstName').value,
            lastName: document.getElementById('modal-lastName').value,
            email: document.getElementById('modal-email').value,
            phoneNumber: document.getElementById('modal-phoneNumber').value,
            pronouns: document.getElementById('modal-pronouns').value,
            emailConsent: document.getElementById('modal-emailConsent').checked,
            over16Confirmed: document.getElementById('modal-over16Confirmed').checked,
            improver: document.getElementById('modal-improver').checked,
            crewMember: document.getElementById('modal-crewMember').checked,
            adminNotes: document.getElementById('modal-adminNotes').value
        };
        
        await updateStudent(studentId, updateData);
        
        // Get updated student and reopen in view mode
        const student = findStudentById(studentId);
        if (student) {
            openStudentModal(student, 'view');
        }
        
        console.log('Student updated successfully');
    } catch (error) {
        console.error('Error updating student:', error);
        const errorModal = new ConfirmationModal({
            title: 'Error Updating Student',
            message: '<p>An error occurred while updating the student. Please try again.</p>',
            icon: 'fas fa-exclamation-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        errorModal.show();
    }
}

/**
 * Update membership/concessions display based on improver status
 * @param {object} student - Student object
 */
async function updateMembershipConcessionsDisplay(student) {
    const membershipSection = document.getElementById('modal-membership-section');
    const concessionSection = document.getElementById('modal-concession-section');
    
    if (student.improver) {
        // Show membership info, hide concessions
        membershipSection.style.display = 'block';
        concessionSection.style.display = 'none';
        
        // Load membership details
        await loadMembershipInfo(student);
    } else {
        // Show concessions, hide membership
        membershipSection.style.display = 'none';
        concessionSection.style.display = 'block';
        
        // Load concession count
        await loadConcessionInfo(student.id);
    }
}

/**
 * Load and display membership information
 * @param {object} student - Student object
 */
async function loadMembershipInfo(student) {
    const membershipHeader = document.getElementById('modal-membership-header');
    const membershipDetails = document.getElementById('modal-membership-details');
    
    if (!student.activeMembershipId || !student.membershipExpiryDate) {
        // No active membership
        membershipHeader.innerHTML = `
            <i class="fas fa-id-card"></i>
            <strong>Membership Status:</strong>
            <span class="badge badge-no">No Active Membership</span>
        `;
        membershipDetails.innerHTML = `
            <div style="padding: 0.75rem; background: var(--bg-warning-pale); border-radius: 4px; border-left: 4px solid var(--text-orange);">
                <div style="font-weight: 500; color: var(--text-orange);">
                    <i class="fas fa-info-circle"></i>
                    This improver student does not have an active membership
                </div>
            </div>
        `;
        return;
    }
    
    try {
        // Get membership details
        const membership = await getMembershipDetails(student.activeMembershipId);
        
        if (!membership) {
            membershipHeader.innerHTML = `
                <i class="fas fa-id-card"></i>
                <strong>Membership Status:</strong>
                <span class="badge badge-no">No Active Membership</span>
            `;
            membershipDetails.innerHTML = '<div style="color: var(--text-muted);">Membership not found</div>';
            return;
        }
        
        // Calculate days remaining
        const expiryDate = student.membershipExpiryDate.toDate();
        const now = new Date();
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        // Active membership
        membershipHeader.innerHTML = `
            <i class="fas fa-id-card"></i>
            <strong>Membership Status:</strong>
            <span class="badge badge-yes">Active</span>
        `;
        
        // Format expiry date using UTC methods
        const day = String(expiryDate.getUTCDate()).padStart(2, '0');
        const month = String(expiryDate.getUTCMonth() + 1).padStart(2, '0');
        const year = expiryDate.getUTCFullYear();
        const formattedExpiryDate = `${day}/${month}/${year}`;
        
        membershipDetails.innerHTML = `
            <div style="padding: 0.75rem; background: var(--bg-success-light); border-radius: 4px; border-left: 4px solid var(--success);">
                <div style="font-weight: 500; margin-bottom: 0.5rem;">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    <strong>${membership.typeName || 'Monthly Membership'}</strong>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                    Valid until: <strong>${formattedExpiryDate}</strong>
                    <i class="fas fa-pencil-alt" 
                       onclick="openUpdateExpiryModal('${student.id}', '${student.firstName} ${student.lastName}', '${student.email}', '${expiryDate.toISOString()}', '${student.activeMembershipId}', ${membership.isRecurring || false})" 
                       style="margin-left: 0.5rem; color: var(--purple-primary); cursor: pointer;" 
                       title="Edit expiry date"></i>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted);">
                    ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining
                </div>
                ${membership.isRecurring ? `
                    <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-medium);">
                        <span style="font-size: 0.85rem; color: var(--text-muted);">
                            <i class="fas fa-sync-alt"></i> Auto-renewing monthly
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error loading membership info:', error);
        membershipHeader.innerHTML = `
            <i class="fas fa-id-card"></i>
            <strong>Membership Status:</strong>
            <span class="badge badge-no">Error Loading</span>
        `;
        membershipDetails.innerHTML = '<div style="color: var(--error);">Error loading membership details</div>';
    }
}

/**
 * Load and display concession information
 * @param {string} studentId - Student ID
 */
async function loadConcessionInfo(studentId) {
    const concessionCount = document.getElementById('modal-concession-count');
    
    try {
        const count = await getConcessionCount(studentId);
        concessionCount.textContent = count;
        concessionCount.className = count > 0 ? 'badge badge-yes' : 'badge badge-no';
    } catch (error) {
        console.error('Error loading concession info:', error);
        concessionCount.textContent = '—';
        concessionCount.className = 'badge';
    }
}

/**
 * Get membership details from Firestore
 * @param {string} membershipId - Membership ID
 * @returns {Promise<object|null>} Membership data
 */
async function getMembershipDetails(membershipId) {
    try {
        const doc = await db.collection('memberships').doc(membershipId).get();
        
        if (!doc.exists) {
            return null;
        }
        
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('Error getting membership details:', error);
        return null;
    }
}

/**
 * Get concession count for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<number>} Total remaining concessions across all blocks
 */
async function getConcessionCount(studentId) {
    try {
        const now = new Date();
        // Query by studentId only, filter remainingQuantity and expiryDate in JavaScript
        // This avoids needing a composite index
        const snapshot = await db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .get();
        
        // Sum up remaining concessions, excluding expired blocks and blocks with 0 remaining
        let totalRemaining = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            const remainingQuantity = data.remainingQuantity || 0;
            
            // Skip if no remaining concessions
            if (remainingQuantity <= 0) return;
            
            const expiryDate = data.expiryDate?.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
            
            // Only count if not expired
            if (expiryDate > now) {
                totalRemaining += remainingQuantity;
            }
        });
        
        return totalRemaining;
    } catch (error) {
        console.error('Error getting concession count:', error);
        return 0;
    }
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-NZ', options);
}

/**
 * Check for active concessions and send alert email
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student full name
 * @param {string} studentEmail - Student email
 */
async function checkForConcessionsAndAlert(studentId, studentName, studentEmail) {
    try {
        const now = new Date();
        // Query by studentId only, filter remainingQuantity and expiryDate in JavaScript
        // This avoids needing a composite index
        const snapshot = await db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .get();
        
        // Calculate total concessions and amount (excluding expired blocks and blocks with 0 remaining)
        let totalConcessions = 0;
        let totalAmount = 0;
        const concessionDetails = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const remainingQuantity = data.remainingQuantity || 0;
            
            // Skip if no remaining concessions
            if (remainingQuantity <= 0) return;
            
            const expiryDate = data.expiryDate?.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
            
            // Only count if not expired
            if (expiryDate > now) {
                totalConcessions += remainingQuantity;
                totalAmount += (data.price || 0);
                concessionDetails.push({
                    type: data.packageName || 'Unknown Package',
                    remaining: remainingQuantity,
                    price: data.price || 0
                });
            }
        });
        
        if (totalConcessions === 0) {
            console.log('No active concessions found for this improver');
            return;
        }
        
        // Call Cloud Function to send alert email
        const sendImproverAlert = firebase.functions().httpsCallable('sendImproverPromotionAlert');
        
        try {
            await sendImproverAlert({
                studentId,
                studentName,
                studentEmail,
                totalConcessions,
                totalAmount,
                concessionDetails
            });
            
            console.log('Improver promotion alert sent to admin');
            
            // Show modal to admin
            const alertModal = new ConfirmationModal({
                title: 'Improver Promotion Alert',
                message: `
                    <p><strong>${studentName}</strong> has been marked as an improver and has <strong>${totalConcessions}</strong> remaining concession${totalConcessions === 1 ? '' : 's'}.</p>
                    <p><strong>Total value: $${totalAmount.toFixed(2)}</strong></p>
                    <p>An email alert has been sent to <strong>dance@urbanswing.co.nz</strong> with full details.</p>
                    <p>Please process a pro-rated refund for unused concessions.</p>
                `,
                icon: 'fas fa-exclamation-triangle',
                confirmText: 'OK',
                confirmClass: 'btn-primary'
            });
            alertModal.show();
        } catch (error) {
            console.error('Error sending improver alert email:', error);
            // Still show modal even if email fails
            const alertModal = new ConfirmationModal({
                title: 'Improver Promotion Alert',
                message: `
                    <p><strong>${studentName}</strong> has been marked as an improver and has <strong>${totalConcessions}</strong> remaining concession${totalConcessions === 1 ? '' : 's'}.</p>
                    <p><strong>Total value: $${totalAmount.toFixed(2)}</strong></p>
                    <p class="error-message">Failed to send email alert. Please manually notify dance@urbanswing.co.nz</p>
                `,
                icon: 'fas fa-exclamation-triangle',
                confirmText: 'OK',
                confirmClass: 'btn-primary'
            });
            alertModal.show();
        }
    } catch (error) {
        console.error('Error checking for concessions:', error);
    }
}

// ========================================
// UPDATE MEMBERSHIP EXPIRY FUNCTIONALITY
// ========================================

let updateExpiryDatePicker = null;
let currentExpiryData = null; // Store current student/membership data

/**
 * Initialize the update expiry modal and date picker
 */
function initializeUpdateExpiryModal() {
    updateExpiryDatePicker = new DatePicker('update-expiry-new-date', 'update-expiry-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: true, // Don't allow dates in the past
        ignoreClosedown: true, // Admin can select any date
        showTime: false,
        onDateSelected: () => {
            // Enable the update button when a date is selected
            document.getElementById('confirm-update-expiry-btn').disabled = false;
        }
    });
}

/**
 * Open the update expiry modal
 * @param {string} studentId - Student document ID
 * @param {string} studentName - Student name
 * @param {string} studentEmail - Student email
 * @param {string} currentExpiryISO - Current expiry date in ISO format
 * @param {string} membershipId - Membership document ID
 * @param {boolean} isAutoRenewing - Whether the membership auto-renews via Stripe
 */
function openUpdateExpiryModal(studentId, studentName, studentEmail, currentExpiryISO, membershipId, isAutoRenewing = false) {
    const modal = document.getElementById('update-expiry-modal');
    if (!modal) return;

    // Store current data
    currentExpiryData = {
        studentId: studentId,
        studentName: studentName,
        studentEmail: studentEmail,
        currentExpiry: new Date(currentExpiryISO),
        membershipId: membershipId,
        isAutoRenewing: isAutoRenewing
    };

    // Populate modal fields
    document.getElementById('update-expiry-student-name').textContent = studentName;
    document.getElementById('update-expiry-student-email').textContent = studentEmail;
    
    // Format current expiry date using UTC methods
    const currentDate = currentExpiryData.currentExpiry;
    const day = String(currentDate.getUTCDate()).padStart(2, '0');
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    const year = currentDate.getUTCFullYear();
    document.getElementById('update-expiry-current-date').value = `${day}/${month}/${year}`;
    
    document.getElementById('update-expiry-reason').value = '';

    // Initialize date picker if not already initialized
    if (!updateExpiryDatePicker) {
        initializeUpdateExpiryModal();
    }

    // Reset date picker and disable button
    updateExpiryDatePicker.clearDate();
    document.getElementById('confirm-update-expiry-btn').disabled = true;

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close the update expiry modal
 */
function closeUpdateExpiryModal() {
    const modal = document.getElementById('update-expiry-modal');
    if (!modal) return;

    modal.style.display = 'none';
    currentExpiryData = null;
    
    if (updateExpiryDatePicker) {
        updateExpiryDatePicker.clearDate();
    }
    
    document.getElementById('update-expiry-reason').value = '';
    document.getElementById('confirm-update-expiry-btn').disabled = true;
}

/**
 * Quick extend the expiry date by a number of days
 * @param {number} days - Number of days to extend
 */
function quickExtendExpiry(days) {
    if (!currentExpiryData) return;

    const newDate = new Date(currentExpiryData.currentExpiry);
    newDate.setDate(newDate.getDate() + days);

    if (updateExpiryDatePicker) {
        updateExpiryDatePicker.setDate(newDate);
        document.getElementById('confirm-update-expiry-btn').disabled = false;
    }
}

/**
 * Confirm and submit the expiry date update
 */
async function confirmUpdateExpiry() {
    if (!currentExpiryData || !updateExpiryDatePicker) return;

    const newDate = updateExpiryDatePicker.selectedDate;
    if (!newDate) {
        alert('Please select a new expiry date');
        return;
    }

    // Validate: new date must be after current expiry date
    if (newDate <= currentExpiryData.currentExpiry) {
        alert('The new expiry date must be later than the current expiry date. Memberships can only be extended, not shortened.');
        return;
    }

    const reason = document.getElementById('update-expiry-reason').value.trim();
    const confirmBtn = document.getElementById('confirm-update-expiry-btn');

    // Disable button and show loading state
    confirmBtn.disabled = true;
    const originalHTML = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        // Format date as YYYY-MM-DD to avoid timezone issues
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const day = String(newDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Call the Cloud Function
        const updateMembershipExpiry = firebase.functions().httpsCallable('updateMembershipExpiry');
        const result = await updateMembershipExpiry({
            membershipId: currentExpiryData.membershipId,
            newExpiryDate: dateString,
            reason: reason || undefined
        });

        console.log('Expiry date updated successfully:', result.data);

        // Format the date for display (DD/MM/YYYY)
        const [displayYear, displayMonth, displayDay] = dateString.split('-');
        const formattedDate = `${displayDay}/${displayMonth}/${displayYear}`;

        // Show success message with different text for auto-renewing memberships
        let successMessage = `<p>The membership expiry date for <strong>${currentExpiryData.studentName}</strong> has been updated to <strong>${formattedDate}</strong>.</p>`;
        
        if (currentExpiryData.isAutoRenewing) {
            // Calculate pause duration
            const pauseDays = Math.ceil((newDate - currentExpiryData.currentExpiry) / (1000 * 60 * 60 * 24));
            successMessage += `<p style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">The Stripe subscription has been paused for <strong>${pauseDays} day${pauseDays === 1 ? '' : 's'}</strong> and will automatically resume billing on the new date.</p>`;
        }

        const successModal = new ConfirmationModal({
            title: 'Expiry Date Updated',
            message: successMessage,
            icon: 'fas fa-check-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        successModal.show();

        // Close update modal
        closeUpdateExpiryModal();

        // Close student modal - the real-time listener will update the table automatically
        closeStudentModal();

    } catch (error) {
        console.error('Error updating expiry date:', error);
        
        // Restore button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalHTML;

        // Show error message
        const errorModal = new ConfirmationModal({
            title: 'Update Failed',
            message: `<p>Failed to update expiry date: ${error.message}</p>`,
            icon: 'fas fa-exclamation-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        errorModal.show();
    }
}

// Expose expiry update functions globally for onclick handlers
if (typeof window !== 'undefined') {
    window.initializeUpdateExpiryModal = initializeUpdateExpiryModal;
    window.openUpdateExpiryModal = openUpdateExpiryModal;
    window.closeUpdateExpiryModal = closeUpdateExpiryModal;
    window.quickExtendExpiry = quickExtendExpiry;
    window.confirmUpdateExpiry = confirmUpdateExpiry;
}
