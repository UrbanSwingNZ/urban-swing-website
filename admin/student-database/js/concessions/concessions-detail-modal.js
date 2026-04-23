/**
 * Concessions Detail Modal Module
 * Handles displaying the detailed concessions modal for a student
 */

/**
 * Show concessions detail modal
 */
async function showConcessionsDetail(studentId) {
    const student = findStudentById(studentId);
    if (!student) return;
    
    const modal = document.getElementById('concessions-detail-modal');
    const studentNameEl = document.getElementById('concessions-student-name');
    const contentEl = document.getElementById('concessions-detail-content');
    
    // Set student name
    studentNameEl.textContent = getStudentFullName(student);
    
    // Show loading
    contentEl.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading concessions...</p>';
    modal.style.display = 'flex';
    
    // Fetch concession blocks
    const blocks = await getStudentConcessionBlocks(studentId);
    const stats = calculateConcessionStats(blocks);
    
    // Build content HTML
    let html = '';
    
    if (blocks.length === 0) {
        html = '<p class="text-muted">This student has no concession blocks.</p>';
    } else {
        // Add bulk action button if there are expired blocks
        if (stats.expiredCount > 0) {
            const hasUnlockedExpired = stats.expiredBlocks.some(b => b.isLocked !== true);
            if (hasUnlockedExpired) {
                html += `
                    <div class="bulk-actions">
                        <button class="btn-cancel btn-lock-all-expired" data-student-id="${studentId}">
                            <i class="fas fa-lock"></i> Lock All Expired Concessions
                        </button>
                    </div>
                `;
            }
        }
        
        // Active concessions section (balance > 0 and not expired)
        if (stats.activeBlocks.length > 0) {
            html += buildConcessionSection(
                'Active Concessions',
                stats.activeCount,
                stats.activeBlocks,
                'active'
            );
        }
        
        // Expired concessions section (balance > 0 but past expiry)
        if (stats.expiredBlocks.length > 0) {
            html += buildConcessionSection(
                'Expired Concessions',
                stats.expiredCount,
                stats.expiredBlocks,
                'expired'
            );
        }
        
        // Depleted concessions section (balance = 0)
        if (stats.depletedBlocks.length > 0) {
            html += buildConcessionSection(
                'Depleted Concessions',
                stats.depletedBlocks.length,
                stats.depletedBlocks,
                'depleted'
            );
        }
    }
    
    contentEl.innerHTML = html;
    
    // Add event listeners
    attachConcessionDetailEventListeners(contentEl, studentId);
}

/**
 * Build HTML for a concession section (active, expired, or depleted)
 */
