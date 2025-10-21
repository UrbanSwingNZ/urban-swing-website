/**
 * Concessions Display Module
 * Handles displaying concession counts and details for students
 */

/**
 * Get concession blocks for a student
 * Queries by student document ID
 */
async function getStudentConcessionBlocks(studentId) {
    try {
        const blocksSnapshot = await db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .get();
        
        const blocks = [];
        blocksSnapshot.forEach(doc => {
            blocks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return blocks;
    } catch (error) {
        console.error('Error fetching concession blocks for student:', studentId, error);
        // Return empty array on error instead of throwing
        return [];
    }
}

/**
 * Calculate concession statistics for a student
 */
function calculateConcessionStats(blocks) {
    const now = new Date();
    let unexpiredCount = 0;
    let expiredCount = 0;
    const unexpiredBlocks = [];
    const expiredBlocks = [];
    
    blocks.forEach(block => {
        const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
        const isExpired = expiryDate < now;
        
        // Use remainingQuantity (the actual field name in Firestore)
        const remaining = block.remainingQuantity || 0;
        
        if (isExpired) {
            expiredCount += remaining;
            expiredBlocks.push(block);
        } else {
            unexpiredCount += remaining;
            unexpiredBlocks.push(block);
        }
    });
    
    return {
        unexpiredCount,
        expiredCount,
        totalCount: unexpiredCount + expiredCount,
        unexpiredBlocks,
        expiredBlocks
    };
}

/**
 * Get badge HTML for concession count
 */
function getConcessionBadgeHTML(stats) {
    if (stats.totalCount === 0) {
        return '<button class="btn-purchase-mini" style="font-size: 0.75rem; padding: 4px 10px;">Purchase</button>';
    }
    
    let badgeClass = '';
    let badgeText = '';
    
    if (stats.unexpiredCount > 0 && stats.expiredCount === 0) {
        // Only unexpired - green badge
        badgeClass = 'badge-yes';
        badgeText = stats.unexpiredCount;
    } else if (stats.expiredCount > 0 && stats.unexpiredCount === 0) {
        // Only expired - red badge
        badgeClass = 'badge-no';
        badgeText = stats.expiredCount;
    } else if (stats.unexpiredCount > 0 && stats.expiredCount > 0) {
        // Both - orange badge
        badgeClass = 'badge-warning';
        badgeText = stats.totalCount;
    }
    
    return `<span class="badge ${badgeClass} concession-badge" style="cursor: pointer;">${badgeText}</span>`;
}

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
    
    if (stats.totalCount === 0) {
        html = '<p class="text-muted">This student has no concession blocks.</p>';
    } else {
        // Unexpired concessions section
        if (stats.unexpiredCount > 0) {
            html += `
                <div class="concessions-section">
                    <h4><i class="fas fa-check-circle" style="color: var(--admin-success);"></i> Active Concessions (${stats.unexpiredCount})</h4>
                    <div class="concessions-list">
            `;
            
            stats.unexpiredBlocks.forEach(block => {
                const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
                const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
                
                html += `
                    <div class="concession-item">
                        <div class="concession-info">
                            <strong>${block.remainingQuantity} entries remaining</strong>
                            <span class="text-muted">of ${block.originalQuantity} total</span>
                        </div>
                        <div class="concession-details">
                            <span><i class="fas fa-calendar-alt"></i> Expires: ${formatDate(expiryDate)}</span>
                            <span><i class="fas fa-shopping-cart"></i> Purchased: ${formatDate(purchaseDate)}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Expired concessions section
        if (stats.expiredCount > 0) {
            html += `
                <div class="concessions-section">
                    <h4><i class="fas fa-exclamation-circle" style="color: var(--admin-error);"></i> Expired Concessions (${stats.expiredCount})</h4>
                    <div class="concessions-list">
            `;
            
            stats.expiredBlocks.forEach(block => {
                const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
                const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
                
                html += `
                    <div class="concession-item expired">
                        <div class="concession-info">
                            <strong>${block.remainingQuantity} entries unused</strong>
                            <span class="text-muted">of ${block.originalQuantity} total</span>
                        </div>
                        <div class="concession-details">
                            <span><i class="fas fa-calendar-times"></i> Expired: ${formatDate(expiryDate)}</span>
                            <span><i class="fas fa-shopping-cart"></i> Purchased: ${formatDate(purchaseDate)}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
    }
    
    contentEl.innerHTML = html;
}

/**
 * Close concessions detail modal
 */
function closeConcessionsDetailModal() {
    const modal = document.getElementById('concessions-detail-modal');
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

/**
 * Format date for display
 */
function formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-NZ', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}
