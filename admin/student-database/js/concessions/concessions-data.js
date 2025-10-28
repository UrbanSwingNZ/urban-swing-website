/**
 * Concessions Data Module
 * Handles fetching and calculating concession statistics
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
            const data = doc.data();
            blocks.push({
                id: doc.id,
                ...data
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
    let activeCount = 0;
    let expiredCount = 0;
    let depletedCount = 0;
    const activeBlocks = [];
    const expiredBlocks = [];
    const depletedBlocks = [];
    
    blocks.forEach(block => {
        const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
        const isPastExpiry = expiryDate < now;
        // Treat undefined as false (unlocked) - for backwards compatibility with old blocks
        const isLocked = block.isLocked === true;
        
        // Use remainingQuantity (the actual field name in Firestore)
        const remaining = block.remainingQuantity || 0;
        
        // Categorize blocks:
        // 1. Depleted (balance = 0) - regardless of expiry date
        // 2. Expired (past expiry AND balance > 0)
        // 3. Active (not expired AND balance > 0)
        
        if (remaining === 0) {
            // Depleted blocks (no remaining entries)
            depletedBlocks.push(block);
            if (!isLocked) {
                depletedCount += remaining; // Will be 0, but kept for consistency
            }
        } else if (isPastExpiry) {
            // Expired blocks (past expiry date but still have balance)
            expiredBlocks.push(block);
            if (!isLocked) {
                expiredCount += remaining;
            }
        } else {
            // Active blocks (not expired and have balance)
            activeBlocks.push(block);
            if (!isLocked) {
                activeCount += remaining;
            }
        }
    });
    
    // Sort blocks by expiry date (most recent expiry date at the top)
    const sortByExpiryDate = (a, b) => {
        const dateA = a.expiryDate?.toDate ? a.expiryDate.toDate() : new Date(a.expiryDate);
        const dateB = b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
        return dateB - dateA; // Descending order (most recent first)
    };
    
    activeBlocks.sort(sortByExpiryDate);
    expiredBlocks.sort(sortByExpiryDate);
    depletedBlocks.sort(sortByExpiryDate);
    
    return {
        activeCount,
        expiredCount,
        depletedCount,
        totalCount: activeCount + expiredCount, // Don't count depleted in total
        activeBlocks,
        expiredBlocks,
        depletedBlocks,
        // Keep old property names for backward compatibility
        unexpiredCount: activeCount,
        unexpiredBlocks: activeBlocks
    };
}