function buildConcessionSection(title, count, blocks, status) {
    let icon, iconColor;
    
    switch (status) {
        case 'active':
            icon = ICONS.SUCCESS;
            iconColor = 'var(--success)';
            break;
        case 'expired':
            icon = ICONS.ERROR;
            iconColor = 'var(--error)';
            break;
        case 'depleted':
            icon = 'fa-battery-empty';
            iconColor = 'var(--warning)';
            break;
        default:
            icon = 'fa-circle';
            iconColor = 'var(--text-muted)';
    }
    
    // Check if any blocks in this section are locked
    const hasLockedBlocks = blocks.some(block => block.isLocked === true);
    const lockedBadge = hasLockedBlocks ? '<span class="badge badge-locked" style="margin-left: 8px;"><i class="fas fa-lock"></i> LOCKED</span>' : '';
    
    // Active sections are expanded by default, others are collapsed
    const isExpanded = status === 'active';
    const accordionId = `concession-accordion-${status}`;
    
    let html = `
        <div class="concessions-section">
            <h4 class="concession-accordion-header ${isExpanded ? 'active' : ''}" data-target="${accordionId}">
                <i class="fas ${icon}" style="color: ${iconColor};"></i> ${title} (${count}) ${lockedBadge}
                <i class="fas fa-chevron-down accordion-icon"></i>
            </h4>
            <div id="${accordionId}" class="concessions-list accordion-content ${isExpanded ? 'show' : ''}">
    `;
    
    blocks.forEach(block => {
        html += buildConcessionItem(block, status);
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Build HTML for a single concession item
 */
function buildConcessionItem(block, status) {
    const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
    const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
    const isLocked = block.isLocked === true;
    const hasBeenUsed = block.remainingQuantity < block.originalQuantity;
    
    const lockBadge = isLocked ? '<span class="badge badge-locked" style="margin-left: 8px;"><i class="fas fa-lock"></i> Locked</span>' : '';
    
    // Determine button states based on block status
    const lockButton = buildLockButton(block, status);
    const deleteButton = buildDeleteButton(block, hasBeenUsed);
    
    // Get existing notes for locked blocks (any status) or expired/depleted items
    const existingNotes = block.lockNotes || '';
    const showNotes = isLocked || status === 'expired' || status === 'depleted';
    
    // Set labels and icons based on status
    let expiryLabel, expiryIcon, entriesLabel, statusClass;
    
    switch (status) {
        case 'expired':
            expiryLabel = 'Expired';
            expiryIcon = 'fa-calendar-times';
            entriesLabel = 'entries unused';
            statusClass = 'expired';
            break;
        case 'depleted':
            expiryLabel = 'Expired';
            expiryIcon = 'fa-calendar-alt';
            entriesLabel = 'entries (all used)';
            statusClass = 'depleted';
            break;
        case 'active':
        default:
            expiryLabel = 'Expires';
            expiryIcon = 'fa-calendar-alt';
            entriesLabel = 'entries remaining';
            statusClass = '';
    }
    
    return `
        <div class="concession-item ${statusClass} ${isLocked ? 'locked' : ''}">
            <div class="concession-info">
                <strong>${block.remainingQuantity || 0} ${entriesLabel}</strong>
                <span class="text-muted">of ${block.initialQuantity || block.originalQuantity || 0} total</span>
                ${lockBadge}
            </div>
            <div class="concession-details">
                <span><i class="fas ${expiryIcon}"></i> ${expiryLabel}: ${formatDate(expiryDate)}</span>
                <span><i class="fas fa-shopping-cart"></i> Purchased: ${formatDate(purchaseDate)}</span>
            </div>
            ${showNotes ? `
            <div class="concession-notes">
                <label for="notes-${block.id}">Notes:</label>
                <textarea 
                    id="notes-${block.id}" 
                    class="concession-notes-input" 
                    data-block-id="${block.id}"
                    placeholder="Add notes about why this concession is locked/unlocked..."
                    rows="3">${existingNotes}</textarea>
                <span class="notes-save-status" id="notes-status-${block.id}"></span>
            </div>
            ` : ''}
            <div class="concession-actions">
                ${buildEditExpiryButton(block, status)}
                ${lockButton}
                ${deleteButton}
            </div>
        </div>
    `;
}

/**
 * Build lock/unlock button HTML
 */
function buildLockButton(block, status) {
    const isLocked = block.isLocked === true;
    
    // Only super admin can lock/unlock blocks
    if (!isSuperAdmin()) {
        return '';
    }
    
    if (isLocked) {
        return `<button class="btn-cancel" data-block-id="${block.id}" data-locked="true" title="Unlock this block"><i class="fas fa-unlock"></i> Unlock</button>`;
    } else {
        return `<button class="btn-cancel" data-block-id="${block.id}" data-locked="false" title="Lock this block"><i class="fas fa-lock"></i> Lock</button>`;
    }
}

/**
 * Build delete button HTML
 */
function buildDeleteButton(block, hasBeenUsed) {
    if (!isSuperAdmin() || hasBeenUsed) {
        const title = !isSuperAdmin() 
            ? 'Only super admin can delete' 
            : 'Cannot delete - concession has been used';
        return `<button class="btn-delete" disabled title="${title}"><i class="fas fa-trash"></i> Delete</button>`;
    }
    
    return `<button class="btn-delete" data-block-id="${block.id}" title="Delete this block"><i class="fas fa-trash"></i> Delete</button>`;
}

/**
 * Build edit expiry button HTML
 * Only visible to super admin for active, unlocked blocks
 */
function buildEditExpiryButton(block, status) {
    // Only show for super admin, active blocks that are not locked
    if (!isSuperAdmin() || status !== 'active' || block.isLocked === true) {
        return '';
    }
    
    const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
    const currentExpiryStr = formatDate(expiryDate);
    
    return `<button class="btn-primary" data-block-id="${block.id}" data-student-id="${block.studentId}" data-current-expiry="${currentExpiryStr}" title="Edit expiry date"><i class="fas fa-calendar-edit"></i> Edit Expiry</button>`;
}

/**
 * Attach event listeners to concession detail modal elements
 */
function attachConcessionDetailEventListeners(contentEl, studentId) {
    // Accordion headers
    contentEl.querySelectorAll('.concession-accordion-header').forEach(header => {
        header.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = header.dataset.target;
            const content = document.getElementById(targetId);
            
            // Toggle active class on header
            header.classList.toggle('active');
            
            // Toggle show class on content
            content.classList.toggle('show');
        });
    });
    
    // Lock/unlock buttons
    contentEl.querySelectorAll('.btn-cancel[data-locked]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const blockId = btn.dataset.blockId;
            const isLocked = btn.dataset.locked === 'true';
            
            try {
                if (isLocked) {
                    await unlockConcessionBlock(blockId);
                    showSnackbar('Concession block unlocked successfully', 'success');
                } else {
                    await lockConcessionBlock(blockId);
                    showSnackbar('Concession block locked successfully', 'success');
                }
                // Refresh the modal
                await showConcessionsDetail(studentId);
            } catch (error) {
                showSnackbar('Error toggling lock: ' + error.message, 'error');
            }
        });
    });
    
    // Edit Expiry buttons
    contentEl.querySelectorAll('.btn-primary[data-block-id][data-current-expiry]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const blockId = btn.dataset.blockId;
            const studentIdFromBtn = btn.dataset.studentId;
            const currentExpiry = btn.dataset.currentExpiry;
            showEditExpiryModal(blockId, studentIdFromBtn, currentExpiry);
        });
    });
    
    // Delete buttons
    contentEl.querySelectorAll('.btn-delete').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const blockId = btn.dataset.blockId;
                showDeleteConfirmationModal(blockId, studentId);
            });
        }
    });
    
    // Notes input - auto-save with debounce
    const notesDebounceTimers = {};
    contentEl.querySelectorAll('.concession-notes-input').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const blockId = textarea.dataset.blockId;
            const notes = textarea.value;
            const statusEl = document.getElementById(`notes-status-${blockId}`);
            
            // Clear existing timer for this textarea
            if (notesDebounceTimers[blockId]) {
                clearTimeout(notesDebounceTimers[blockId]);
            }
            
            // Show "saving..." indicator
            if (statusEl) {
                statusEl.textContent = 'Saving...';
                statusEl.className = 'notes-save-status saving';
            }
            
            // Set new timer to save after user stops typing (1 second delay)
            notesDebounceTimers[blockId] = setTimeout(async () => {
                try {
                    await updateConcessionBlockNotes(blockId, notes);
                    if (statusEl) {
                        statusEl.textContent = 'Saved';
                        statusEl.className = 'notes-save-status saved';
                        // Clear the saved message after 2 seconds
                        setTimeout(() => {
                            statusEl.textContent = '';
                            statusEl.className = 'notes-save-status';
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error saving notes:', error);
                    if (statusEl) {
                        statusEl.textContent = 'Error saving';
                        statusEl.className = 'notes-save-status error';
                    }
                }
            }, 1000);
        });
    });
    
    // Lock all expired button
    const lockAllBtn = contentEl.querySelector('.btn-lock-all-expired');
    if (lockAllBtn) {
        lockAllBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const studentId = lockAllBtn.dataset.studentId;
            
            if (!confirm('Lock all expired concession blocks for this student? They will not be able to use these blocks until unlocked.')) {
                return;
            }
            
            try {
                const count = await lockAllExpiredBlocks(studentId);
                showSnackbar(`${count} expired concession block(s) locked successfully`, 'success');
                // Refresh the modal
                await showConcessionsDetail(studentId);
            } catch (error) {
                showSnackbar('Error locking expired blocks: ' + error.message, 'error');
            }
        });
    }
}

