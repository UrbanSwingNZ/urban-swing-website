/**
 * concession-blocks-usage.js - Using and restoring concession block entries
 */

/**
 * Use one entry from a concession block
 * @param {string} blockId - Block document ID
 * @returns {Promise<boolean>} - Success status
 */
async function useBlockEntry(blockId) {
    try {
        const blockRef = firebase.firestore().collection('concessionBlocks').doc(blockId);
        const blockDoc = await blockRef.get();
        
        if (!blockDoc.exists) {
            throw new Error('Block not found');
        }
        
        const blockData = blockDoc.data();
        const newRemaining = blockData.remainingQuantity - 1;
        
        const updates = {
            remainingQuantity: newRemaining
        };
        
        // If depleted, update status
        if (newRemaining === 0) {
            updates.status = 'depleted';
        }
        
        await blockRef.update(updates);
        
        // Update student balance
        await updateStudentBalance(blockData.studentId);
        
        return true;
    } catch (error) {
        console.error('Error using block entry:', error);
        throw error;
    }
}

/**
 * Restore one entry to a concession block (e.g., when deleting/updating a check-in)
 * @param {string} blockId - Block document ID
 * @returns {Promise<boolean>} - Success status
 */
async function restoreBlockEntry(blockId) {
    try {
        const blockRef = firebase.firestore().collection('concessionBlocks').doc(blockId);
        const blockDoc = await blockRef.get();
        
        if (!blockDoc.exists) {
            throw new Error('Block not found');
        }
        
        const blockData = blockDoc.data();
        const newRemaining = blockData.remainingQuantity + 1;
        
        const updates = {
            remainingQuantity: newRemaining
        };
        
        // If was depleted, restore to previous status (active or expired)
        if (blockData.status === 'depleted') {
            // Check if expired
            const now = new Date();
            const expiryDate = blockData.expiryDate ? blockData.expiryDate.toDate() : null;
            updates.status = (expiryDate && expiryDate < now) ? 'expired' : 'active';
        }
        
        await blockRef.update(updates);
        
        // Update student balance
        await updateStudentBalance(blockData.studentId);
        
        return true;
    } catch (error) {
        console.error('Error restoring block entry:', error);
        throw error;
    }
}
