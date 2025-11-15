/**
 * concessions.js - Concession management module
 * Handles concession balance and expiry logic (UI only - no backend yet)
 */

/**
 * Get concession data for a student from their student object
 * TODO: Query Firestore concessionBlocks collection when backend is implemented
 */
function getMockConcessionData(studentId) {
    // Return empty data - will be populated from Firestore in future
    return {
        balance: 0,
        blocks: []
    };
}

/**
 * Check if concession block is expired
 */
function isExpired(expiryDate) {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    return expiry < now;
}

/**
 * Format concession block for display
 */
function formatConcessionBlock(block) {
    const expiryDate = block.expiryDate instanceof Date ? 
        block.expiryDate : new Date(block.expiryDate);
    const dateStr = expiryDate.toLocaleDateString('en-NZ', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    
    const expired = isExpired(expiryDate);
    const icon = expired ? 'fa-exclamation-triangle' : 'fa-clock';
    const expiredClass = expired ? ' expired' : '';
    
    return `<div class="concession-block${expiredClass}">
        <i class="fas ${icon}"></i>
        ${block.remainingQuantity || block.remaining || 0} ${(block.remainingQuantity || block.remaining || 0) === 1 ? 'concession' : 'concessions'} 
        ${expired ? 'expired' : 'expires'} ${dateStr}
    </div>`;
}
