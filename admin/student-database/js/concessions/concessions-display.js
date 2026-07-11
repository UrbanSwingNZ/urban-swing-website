/**
 * Concessions Display Module
 * Handles displaying concession badges in the table
 */

/**
 * Get badge HTML for concession count
 * @param {Object} stats - Concession statistics
 * @param {boolean} hasActiveMembership - Whether student has an active membership
 */
function getConcessionBadgeHTML(stats, hasActiveMembership = false) {
    // Show purchase button if no active or expired concessions (only depleted or nothing)
    if (stats.totalCount === 0) {
        if (hasActiveMembership) {
            return '<button class="btn-primary btn-primary-sm" disabled title="Concessions not needed with active membership">Purchase</button>';
        }
        return '<button class="btn-primary btn-primary-sm">Purchase</button>';
    }
    
    let badgeClass = '';
    let badgeText = '';
    
    // Use activeCount and expiredCount (totalCount excludes depleted)
    if (stats.activeCount > 0 && stats.expiredCount === 0) {
        // Only active - green badge
        badgeClass = 'badge-yes';
        badgeText = stats.activeCount;
    } else if (stats.expiredCount > 0 && stats.activeCount === 0) {
        // Only expired - red badge
        badgeClass = 'badge-no';
        badgeText = stats.expiredCount;
    } else if (stats.activeCount > 0 && stats.expiredCount > 0) {
        // Both active and expired - orange badge
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
        
        // Check if student has active membership
        const student = findStudentById(studentId);
        const hasActiveMembership = student && student.activeMembershipId && student.membershipExpiryDate;
        
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
        concessionsCell.innerHTML = getConcessionBadgeHTML(stats, hasActiveMembership);
        
        // Re-attach click handler for the new badge/button
        const badge = concessionsCell.querySelector('.concession-badge, .btn-primary-sm');
        if (badge && !badge.disabled) {
            badge.addEventListener('click', () => {
                showConcessionsDetail(studentId);
            });
        }
    } catch (error) {
        console.error('Error updating concession badge:', error);
    }
}
