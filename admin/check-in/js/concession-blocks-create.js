/**
 * concession-blocks-create.js - Creating new concession blocks
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
        
        // Create document ID: firstName-lastName-purchased-YYYY-MM-DD-timestamp (lowercase)
        // Added timestamp to ensure uniqueness when multiple blocks purchased on same day
        const timestamp = Date.now();
        const firstName = (student.firstName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const lastName = (student.lastName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const docId = `${firstName}-${lastName}-purchased-${dateStr}-${timestamp}`;
        
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
