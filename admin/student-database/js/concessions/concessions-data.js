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
    let unexpiredCount = 0;
    let expiredCount = 0;
    const unexpiredBlocks = [];
    const expiredBlocks = [];
    
    blocks.forEach(block => {
        const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
        const isExpired = expiryDate < now;
        // Treat undefined as false (unlocked) - for backwards compatibility with old blocks
        const isLocked = block.isLocked === true;
        
        // Use remainingQuantity (the actual field name in Firestore)
        const remaining = block.remainingQuantity || 0;
        
        if (isExpired) {
            // Always add to expiredBlocks array (for display)
            expiredBlocks.push(block);
            // Only add to count if not locked
            if (!isLocked) {
                expiredCount += remaining;
            }
        } else {
            // Always add to unexpiredBlocks array (for display)
            unexpiredBlocks.push(block);
            // Only add to count if not locked
            if (!isLocked) {
                unexpiredCount += remaining;
            }
        }
    });
    
    // Sort blocks by expiry date (most recent expiry date at the top)
    const sortByExpiryDate = (a, b) => {
        const dateA = a.expiryDate?.toDate ? a.expiryDate.toDate() : new Date(a.expiryDate);
        const dateB = b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
        return dateB - dateA; // Descending order (most recent first)
    };
    
    unexpiredBlocks.sort(sortByExpiryDate);
    expiredBlocks.sort(sortByExpiryDate);
    
    return {
        unexpiredCount,
        expiredCount,
        totalCount: unexpiredCount + expiredCount,
        unexpiredBlocks,
        expiredBlocks
    };
}
