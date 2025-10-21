/**
 * concession-blocks-lock.js - Locking and unlocking concession blocks
 */

/**
 * Lock a concession block (prevent use even if it has remaining quantity)
 * @param {string} blockId - Block document ID
 * @returns {Promise<boolean>} - Success status
 */
async function lockConcessionBlock(blockId) {
    try {
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .update({ 
                isLocked: true,
                lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
                unlockedAt: null,
                unlockedBy: null
            });
        return true;
    } catch (error) {
        console.error('Error locking concession block:', error);
        return false;
    }
}

/**
 * Unlock a concession block (allow use again)
 * @param {string} blockId - Block document ID
 * @returns {Promise<boolean>} - Success status
 */
async function unlockConcessionBlock(blockId) {
    try {
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .update({ 
                isLocked: false,
                unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                unlockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
                lockedAt: null,
                lockedBy: null
            });
        return true;
    } catch (error) {
        console.error('Error unlocking concession block:', error);
        return false;
    }
}

/**
 * Lock all expired concession blocks for a student
 * @param {string} studentId - Student document ID
 * @returns {Promise<number>} - Number of blocks locked
 */
async function lockAllExpiredBlocks(studentId) {
    try {
        const now = new Date();
        const snapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('isLocked', '==', false)
            .get();
        
        const batch = firebase.firestore().batch();
        let lockedCount = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const expiryDate = data.expiryDate ? data.expiryDate.toDate() : null;
            const isExpired = expiryDate && expiryDate < now;
            
            if (isExpired) {
                batch.update(doc.ref, { 
                    isLocked: true,
                    lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown'
                });
                lockedCount++;
            }
        });
        
        if (lockedCount > 0) {
            await batch.commit();
        }
        
        return lockedCount;
    } catch (error) {
        console.error('Error locking expired blocks:', error);
        throw error;
    }
}
