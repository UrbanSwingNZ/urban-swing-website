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
            icon = 'fa-check-circle';
            iconColor = 'var(--admin-success)';
            break;
        case 'expired':
            icon = 'fa-exclamation-circle';
            iconColor = 'var(--admin-error)';
            break;
        case 'depleted':
            icon = 'fa-battery-empty';
            iconColor = 'var(--admin-warning)';
            break;
        default:
            icon = 'fa-circle';
            iconColor = 'var(--text-muted)';
    }
    
    // Active sections are expanded by default, others are collapsed
    const isExpanded = status === 'active';
    const accordionId = `concession-accordion-${status}`;
    
    let html = `
        <div class="concessions-section">
            <h4 class="concession-accordion-header ${isExpanded ? 'active' : ''}" data-target="${accordionId}">
                <i class="fas ${icon}" style="color: ${iconColor};"></i> ${title} (${count})
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
function buildLockButton(block, status) {
    const isLocked = block.isLocked === true;
    
    if (status === 'active') {
        // Active blocks cannot be locked/unlocked
        return `<button class="btn-lock-toggle" disabled title="Cannot lock/unlock active concessions"><i class="fas fa-lock"></i> Lock</button>`;
    }
    
    // Expired and depleted blocks can be locked/unlocked (only by super admin)
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
