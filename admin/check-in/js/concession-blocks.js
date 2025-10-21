/**
 * concession-blocks.js - Concession block management
 * Handles creating, updating, and querying concession blocks
 */

/**
 * Create a new concession block for a student
 * @param {string} studentId - Student document ID
 * @param {object} packageData - Package information
 * @param {number} quantity - Number of entries
 * @param {number} price - Amount paid
 * @param {string} paymentMethod - Payment method
 * @param {Date} expiryDate - Expiry date (nullable)
 * @param {string} notes - Optional notes
 * @param {Date} purchaseDate - Optional purchase date (defaults to now)
 * @returns {Promise<string>} - Document ID of created block
 */
async function createConcessionBlock(studentId, packageData, quantity, price, paymentMethod, expiryDate, notes = '', purchaseDate = null) {
    try {
        const student = findStudentById(studentId);
        if (!student) {
            throw new Error('Student not found');
        }
        
        // Format purchase date for document ID (YYYY-MM-DD)
        const dateForId = purchaseDate ? purchaseDate : new Date();
        const dateStr = dateForId.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Create document ID: firstName-lastName-purchased-YYYY-MM-DD (lowercase)
        const firstName = (student.firstName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const lastName = (student.lastName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const docId = `${firstName}-${lastName}-purchased-${dateStr}`;
        
        const blockData = {
            studentId: studentId,
            studentName: getStudentFullName(student),
            packageId: packageData.id,
            packageName: packageData.name,
            originalQuantity: quantity,
            remainingQuantity: quantity,
            purchaseDate: purchaseDate ? firebase.firestore.Timestamp.fromDate(purchaseDate) : firebase.firestore.FieldValue.serverTimestamp(),
            expiryDate: expiryDate ? firebase.firestore.Timestamp.fromDate(expiryDate) : null,
            status: 'active',
            price: price,
            paymentMethod: paymentMethod,
            transactionId: null, // TODO: Link to transaction when implemented
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
            notes: notes
        };
        
        // Use set() with custom document ID instead of add()
        const docRef = firebase.firestore()
            .collection('concessionBlocks')
            .doc(docId);
        
        await docRef.set(blockData);
        
        console.log('Concession block created:', docRef.id);
        
        // Update student balance
        await updateStudentBalance(studentId);
        
        return docRef.id;
    } catch (error) {
        console.error('Error creating concession block:', error);
        throw error;
    }
}

/**
 * Get the next available concession block for a student (FIFO)
 * @param {string} studentId - Student document ID
 * @param {boolean} allowExpired - Whether to include expired blocks
 * @returns {Promise<object|null>} - Block data with ID, or null if none available
 */
async function getNextAvailableBlock(studentId, allowExpired = false) {
    try {
        let query = firebase.firestore()
            .collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .where('remainingQuantity', '>', 0);
        
        if (!allowExpired) {
            query = query.where('status', '==', 'active');
        } else {
            query = query.where('status', 'in', ['active', 'expired']);
        }
        
        // Order by status (active first), then purchaseDate (oldest first - FIFO)
        query = query.orderBy('status', 'asc').orderBy('purchaseDate', 'asc');
        
        const snapshot = await query.limit(1).get();
        
        if (snapshot.empty) {
            return null;
        }
        
        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('Error getting next available block:', error);
        return null;
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
        
        return true;
    } catch (error) {
        console.error('Error using block entry:', error);
        throw error;
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
        
        console.log(`Updated balance for student ${studentId}: ${totalBalance} (${expiredBalance} expired)`);
    } catch (error) {
        console.error('Error updating student balance:', error);
        throw error;
    }
}

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
        
        console.log(`Marked ${snapshot.size} blocks as expired`);
        
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