/**
 * Show edit expiry modal
 */
function showEditExpiryModal(blockId, studentId, currentExpiry) {
    const modal = document.getElementById('edit-expiry-modal');
    const currentExpiryEl = document.getElementById('current-expiry-date');
    const dateInput = document.getElementById('edit-expiry-date');
    
    // Display current expiry
    currentExpiryEl.textContent = currentExpiry;
    
    // Clear previous input
    dateInput.value = '';
    
    // Store block and student IDs for save operation
    modal.dataset.blockId = blockId;
    modal.dataset.studentId = studentId;
    
    // Initialize DatePicker if not already done
    if (!window.editExpiryDatePicker) {
        window.editExpiryDatePicker = new DatePicker('edit-expiry-date', 'edit-expiry-calendar', {
            allowedDays: [0, 1, 2, 3, 4, 5, 6],
            disablePastDates: false,
            ignoreClosedown: true
        });
    }
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close edit expiry modal
 */
function closeEditExpiryModal() {
    const modal = document.getElementById('edit-expiry-modal');
    modal.style.display = 'none';
    
    // Clear stored data
    delete modal.dataset.blockId;
    delete modal.dataset.studentId;
}

/**
 * Save new expiry date
 */
async function saveExpiryDate() {
    const modal = document.getElementById('edit-expiry-modal');
    const blockId = modal.dataset.blockId;
    const studentId = modal.dataset.studentId;
    const dateInput = document.getElementById('edit-expiry-date');
    const saveBtn = document.getElementById('save-expiry-btn');
    
    if (!dateInput.value) {
        showSnackbar('Please select an expiry date', 'error');
        return;
    }
    
    // Parse the date (format: d/mm/yyyy)
    const dateParts = dateInput.value.split('/');
    if (dateParts.length !== 3) {
        showSnackbar('Invalid date format', 'error');
        return;
    }
    
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
    const year = parseInt(dateParts[2]);
    const newExpiryDate = new Date(year, month, day);
    
    // Disable button and show loading
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Update the concession block in Firestore
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .update({
                expiryDate: firebase.firestore.Timestamp.fromDate(newExpiryDate),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Update the status based on the new expiry date
        const now = new Date();
        const isExpired = newExpiryDate < now;
        const blockSnapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .get();
        
        const blockData = blockSnapshot.data();
        const newStatus = blockData.remainingQuantity === 0 ? 'depleted' : (isExpired ? 'expired' : 'active');
        
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .update({
                status: newStatus
            });
        
        // Update student balance if status changed
        if (typeof updateStudentBalance === 'function') {
            await updateStudentBalance(studentId);
        }
        
        showSnackbar('Expiry date updated successfully', 'success');
        
        // Close the edit modal
        closeEditExpiryModal();
        
        // Refresh the concessions detail modal if it's open
        const concessionsDetailModal = document.getElementById('concessions-detail-modal');
        if (concessionsDetailModal && concessionsDetailModal.style.display === 'flex') {
            await showConcessionsDetail(studentId);
        }
        
        // Refresh the transaction history modal if it's open
        const transactionHistoryModal = document.getElementById('transaction-history-modal');
        if (transactionHistoryModal && transactionHistoryModal.style.display === 'flex') {
            // Check if concessions tab is active
            const concessionsTab = document.querySelector('[data-tab="concessions-content"]');
            if (concessionsTab && concessionsTab.classList.contains('active')) {
                // Reload concessions in transaction history
                if (typeof loadTransactionHistoryConcessions === 'function') {
                    await loadTransactionHistoryConcessions(studentId);
                }
            }
        }
        
    } catch (error) {
        console.error('Error updating expiry date:', error);
        showSnackbar('Error updating expiry date: ' + error.message, 'error');
    } finally {
        // Re-enable button
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

/**
 * Initialize edit expiry modal listeners
 */
function initializeEditExpiryModal() {
    const saveBtn = document.getElementById('save-expiry-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveExpiryDate);
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('edit-expiry-modal');
            if (modal && modal.style.display === 'flex') {
                closeEditExpiryModal();
            }
        }
    });
    
    // Close when clicking outside
    const modal = document.getElementById('edit-expiry-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditExpiryModal();
            }
        });
    }
}

