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
async function createConcessionBlock(studentId, packageData, quantity, price, paymentMethod, expiryDate, notes = '', purchaseDate = null, transactionId = null) {
    try {
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
        
        // Fetch student data directly from Firestore to get accurate name
        let studentName = 'Unknown Student';
        let firstName = 'unknown';
        let lastName = 'unknown';
        
        try {
            const studentDoc = await firebase.firestore().collection('students').doc(studentId).get();
            if (studentDoc.exists) {
                const studentData = studentDoc.data();
                firstName = (studentData.firstName || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                lastName = (studentData.lastName || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                studentName = `${studentData.firstName || 'Unknown'} ${studentData.lastName || 'Student'}`;
            } else {
                console.warn('Student document not found:', studentId);
            }
        } catch (e) {
            console.error('Error fetching student data:', e);
        }
        
        // Determine status based on expiry date
        const now = new Date();
        const isExpired = actualExpiryDate && actualExpiryDate < now;
        
        // Format purchase date for document ID (YYYY-MM-DD)
        const dateStr = actualPurchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Create document ID: firstName-lastName-purchased-YYYY-MM-DD-timestamp (lowercase)
        // Added timestamp to ensure uniqueness when multiple blocks purchased on same day
        const timestamp = Date.now();
        const docId = `${firstName}-${lastName}-purchased-${dateStr}-${timestamp}`;
        
        const blockData = {
            studentId: studentId,
            studentName: studentName,
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
            transactionId: transactionId, // Now properly set
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
