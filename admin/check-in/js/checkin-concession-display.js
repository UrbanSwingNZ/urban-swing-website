/**
 * checkin-concession-display.js - Concession info display
 */

/**
 * Show selected student info
 */
async function showSelectedStudent(student) {
    const selectedInfo = document.getElementById('selected-student-info');
    const fullName = getStudentFullName(student);
    
    document.getElementById('selected-student-name').textContent = fullName;
    document.getElementById('selected-student-email').textContent = student.email || '';
    document.getElementById('selected-student-id').value = student.id;
    
    // Check if student is improver - validate against selected check-in date
    const selectedDate = getSelectedCheckinDate();
    const membershipCheck = await window.checkStudentMembership(student.id, selectedDate);
    
    if (membershipCheck.isImprover) {
        // Improver student - show membership info
        await updateMembershipInfo(student, membershipCheck);
    } else {
        // Beginner student - show concession info (existing logic)
        await updateConcessionInfo(student);
    }
    
    selectedInfo.style.display = 'block';
    
    // Setup entry type listeners
    setupEntryTypeListeners();
}

/**
 * Update membership info display for improver students
 */
async function updateMembershipInfo(student, membershipCheck) {
    const concessionInfo = document.getElementById('concession-info');
    const membershipInfo = document.getElementById('membership-info');
    const purchaseSection = document.querySelector('.purchase-section');
    
    // Hide concession info, show membership info
    if (concessionInfo) concessionInfo.style.display = 'none';
    if (purchaseSection) purchaseSection.style.display = 'none';
    if (membershipInfo) membershipInfo.style.display = 'block';
    
    const membershipHeader = document.getElementById('membership-header');
    const membershipDetails = document.getElementById('membership-details');
    
    if (!membershipHeader || !membershipDetails) {
        console.error('Membership UI elements not found');
        return;
    }
    
    // Add improver badge to student name
    const studentNameEl = document.getElementById('selected-student-name');
    if (studentNameEl && !studentNameEl.querySelector('.improver-badge')) {
        const badge = document.createElement('span');
        badge.className = 'improver-badge';
        badge.style.marginLeft = '8px';
        badge.innerHTML = '<i class="fas fa-star"></i> IMPROVER';
        studentNameEl.appendChild(badge);
    }
    
    if (membershipCheck.hasActiveMembership) {
        // Has active membership
        const expiryDate = membershipCheck.expiryDate.toDate();
        const now = new Date();
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        membershipHeader.innerHTML = `
            <i class="fas fa-id-card"></i>
            <strong>Membership Status:</strong>
            <span class="badge badge-yes">Active</span>
        `;
        
        membershipDetails.innerHTML = `
            <div style="padding: 0.75rem; background: var(--bg-success-light); border-radius: 4px; border-left: 4px solid var(--success);">
                <div style="font-weight: 500; margin-bottom: 0.5rem;">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    Valid until: <strong>${formatDate(expiryDate)}</strong>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted);">
                    ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining
                </div>
            </div>
            <div style="margin-top: 0.75rem;">
                <button type="button" class="btn-primary btn-purchase" onclick="purchaseMembershipForStudent('${student.id}')">
                    <i class="fas fa-shopping-cart"></i> Renew Membership
                </button>
            </div>
        `;
        
        // Enable membership entry option
        const membershipRadio = document.getElementById('entry-membership');
        if (membershipRadio) {
            membershipRadio.disabled = false;
            membershipRadio.parentElement.style.opacity = '1';
            
            // Set as default if not in edit mode
            if (!isEditMode()) {
                membershipRadio.checked = true;
                membershipRadio.dispatchEvent(new Event('change'));
                document.getElementById('confirm-checkin-btn').disabled = false;
            }
        }
    } else {
        // No active membership
        membershipHeader.innerHTML = `
            <i class="fas fa-id-card"></i>
            <strong>Membership Status:</strong>
            <span class="badge badge-no">No Active Membership</span>
        `;
        
        membershipDetails.innerHTML = `
            <div style="padding: 0.75rem; background: var(--bg-error-light); border-radius: 4px; border-left: 4px solid var(--error);">
                <div style="font-weight: 500; margin-bottom: 0.5rem; color: var(--error);">
                    <i class="fas fa-exclamation-circle"></i>
                    This student does not have an active membership
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                    Admin can override and check in anyway
                </div>
                <button type="button" class="btn-primary btn-purchase" onclick="purchaseMembershipForStudent('${student.id}')">
                    <i class="fas fa-shopping-cart"></i> Purchase Membership
                </button>
            </div>
        `;
        
        // Disable membership entry option
        const membershipRadio = document.getElementById('entry-membership');
        if (membershipRadio) {
            membershipRadio.disabled = true;
            membershipRadio.parentElement.style.opacity = '0.5';
        }
        
        // Default to casual entry if not in edit mode
        if (!isEditMode()) {
            const casualEntryRadio = document.getElementById('entry-casual');
            if (casualEntryRadio) {
                casualEntryRadio.checked = true;
                casualEntryRadio.dispatchEvent(new Event('change'));
            }
        }
    }
}