/**
 * Close concessions detail modal
 */
function closeConcessionsDetailModal() {
    const modal = document.getElementById('concessions-detail-modal');
    
    // Get the student ID before closing
    const studentNameEl = document.getElementById('concessions-student-name');
    if (studentNameEl && studentNameEl.textContent) {
        const students = getStudentsData();
        const student = students.find(s => 
            getStudentFullName(s) === studentNameEl.textContent
        );
        
        // Update the badge in the table
        if (student && student.id) {
            updateStudentConcessionBadge(student.id);
        }
    }
    
    modal.style.display = 'none';
}

/**
 * Initialize Purchase Concessions button in detail modal
 */
function initializePurchaseConcessionsButton() {
    // Initialize edit expiry modal
    initializeEditExpiryModal();
    
    const purchaseBtn = document.getElementById('purchase-concessions-from-detail-btn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async () => {
            // Get the current student ID from the modal
            const studentNameEl = document.getElementById('concessions-student-name');
            const studentName = studentNameEl.textContent;
            
            // Find the student by name
            const students = getStudentsData();
            const student = students.find(s => 
                getStudentFullName(s) === studentName
            );
            
            if (student) {
                // Close concessions detail modal
                closeConcessionsDetailModal();
                
                // Open purchase concessions modal
                openPurchaseConcessionsModal(student.id, async (result) => {
                    // After purchase, reload and show the concessions detail modal again
                    await showConcessionsDetail(student.id);
                }, 'concessions-detail-modal', student);
            }
        });
    }
}

// Initialize button when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePurchaseConcessionsButton);
} else {
    initializePurchaseConcessionsButton();
}
