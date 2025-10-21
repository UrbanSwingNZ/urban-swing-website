/**
 * concession-blocks-balance.js - Student balance calculations and updates
 */

/**
 * Update student's concession balance fields
 * Recalculates from all blocks with remainingQuantity > 0
 * @param {string} studentId - Student document ID
 */
async function updateStudentBalance(studentId) {
    try {
        const snapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('remainingQuantity', '>', 0)
            .get();
        
        let totalBalance = 0;
        let expiredBalance = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalBalance += data.remainingQuantity;
            if (data.status === 'expired') {
                expiredBalance += data.remainingQuantity;
            }
        });
        
        await firebase.firestore()
            .collection('students')
            .doc(studentId)
            .update({
                concessionBalance: totalBalance,
                expiredConcessions: expiredBalance
            });
        
    } catch (error) {
        console.error('Error updating student balance:', error);
        throw error;
    }
}