/**
 * Open membership assignment modal for a student (called from check-in UI)
 */
function purchaseMembershipForStudent(studentId) {
    const student = getSelectedStudent();
    if (!student || student.id !== studentId) {
        window.showSnackbar('Student not found', 'error');
        return;
    }
    
    // Hide check-in modal before opening membership assignment modal
    document.getElementById('checkin-modal').style.display = 'none';
    
    // Get the selected check-in date
    const selectedDate = getSelectedCheckinDate();
    
    // Open membership assignment modal with student ID, callback, parent modal ID, student object, and check-in date
    window.openMembershipAssignmentModal(student.id, async (result) => {
        // Fetch fresh student data from Firestore
        const studentDoc = await firebase.firestore().collection('students').doc(student.id).get();
        if (!studentDoc.exists) {
            window.showSnackbar('Error: Student not found', 'error');
            return;
        }
        
        const freshStudentData = {
            id: studentDoc.id,
            ...studentDoc.data()
        };
        
        // Re-set the selected student with fresh data
        setSelectedStudent(freshStudentData);
        
        // Refresh membership info after assignment - validate against selected check-in date
        const selectedDate = getSelectedCheckinDate();
        const membershipCheck = await window.checkStudentMembership(student.id, selectedDate);
        if (membershipCheck.isImprover) {
            await updateMembershipInfo(freshStudentData, membershipCheck);
        }
    }, 'checkin-modal', student, selectedDate);
}

// Expose functions globally
window.purchaseMembershipForStudent = purchaseMembershipForStudent;
window.updateMembershipInfo = updateMembershipInfo;

/**
 * Update concession info display
 */
