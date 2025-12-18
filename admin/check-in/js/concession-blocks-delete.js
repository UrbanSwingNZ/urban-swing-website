/**
 * concession-blocks-delete.js - Deleting concession blocks
 */

/**
 * Delete a concession block (only if unlocked)
 * @param {string} blockId - Block document ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteConcessionBlock(blockId) {
    try {
        // First check if the block is locked
        const blockDoc = await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .get();
        
        if (!blockDoc.exists) {
            throw new Error('Concession block not found');
        }
        
        const blockData = blockDoc.data();
        if (blockData.isLocked === true) {
            throw new Error('Cannot delete a locked concession block. Unlock it first.');
        }
        
        // Get student ID and transaction ID before deleting
        const studentId = blockData.studentId;
        const transactionId = blockData.transactionId;
        const packageId = blockData.packageId;
        
        // If this is a gifted concession, delete the transaction instead of reversing it
        if (transactionId && packageId === 'gifted-concessions') {
            try {
                await firebase.firestore()
                    .collection('transactions')
                    .doc(transactionId)
                    .delete();
                console.log(`Deleted associated gift transaction: ${transactionId}`);
            } catch (transactionError) {
                console.warn('Could not delete associated transaction:', transactionError);
                // Continue with block deletion even if transaction deletion fails
            }
        } else if (transactionId) {
            // For non-gifted blocks, mark transaction as reversed
            try {
                await firebase.firestore()
                    .collection('transactions')
                    .doc(transactionId)
                    .update({
                        reversed: true,
                        reversedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                console.log(`Reversed associated transaction: ${transactionId}`);
            } catch (transactionError) {
                console.warn('Could not reverse associated transaction:', transactionError);
                // Continue with block deletion even if transaction reversal fails
            }
        }
        
        // Delete the block
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .delete();
        
        // Update student's balance
        await updateStudentBalance(studentId);
        
        return true;
    } catch (error) {
        console.error('Error deleting concession block:', error);
        throw error;
    }
}
