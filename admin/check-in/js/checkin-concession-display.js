/**
 * checkin-concession-display.js - Concession info display
 */

/**
 * Show selected student info
 */
function showSelectedStudent(student) {
    const selectedInfo = document.getElementById('selected-student-info');
    const fullName = getStudentFullName(student);
    
    document.getElementById('selected-student-name').textContent = fullName;
    document.getElementById('selected-student-email').textContent = student.email || '';
    document.getElementById('selected-student-id').value = student.id;
    
    // Show concession info
    updateConcessionInfo(student);
    
    selectedInfo.style.display = 'block';
    
    // Setup entry type listeners
    setupEntryTypeListeners();
    
    // If student is a crew member, default to free entry with crew member reason
    if (student.crewMember === true) {
        setTimeout(() => {
            const freeEntryRadio = document.getElementById('entry-free');
            if (freeEntryRadio) {
                freeEntryRadio.checked = true;
                freeEntryRadio.dispatchEvent(new Event('change'));
                
                // Set crew member as the reason
                const freeEntryReasonSelect = document.getElementById('free-entry-reason');
                if (freeEntryReasonSelect) {
                    freeEntryReasonSelect.value = 'crew-member';
                }
                
                // Enable confirm button
                document.getElementById('confirm-checkin-btn').disabled = false;
            }
        }, 100); // Small delay to ensure concession info is loaded first
    }
}

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
        
        if (concessionData.totalBalance > 0) {
            concessionRadio.disabled = false;
            concessionRadio.parentElement.style.opacity = '1';
            // Default to concession if available
            concessionRadio.checked = true;
            // Trigger change event to update form state
            concessionRadio.dispatchEvent(new Event('change'));
        } else {
            concessionRadio.disabled = true;
            concessionRadio.parentElement.style.opacity = '0.5';
            // Default to casual if no concession
            casualRadio.checked = true;
            // Trigger change event to show payment section
            casualRadio.dispatchEvent(new Event('change'));
        }
        
        // Enable confirm button since we have a default selection
        document.getElementById('confirm-checkin-btn').disabled = false;
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
                remaining: data.remainingQuantity,
                original: data.originalQuantity,
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
                ${block.remaining} / ${block.original} remaining
            </div>
        </div>
    `;
}
