/**
 * concession-blocks-query.js - Querying and retrieving concession blocks
 */

/**
 * Get the next available concession block for a student (FIFO)
 * @param {string} studentId - Student document ID
 * @param {boolean} allowExpired - Whether to include expired blocks
 * @returns {Promise<object|null>} - Block data with ID, or null if none available
 */
async function getNextAvailableBlock(studentId, allowExpired = false) {
    try {
        // Simple query - just filter by studentId to avoid index requirements
        let query = firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId);
        
        // Get all blocks for this student
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            return null;
        }
        
        // Filter and sort in JavaScript to avoid complex Firestore indexes
        const blocks = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(block => {
                // Only blocks with remaining quantity
                if (block.remainingQuantity <= 0) return false;
                
                // Exclude locked blocks
                if (block.isLocked === true) return false;
                
                // Filter by status based on allowExpired flag
                if (!allowExpired) {
                    return block.status === 'active';
                } else {
                    return block.status === 'active' || block.status === 'expired';
                }
            })
            .sort((a, b) => {
                // Active blocks before expired blocks
                if (a.status !== b.status) {
                    return a.status === 'active' ? -1 : 1;
                }
                // Then sort by purchaseDate (oldest first - FIFO)
                return a.purchaseDate.toMillis() - b.purchaseDate.toMillis();
            });
        
        return blocks.length > 0 ? blocks[0] : null;
    } catch (error) {
        console.error('Error getting next available block:', error);
        return null;
    }
}

/**
 * Get all concession blocks for a student
 * @param {string} studentId - Student document ID
 * @returns {Promise<Array>} - Array of blocks with IDs
 */
async function getStudentBlocks(studentId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .orderBy('purchaseDate', 'desc')
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting student blocks:', error);
        return [];
    }
}
