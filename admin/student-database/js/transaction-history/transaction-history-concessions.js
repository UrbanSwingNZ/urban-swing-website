/**
 * transaction-history-concessions.js
 * Handles loading and displaying concession information
 * Reuses logic and display from concessions.js
 */

/**
 * Load concession information for a student
 * Reuses getStudentConcessionBlocks and calculateConcessionStats from concessions.js
 */
async function loadTransactionHistoryConcessions(studentId) {
    const contentEl = document.getElementById('concessions-content');
    
    // Show loading
    contentEl.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading concession information...</p>';
    
    try {
        // Reuse existing function from concessions.js
        const blocks = await getStudentConcessionBlocks(studentId);
        const stats = calculateConcessionStats(blocks);
        
        displayConcessionInfo(blocks, stats, studentId);
    } catch (error) {
        console.error('Error loading concession information:', error);
        contentEl.innerHTML = '<p class="text-error">Error loading concession information. Please try again.</p>';
    }
}

/**
 * Display concession information
 * Similar structure to showConcessionsDetail from concessions.js
 */
function displayConcessionInfo(blocks, stats, studentId) {
    const contentEl = document.getElementById('concessions-content');
    
    if (blocks.length === 0) {
        contentEl.innerHTML = '<p class="text-muted">This student has no concession blocks.</p>';
        return;
    }
    
    let html = '';
    
    // Active concessions section (accordion, expanded by default)
    if (stats.activeBlocks.length > 0) {
        html += buildTransactionConcessionSection(
            'Active Concessions',
            stats.activeCount,
            stats.activeBlocks,
            'active',
            studentId,
            true
        );
    }
    
    // Expired concessions section (accordion, collapsed by default)
    if (stats.expiredBlocks.length > 0) {
        html += buildTransactionConcessionSection(
            'Expired Concessions',
            stats.expiredCount,
            stats.expiredBlocks,
            'expired',
            studentId,
            false
        );
    }
    
    // Depleted concessions section (accordion, collapsed by default)
    if (stats.depletedBlocks.length > 0) {
        html += buildTransactionConcessionSection(
            'Depleted Concessions',
            stats.depletedBlocks.length,
            stats.depletedBlocks,
            'depleted',
            studentId,
            false
        );
    }
    
    contentEl.innerHTML = html;
    
    // Add accordion event listeners
    attachTransactionConcessionEventListeners(contentEl, studentId);
}

/**
 * Build HTML for a concession section (active, expired, or depleted)
 */