async function updateConcessionInfo(student) {
    const balanceSpan = document.getElementById('concession-balance');
    const blocksDiv = document.getElementById('concession-blocks');
    
    // Show loading state
    balanceSpan.textContent = 'Loading...';
    blocksDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Loading blocks...</p>';
    
    try {
        const concessionData = await getConcessionData(student.id);
        
        // Display balance
        if (concessionData.totalBalance > 0) {
            // Has balance - show just expired count if any, blocks will show the details
            if (concessionData.expiredBalance > 0) {
                balanceSpan.textContent = `(incl. ${concessionData.expiredBalance} expired)`;
            } else {
                // Hide balance text entirely when blocks will show the details
                balanceSpan.textContent = '';
            }
            
            // Show blocks with full details
            blocksDiv.style.display = 'block';
            blocksDiv.innerHTML = concessionData.blocks
                .map(block => formatConcessionBlock(block))
                .join('');
        } else {
            // No balance - show clear message
            balanceSpan.textContent = 'No concessions available';
            // Hide blocks div entirely when no concessions
            blocksDiv.style.display = 'none';
        }
        
        // Enable/disable concession option based on balance
        const concessionRadio = document.getElementById('entry-concession');
        const casualRadio = document.getElementById('entry-casual');
        const freeEntryRadio = document.getElementById('entry-free');
        const freeEntryReasonSelect = document.getElementById('free-entry-reason');
        
        if (concessionData.totalBalance > 0) {
            concessionRadio.disabled = false;
            concessionRadio.parentElement.style.opacity = '1';
        } else {
            concessionRadio.disabled = true;
            concessionRadio.parentElement.style.opacity = '0.5';
        }
        
        // Disable membership option for non-improver students
        const membershipRadio = document.getElementById('entry-membership');
        if (membershipRadio) {
            membershipRadio.disabled = true;
            membershipRadio.parentElement.style.opacity = '0.5';
        }
        
        // Set defaults only if NOT in edit mode
        if (!isEditMode()) {
            // If student is a crew member, default to free entry with crew member reason
            if (student.crewMember === true) {
                freeEntryRadio.checked = true;
                freeEntryRadio.dispatchEvent(new Event('change'));
                
                // Set crew member as the reason
                if (freeEntryReasonSelect) {
                    freeEntryReasonSelect.value = 'crew-member';
                }
            } else if (concessionData.totalBalance > 0) {
                // Has active concession - default to using it
                concessionRadio.checked = true;
                concessionRadio.dispatchEvent(new Event('change'));
            } else {
                // No concession - default to casual
                casualRadio.checked = true;
                casualRadio.dispatchEvent(new Event('change'));
            }
            
            // Enable confirm button since we have a default selection
            document.getElementById('confirm-checkin-btn').disabled = false;
        }
    } catch (error) {
        console.error('Error loading concession info:', error);
        balanceSpan.textContent = 'Error loading balance';
        blocksDiv.innerHTML = '<p style="color: var(--danger); font-size: 0.9rem;">Error loading blocks</p>';
    }
}

/**
 * Get concession data for a student from Firestore
 * Note: Excludes locked blocks - they should only appear in the Concessions tab
 */
async function getConcessionData(studentId) {
    try {
        // Get all blocks with remaining quantity (simplified query to avoid complex indexes)
        const snapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('remainingQuantity', '>', 0)
            .get();
        
        let totalBalance = 0;
        let expiredBalance = 0;
        const blocks = [];
        const now = new Date();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Skip locked blocks - they should not appear in check-in modal
            if (data.isLocked === true) {
                return;
            }
            
            totalBalance += data.remainingQuantity;
            
            // Determine actual status based on expiry date, not stored status
            const expiryDate = data.expiryDate ? data.expiryDate.toDate() : null;
            const isExpired = expiryDate && expiryDate < now;
            
            if (isExpired) {
                expiredBalance += data.remainingQuantity;
            }
            
            blocks.push({
                id: doc.id,
                packageName: data.packageName,
                remainingQuantity: data.remainingQuantity,
                originalQuantity: data.originalQuantity,
                initialQuantity: data.initialQuantity,
                status: isExpired ? 'expired' : 'active', // Calculate status dynamically
                purchaseDate: data.purchaseDate ? data.purchaseDate.toDate() : null,
                expiryDate: expiryDate
            });
        });
        
        return {
            totalBalance,
            expiredBalance,
            blocks
        };
    } catch (error) {
        console.error('Error getting concession data:', error);
        return {
            totalBalance: 0,
            expiredBalance: 0,
            blocks: []
        };
    }
}

/**
 * Format a concession block for display
 * Note: Locked blocks are filtered out before display, so no lock badge is needed
 */
function formatConcessionBlock(block) {
    // Status badge - green for active, red for expired
    const statusBadge = block.status === 'expired' 
        ? '<span class="badge badge-no">Expired</span>'
        : '<span class="badge badge-yes">Active</span>';
    
    const expiryInfo = block.expiryDate
        ? `${formatDate(block.expiryDate)}`
        : 'No expiry date';
    
    return `
        <div style="padding: 0.75rem; margin-bottom: 0.5rem; background: var(--background-secondary); border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <strong>${block.packageName}</strong>
                    ${statusBadge}
                </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                Expires: ${expiryInfo}
            </div>
            <div style="font-size: 0.95rem; font-weight: 500;">
                ${block.remainingQuantity} of ${block.initialQuantity || block.originalQuantity} classes remaining
            </div>
        </div>
    `;
}
