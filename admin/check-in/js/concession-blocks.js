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
        // Check if findStudentById is available
        if (typeof findStudentById !== 'function') {
            throw new Error('findStudentById function is not available');
        }
        
        const student = findStudentById(studentId);
        if (!student) {
            throw new Error('Student not found with ID: ' + studentId);
        }
        
        // Check if getStudentFullName is available
        if (typeof getStudentFullName !== 'function') {
            throw new Error('getStudentFullName function is not available');
        }
        
        // Ensure purchaseDate is a proper Date object
        let actualPurchaseDate;
        if (purchaseDate) {
            actualPurchaseDate = purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);
        } else {
            actualPurchaseDate = new Date();
        }
        
        // Ensure expiryDate is a proper Date object if provided
        let actualExpiryDate = null;
        if (expiryDate) {
            actualExpiryDate = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
        }
        
        // Format purchase date for document ID (YYYY-MM-DD)
        const dateStr = actualPurchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Create document ID: firstName-lastName-purchased-YYYY-MM-DD (lowercase)
        const firstName = (student.firstName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const lastName = (student.lastName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const docId = `${firstName}-${lastName}-purchased-${dateStr}`;
        
        // Determine status based on expiry date
        const now = new Date();
        const isExpired = actualExpiryDate && actualExpiryDate < now;
        
        const blockData = {
            studentId: studentId,
            studentName: getStudentFullName(student),
            packageId: packageData.id,
            packageName: packageData.name,
            originalQuantity: quantity,
            remainingQuantity: quantity,
            purchaseDate: firebase.firestore.Timestamp.fromDate(actualPurchaseDate),
            expiryDate: actualExpiryDate ? firebase.firestore.Timestamp.fromDate(actualExpiryDate) : null,
            status: isExpired ? 'expired' : 'active',
            isLocked: false, // Default: not locked, can be used even if expired
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
                lockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown'
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
                unlockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown'
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
