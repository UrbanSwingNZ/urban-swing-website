/**
 * concession-blocks-usage.js - Using and restoring concession block entries
 */

/**
 * Check if student has exactly 1 active concession remaining and trigger low balance email
 * @param {string} studentId - Student document ID
 */
async function checkAndSendLowBalanceEmail(studentId) {
    try {
        // Query active concession blocks
        const blocksSnapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('status', '==', 'active')
            .where('remainingQuantity', '>', 0)
            .get();

        // Calculate total active balance
        let totalBalance = 0;
        blocksSnapshot.forEach(doc => {
            totalBalance += doc.data().remainingQuantity;
        });

        console.log(`Student ${studentId} active balance: ${totalBalance}`);

        // If balance is exactly 1, trigger the email
        if (totalBalance === 1) {
            console.log('Balance is 1, triggering low balance email');
            
            // Call the Cloud Function
            const sendLowBalanceEmail = firebase.functions().httpsCallable('sendLowBalanceEmail');
            const result = await sendLowBalanceEmail({ studentId });
            
            console.log('Low balance email result:', result.data);
        }
    } catch (error) {
        console.error('Error checking/sending low balance email:', error);
        // Don't throw - this is a non-critical operation that shouldn't block check-in
    }
}

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
        
        // Check if we need to send low balance email (after balance is updated)
        await checkAndSendLowBalanceEmail(blockData.studentId);
        
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
