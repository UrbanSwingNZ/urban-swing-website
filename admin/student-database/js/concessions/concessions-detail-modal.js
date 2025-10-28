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
                        <button class="btn-secondary btn-lock-all-expired" data-student-id="${studentId}">
                            <i class="fas fa-lock"></i> Lock All Expired Concessions
                        </button>
                    </div>
                `;
            }
        }
        
        // Unexpired concessions section
        if (stats.unexpiredBlocks.length > 0) {
            html += buildConcessionSection(
                'Active Concessions',
                stats.unexpiredCount,
                stats.unexpiredBlocks,
                false
            );
        }
        
        // Expired concessions section
        if (stats.expiredBlocks.length > 0) {
            html += buildConcessionSection(
                'Expired Concessions',
                stats.expiredCount,
                stats.expiredBlocks,
                true
            );
        }
    }
    
    contentEl.innerHTML = html;
    
    // Add event listeners
    attachConcessionDetailEventListeners(contentEl, studentId);
}

/**
 * Build HTML for a concession section (active or expired)
 */
function buildConcessionSection(title, count, blocks, isExpired) {
    const icon = isExpired 
        ? '<i class="fas fa-exclamation-circle" style="color: var(--admin-error);"></i>'
        : '<i class="fas fa-check-circle" style="color: var(--admin-success);"></i>';
    
    let html = `
        <div class="concessions-section">
            <h4>${icon} ${title} (${count})</h4>
            <div class="concessions-list">
    `;
    
    blocks.forEach(block => {
        html += buildConcessionItem(block, isExpired);
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
function buildConcessionItem(block, isExpired) {
    const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
    const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
    const isLocked = block.isLocked === true;
    const hasBeenUsed = block.remainingQuantity < block.originalQuantity;
    
    const lockBadge = isLocked ? '<span class="badge badge-locked" style="margin-left: 8px;"><i class="fas fa-lock"></i> Locked</span>' : '';
    
    // Determine button states based on block status
    const lockButton = buildLockButton(block, isExpired);
    const deleteButton = buildDeleteButton(block, hasBeenUsed);
    
    const expiryLabel = isExpired ? 'Expired' : 'Expires';
    const expiryIcon = isExpired ? 'fa-calendar-times' : 'fa-calendar-alt';
    const entriesLabel = isExpired ? 'entries unused' : 'entries remaining';
    
    return `
        <div class="concession-item ${isExpired ? 'expired' : ''} ${isLocked ? 'locked' : ''}">
            <div class="concession-info">
                <strong>${block.remainingQuantity} ${entriesLabel}</strong>
                <span class="text-muted">of ${block.originalQuantity} total</span>
                ${lockBadge}
            </div>
            <div class="concession-details">
                <span><i class="fas ${expiryIcon}"></i> ${expiryLabel}: ${formatDate(expiryDate)}</span>
                <span><i class="fas fa-shopping-cart"></i> Purchased: ${formatDate(purchaseDate)}</span>
            </div>
            <div class="concession-actions">
                ${lockButton}
                ${deleteButton}
            </div>
        </div>
    `;
}

/**
 * Build lock/unlock button HTML
 */
function buildLockButton(block, isExpired) {
    const isLocked = block.isLocked === true;
    
    if (!isExpired) {
        // Active blocks cannot be locked/unlocked
        return `<button class="btn-lock-toggle" disabled title="Cannot lock/unlock active concessions"><i class="fas fa-lock"></i> Lock</button>`;
    }
    
    // Expired blocks can be locked/unlocked (only by super admin)
    if (!isSuperAdmin()) {
        return '';
    }
    
    if (isLocked) {
        return `<button class="btn-lock-toggle" data-block-id="${block.id}" data-locked="true" title="Unlock this block"><i class="fas fa-unlock"></i> Unlock</button>`;
    } else {
        return `<button class="btn-lock-toggle" data-block-id="${block.id}" data-locked="false" title="Lock this block"><i class="fas fa-lock"></i> Lock</button>`;
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
        return `<button class="btn-delete-block" disabled title="${title}"><i class="fas fa-trash"></i> Delete</button>`;
    }
    
    return `<button class="btn-delete-block" data-block-id="${block.id}" title="Delete this block"><i class="fas fa-trash"></i> Delete</button>`;
}

/**
 * Attach event listeners to concession detail modal elements
 */
function attachConcessionDetailEventListeners(contentEl, studentId) {
    // Lock/unlock buttons
    contentEl.querySelectorAll('.btn-lock-toggle').forEach(btn => {
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
    
    // Delete buttons
    contentEl.querySelectorAll('.btn-delete-block').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const blockId = btn.dataset.blockId;
                showDeleteConfirmationModal(blockId, studentId);
            });
        }
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
