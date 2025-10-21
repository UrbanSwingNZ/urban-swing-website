/**
 * concession-blocks-maintenance.js - Background maintenance tasks
 */

/**
 * Mark expired blocks
 * Should be run periodically (e.g., daily background job)
 */
async function markExpiredBlocks() {
    try {
        const now = firebase.firestore.Timestamp.now();
        
        const snapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('status', '==', 'active')
            .where('expiryDate', '<=', now)
            .get();
        
        const batch = firebase.firestore().batch();
        const affectedStudents = new Set();
        
        snapshot.forEach(doc => {
            batch.update(doc.ref, { status: 'expired' });
            affectedStudents.add(doc.data().studentId);
        });
        
        await batch.commit();
        
        // Update affected students' balances
        for (const studentId of affectedStudents) {
            await updateStudentBalance(studentId);
        }
        
        return snapshot.size;
    } catch (error) {
        console.error('Error marking expired blocks:', error);
        throw error;
    }
}
