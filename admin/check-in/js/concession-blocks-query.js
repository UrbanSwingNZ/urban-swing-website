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
        
        const now = new Date();
        
        // Filter and sort in JavaScript to avoid complex Firestore indexes
        const blocks = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(block => {
                // Only blocks with remaining quantity
                if (block.remainingQuantity <= 0) return false;
                
                // Exclude locked blocks (always)
                if (block.isLocked === true) return false;
                
                // Check if block is expired
                const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
                const isExpired = expiryDate < now;
                
                // If allowExpired is true, include both active and expired (but not locked)
                // If allowExpired is false, only include active blocks
                if (!allowExpired) {
                    return !isExpired;
                } else {
                    return true; // Include both active and expired (locked already filtered out)
                }
            })
            .sort((a, b) => {
                // FIFO - sort by purchaseDate only (oldest first)
                // This ensures we use the oldest block first, regardless of expiry status
                const aDate = a.purchaseDate?.toMillis ? a.purchaseDate.toMillis() : 0;
                const bDate = b.purchaseDate?.toMillis ? b.purchaseDate.toMillis() : 0;
                return aDate - bDate;
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
