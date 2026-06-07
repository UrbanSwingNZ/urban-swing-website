/**
 * student-modal.js
 * Handles viewing and editing student details
 */

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
 * Close student modal
 */
export function closeStudentModal() {
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
        alert('Error updating student. Please try again.');
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
        alert('Error updating student. Please try again.');
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
        
        membershipDetails.innerHTML = `
            <div style="padding: 0.75rem; background: var(--bg-success-light); border-radius: 4px; border-left: 4px solid var(--success);">
                <div style="font-weight: 500; margin-bottom: 0.5rem;">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    <strong>${membership.typeName || 'Monthly Membership'}</strong>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                    Valid until: <strong>${formatDate(expiryDate)}</strong>
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
 * @returns {Promise<number>} Number of active concessions
 */
async function getConcessionCount(studentId) {
    try {
        const now = new Date();
        const snapshot = await db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('remaining', '>', 0)
            .where('expiryDate', '>', now)
            .get();
        
        return snapshot.size;
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
        const snapshot = await db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('remaining', '>', 0)
            .where('expiryDate', '>', now)
            .get();
        
        if (snapshot.empty) {
            console.log('No active concessions found for this improver');
            return;
        }
        
        // Calculate total concessions and amount
        let totalConcessions = 0;
        let totalAmount = 0;
        const concessionDetails = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalConcessions += data.remaining;
            totalAmount += (data.price || 0);
            concessionDetails.push({
                type: data.packageName || 'Unknown Package',
                remaining: data.remaining,
                price: data.price || 0
            });
        });
        
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
            alert(
                `IMPROVER PROMOTION ALERT\n\n` +
                `${studentName} has been marked as an improver and has ${totalConcessions} remaining concession${totalConcessions === 1 ? '' : 's'}.\n\n` +
                `Total value: $${totalAmount.toFixed(2)}\n\n` +
                `An email alert has been sent to dance@urbanswing.co.nz with full details. ` +
                `Please process a pro-rated refund for unused concessions.`
            );
        } catch (error) {
            console.error('Error sending improver alert email:', error);
            // Still show modal even if email fails
            alert(
                `IMPROVER PROMOTION ALERT\n\n` +
                `${studentName} has been marked as an improver and has ${totalConcessions} remaining concession${totalConcessions === 1 ? '' : 's'}.\n\n` +
                `Total value: $${totalAmount.toFixed(2)}\n\n` +
                `Please process a pro-rated refund for unused concessions.\n\n` +
                `(Email notification failed to send)`
            );
        }
    } catch (error) {
        console.error('Error checking for concessions:', error);
    }
}
