/**
 * concessions.js - Concession management module
 * Handles concession balance and expiry logic (UI only - no backend yet)
 */

/**
 * Get mock concession data for a student
 * TODO: Replace with real Firestore query when backend is implemented
 */
function getMockConcessionData(studentId) {
    // Mock data for UI demonstration
    return {
        balance: 8,
        blocks: [
            {
                remaining: 2,
                expiryDate: new Date('2025-12-15'),
                expired: false
            },
            {
                remaining: 6,
                expiryDate: new Date('2026-03-20'),
                expired: false
            }
        ]
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
        ${block.remaining} ${block.remaining === 1 ? 'concession' : 'concessions'} 
        ${expired ? 'expired' : 'expires'} ${dateStr}
    </div>`;
}
