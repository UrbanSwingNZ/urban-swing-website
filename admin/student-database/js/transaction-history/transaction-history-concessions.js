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
    
    // Summary section
    html += `
        <div class="concession-summary">
            <div class="summary-stat">
                <div class="stat-value">${stats.totalBalance}</div>
                <div class="stat-label">Total Balance</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value ${stats.unexpiredCount > 0 ? 'text-success' : ''}">${stats.unexpiredCount}</div>
                <div class="stat-label">Active Classes</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value ${stats.expiredBalance > 0 ? 'text-warning' : ''}">${stats.expiredBalance}</div>
                <div class="stat-label">Expired Classes</div>
            </div>
        </div>
    `;
    
    // Active concessions section
    if (stats.unexpiredBlocks.length > 0) {
        html += `
            <div class="concessions-section">
                <h4><i class="fas fa-check-circle" style="color: var(--admin-success);"></i> Active Concessions (${stats.unexpiredCount} classes)</h4>
                <div class="concessions-list">
        `;
        
        stats.unexpiredBlocks.forEach(block => {
            const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
            const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
            
            html += `
                <div class="concession-item">
                    <div class="concession-info">
                        <strong>${block.remainingQuantity} of ${block.originalQuantity} classes remaining</strong>
                    </div>
                    <div class="concession-details">
                        <span><i class="fas fa-calendar-alt"></i> Expires: ${formatDate(expiryDate)}</span>
                        <span><i class="fas fa-shopping-cart"></i> Purchased: ${formatDate(purchaseDate)}</span>
                        <span><i class="fas fa-dollar-sign"></i> Paid: $${(block.price || 0).toFixed(2)}</span>
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
    if (stats.expiredBlocks.length > 0) {
        html += `
            <div class="concessions-section">
                <h4><i class="fas fa-exclamation-circle" style="color: var(--admin-error);"></i> Expired Concessions (${stats.expiredBalance} unused)</h4>
                <div class="concessions-list">
        `;
        
        stats.expiredBlocks.forEach(block => {
            const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
            const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
            
            html += `
                <div class="concession-item expired">
                    <div class="concession-info">
                        <strong>${block.remainingQuantity} of ${block.originalQuantity} classes unused</strong>
                    </div>
                    <div class="concession-details">
                        <span><i class="fas fa-calendar-times"></i> Expired: ${formatDate(expiryDate)}</span>
                        <span><i class="fas fa-shopping-cart"></i> Purchased: ${formatDate(purchaseDate)}</span>
                        <span><i class="fas fa-dollar-sign"></i> Paid: $${(block.price || 0).toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    contentEl.innerHTML = html;
}
