/**
 * concession-blocks-lock.js - Locking and unlocking concession blocks
 */

/**
 * Lock a concession block (prevent use even if it has remaining quantity)
 * @param {string} blockId - Block document ID
 * @param {string} notes - Optional notes about why the block is being locked
 * @returns {Promise<boolean>} - Success status
 */
async function lockConcessionBlock(blockId, notes = null) {
    try {
        const updateData = { 
            isLocked: true,
            lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
            unlockedAt: null,
            unlockedBy: null
        };
        
        // Only update lockNotes if notes are provided (don't clear existing notes)
        if (notes !== null) {
            updateData.lockNotes = notes;
        }
        
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .update(updateData);
        return true;
    } catch (error) {
        console.error('Error locking concession block:', error);
        return false;
    }
}

/**
 * Unlock a concession block (allow use again)
 * @param {string} blockId - Block document ID
 * @param {string} notes - Optional notes about why the block is being unlocked
 * @returns {Promise<boolean>} - Success status
 */
async function unlockConcessionBlock(blockId, notes = null) {
    try {
        const updateData = { 
            isLocked: false,
            unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            unlockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
            lockedAt: null,
            lockedBy: null
        };
        
        // Only update lockNotes if notes are provided (don't clear existing notes)
        if (notes !== null) {
            updateData.lockNotes = notes;
        }
        
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .update(updateData);
        return true;
    } catch (error) {
        console.error('Error unlocking concession block:', error);
        return false;
    }
}

/**
 * Update the lock notes for a concession block without changing lock state
 * @param {string} blockId - Block document ID
 * @param {string} notes - Notes to save (empty string to clear notes)
 * @returns {Promise<boolean>} - Success status
 */
async function updateConcessionBlockNotes(blockId, notes) {
    try {
        await firebase.firestore()
            .collection('concessionBlocks')
            .doc(blockId)
            .update({ 
                lockNotes: notes || '',
                notesUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                notesUpdatedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown'
            });
        return true;
    } catch (error) {
        console.error('Error updating concession block notes:', error);
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