function buildTransactionConcessionSection(title, count, blocks, status, studentId, isExpanded) {
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
    
    const accordionId = `transaction-concession-accordion-${status}`;
    
    let html = `
        <div class="concessions-section">
            <h4 class="concession-accordion-header ${isExpanded ? 'active' : ''}" data-target="${accordionId}">
                <i class="fas ${icon}" style="color: ${iconColor};"></i> ${title} (${count})
                <i class="fas fa-chevron-down accordion-icon"></i>
            </h4>
            <div id="${accordionId}" class="concessions-list accordion-content ${isExpanded ? 'show' : ''}">
    `;
    
    blocks.forEach(block => {
        html += buildTransactionConcessionItem(block, status, studentId);
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
function buildTransactionConcessionItem(block, status, studentId) {
    const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
    const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
    const isLocked = block.isLocked === true;
    const hasBeenUsed = block.remainingQuantity < block.originalQuantity;
    const isGifted = block.packageId === 'gifted-concessions';
    
    const lockBadge = isLocked ? '<span class="badge badge-locked" style="margin-left: 8px;"><i class="fas fa-lock"></i> LOCKED</span>' : '';
    
    // Determine button states based on block status
    let lockButton = '';
    let deleteButton = '';
    
    if (status === 'active') {
        // Active blocks cannot be locked/unlocked
        lockButton = `<button class="btn-lock-toggle" disabled title="Cannot lock/unlock active concessions"><i class="fas fa-lock"></i> Lock</button>`;
        // Active blocks can only be deleted if no entries have been used (and only by super admin)
        deleteButton = (!isSuperAdmin() || hasBeenUsed)
            ? `<button class="btn-delete-block" disabled title="${!isSuperAdmin() ? 'Only super admin can delete' : 'Cannot delete - concession has been used'}"><i class="fas fa-trash"></i> Delete</button>`
            : `<button class="btn-delete-block" data-block-id="${block.id}" data-student-id="${studentId}" title="Delete this block"><i class="fas fa-trash"></i> Delete</button>`;
    } else {
        // Expired and depleted blocks can be locked/unlocked (only by super admin)
        if (isSuperAdmin()) {
            lockButton = isLocked 
                ? `<button class="btn-lock-toggle" data-block-id="${block.id}" data-locked="true" title="Unlock this block"><i class="fas fa-unlock"></i> Unlock</button>`
                : `<button class="btn-lock-toggle" data-block-id="${block.id}" data-locked="false" title="Lock this block"><i class="fas fa-lock"></i> Lock</button>`;
        }
        
        // Expired/depleted blocks can only be deleted if no entries have been used (and only by super admin)
        deleteButton = (!isSuperAdmin() || hasBeenUsed)
            ? `<button class="btn-delete-block" disabled title="${!isSuperAdmin() ? 'Only super admin can delete' : 'Cannot delete - concession has been used'}"><i class="fas fa-trash"></i> Delete</button>`
            : `<button class="btn-delete-block" data-block-id="${block.id}" data-student-id="${studentId}" title="Delete this block"><i class="fas fa-trash"></i> Delete</button>`;
    }
    
    // Set labels and icons based on status
    let expiryLabel, expiryIcon, entriesLabel, statusClass;
    
    switch (status) {
        case 'expired':
            expiryLabel = 'Expired';
            expiryIcon = 'fa-calendar-times';
            entriesLabel = 'classes unused';
            statusClass = 'expired';
            break;
        case 'depleted':
            expiryLabel = 'Expired';
            expiryIcon = 'fa-calendar-alt';
            entriesLabel = 'classes (all used)';
            statusClass = 'depleted';
            break;
        case 'active':
        default:
            expiryLabel = 'Expires';
            expiryIcon = 'fa-calendar-alt';
            entriesLabel = 'classes remaining';
            statusClass = '';
    }
    
    // Get existing notes for expired/depleted items
    const existingNotes = block.lockNotes || '';
    const showNotes = status === 'expired' || status === 'depleted';
    
    let html = `
        <div class="concession-item ${statusClass} ${isLocked ? 'locked' : ''} ${isGifted ? 'gifted' : ''}">
            <div class="concession-content">
                <div class="concession-left">
                    <div class="concession-info">
                        <strong>${block.remainingQuantity || 0} of ${block.initialQuantity || block.originalQuantity || 0} ${entriesLabel}</strong>
                        ${lockBadge}
                    </div>
                    <div class="concession-details">
                        <span><i class="fas ${expiryIcon}"></i> ${expiryLabel}: ${formatDate(expiryDate)}</span>
                        <span><i class="fas fa-shopping-cart"></i> ${isGifted ? 'Gifted' : 'Purchased'}: ${formatDate(purchaseDate)}</span>
                        <span><i class="fas fa-dollar-sign"></i> Paid: $${(block.price || 0).toFixed(2)}</span>
                    </div>
                </div>
    `;
    
    if (showNotes) {
        html += `
                <div class="concession-notes">
                    <label for="notes-${block.id}">Notes:</label>
                    <textarea 
                        id="notes-${block.id}" 
                        class="concession-notes-input" 
                        data-block-id="${block.id}"
                        placeholder="Add notes about why this concession is locked/unlocked..."
                        rows="4"
                    >${existingNotes}</textarea>
                    <span class="notes-save-status" id="notes-status-${block.id}"></span>
                </div>
        `;
    }
    
    html += `
            </div>
            <div class="concession-actions">
                <div class="concession-actions-left">
                    ${lockButton}
                    ${deleteButton}
                </div>
                ${isGifted ? '<div class="concession-actions-right"><span class="badge badge-gifted"><i class="fas fa-gift"></i> Gifted Concession</span></div>' : ''}
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Attach event listeners for transaction concession elements
 */
function attachTransactionConcessionEventListeners(contentEl, studentId) {
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
                    if (typeof showSnackbar === 'function') {
                        showSnackbar('Concession block unlocked', 'success');
                    }
                } else {
                    await lockConcessionBlock(blockId);
                    if (typeof showSnackbar === 'function') {
                        showSnackbar('Concession block locked', 'success');
                    }
                }
                
                // Reload the concessions tab
                await loadTransactionHistoryConcessions(studentId);
            } catch (error) {
                console.error('Error toggling lock:', error);
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Failed to toggle lock: ' + error.message, 'error');
                }
            }
        });
    });
    
    // Delete buttons
    contentEl.querySelectorAll('.btn-delete-block').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const blockId = btn.dataset.blockId;
            const deleteStudentId = btn.dataset.studentId;
            
            // Show the delete modal
            const modal = document.getElementById('delete-modal');
            const titleEl = document.getElementById('delete-modal-title');
            const messageEl = document.getElementById('delete-modal-message');
            const infoEl = document.getElementById('delete-modal-info');
            const btnTextEl = document.getElementById('delete-modal-btn-text');
            const confirmBtn = document.getElementById('confirm-delete-btn');
            
            // Customize modal for concession block deletion
            titleEl.textContent = 'Delete Concession';
            messageEl.textContent = 'Are you sure you want to delete this concession block?';
            infoEl.innerHTML = ''; // Clear any student info
            infoEl.style.display = 'none'; // Hide the empty info box
            btnTextEl.textContent = 'Delete Block';
            
            // Remove any existing event listeners by replacing the button
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            // Add click handler for confirm button
            newConfirmBtn.addEventListener('click', async () => {
                try {
                    await deleteConcessionBlock(blockId);
                    closeDeleteModal();
                    if (typeof showSnackbar === 'function') {
                        showSnackbar('Concession block deleted successfully', 'success');
                    }
                    // Small delay to ensure Firestore propagates the delete
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Reload the concessions tab
                    await loadTransactionHistoryConcessions(deleteStudentId);
                } catch (error) {
                    console.error('Error deleting block:', error);
                    closeDeleteModal();
                    if (typeof showSnackbar === 'function') {
                        showSnackbar('Error deleting block: ' + error.message, 'error');
                    }
                }
            });
            
            modal.style.display = 'flex';
        });
    });
    
    // Notes textareas with debouncing
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
}
