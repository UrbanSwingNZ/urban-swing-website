/**
 * Concessions Display Module
 * Handles displaying concession badges in the table
 */

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
 * Update concession badge in table for a specific student
 */
async function updateStudentConcessionBadge(studentId) {
    try {
        // Fetch fresh concession data
        const blocks = await getStudentConcessionBlocks(studentId);
        const stats = calculateConcessionStats(blocks);
        
        // Find the table cell for this student
        const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
        if (!row) {
            console.warn('Student row not found in table');
            return;
        }
        
        const concessionsCell = row.querySelector('.concessions-cell');
        if (!concessionsCell) {
            console.warn('Concessions cell not found in row');
            return;
        }
        
        // Update the badge HTML
        concessionsCell.innerHTML = getConcessionBadgeHTML(stats);
        
        // Re-attach click handler for the new badge/button
        const badge = concessionsCell.querySelector('.concession-badge, .btn-purchase-mini');
        if (badge) {
            badge.addEventListener('click', () => {
                showConcessionsDetail(studentId);
            });
        }
    } catch (error) {
        console.error('Error updating concession badge:', error);
    }
}
