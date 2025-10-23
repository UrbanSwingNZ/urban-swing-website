/**
 * concessions-data.js - Concession packages data management
 * Fetches concession packages from Firestore
 */

let concessionPackagesCache = [];

/**
 * Load concession packages from Firestore
 */
async function loadConcessionPackages() {
    try {
        const snapshot = await db.collection('concessionPackages').get();
        
        concessionPackagesCache = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(pkg => pkg.isActive !== false) // Filter for active packages
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)); // Sort by displayOrder
        
        return concessionPackagesCache;
    } catch (error) {
        console.error('Error loading concession packages:', error);
        // Return default packages as fallback
        return getDefaultPackages();
    }
}

/**
 * Get cached concession packages
 */
function getConcessionPackages() {
    return concessionPackagesCache;
}

/**
 * Get a specific package by ID
 */
function getConcessionPackageById(packageId) {
    return concessionPackagesCache.find(pkg => pkg.id === packageId);
}

/**
 * Default packages (fallback if Firestore fails)
 */
function getDefaultPackages() {
    return [
        {
            id: '5-class',
            name: '5 Classes',
            numberOfClasses: 5,
            price: 55,
            expiryMonths: 6,
            displayOrder: 1,
            isActive: true,
            isPromo: false
        },
        {
            id: '10-class',
            name: '10 Classes',
            numberOfClasses: 10,
            price: 100,
            expiryMonths: 9,
            displayOrder: 2,
            isActive: true,
            isPromo: false
        },
        {
            id: 'promo-8-class',
            name: 'PROMO - 8 Classes',
            numberOfClasses: 8,
            price: 60,
            expiryMonths: 6,
            displayOrder: 3,
            isActive: true,
            isPromo: true
        }
    ];
}

/**
 * Create concession block document
 * @param {string} studentId - Student document ID
 * @param {object} packageData - Package information
 * @param {number} quantity - Number of entries
 * @param {number} price - Amount paid
 * @param {string} paymentMethod - Payment method
 * @param {Date} expiryDate - Expiry date
 * @param {string} notes - Optional notes
 * @param {Date} purchaseDate - Optional purchase date (defaults to now)
 * @returns {Promise<string>} - Document ID of created block
 */
async function createConcessionBlock(studentId, packageData, quantity, price, paymentMethod, expiryDate, notes = '', purchaseDate = null, transactionId = null) {
    console.log('createConcessionBlock called with:', { studentId, packageData, quantity, price, paymentMethod, expiryDate, notes, purchaseDate, transactionId });
    
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
    
    // Try to get student name, fallback to 'Unknown' if not available
    let studentName = 'Unknown Student';
    try {
        if (typeof findStudentById === 'function') {
            const student = findStudentById(studentId);
            if (student && typeof getStudentFullName === 'function') {
                studentName = getStudentFullName(student);
            }
        }
    } catch (e) {
        console.warn('Could not get student name:', e);
    }
    
    // Determine status based on expiry date
    const now = new Date();
    const isExpired = actualExpiryDate && actualExpiryDate < now;
    
    // Format purchase date for document ID (YYYY-MM-DD)
    const dateStr = actualPurchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Create document ID: firstName-lastName-purchased-YYYY-MM-DD-timestamp (lowercase)
    // Added timestamp to ensure uniqueness when multiple blocks purchased on same day
    const timestamp = Date.now();
    let docId = `unknown-unknown-purchased-${dateStr}-${timestamp}`;
    try {
        if (typeof findStudentById === 'function') {
            const student = findStudentById(studentId);
            if (student) {
                const firstName = (student.firstName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
                const lastName = (student.lastName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
                docId = `${firstName}-${lastName}-purchased-${dateStr}-${timestamp}`;
            }
        }
    } catch (e) {
        console.warn('Could not create custom document ID:', e);
    }
    
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
    
    console.log('Block data to save:', blockData);
    
    // Use set() with custom document ID instead of add()
    const docRef = db.collection('concessionBlocks').doc(docId);
    await docRef.set(blockData);
    return docRef.id;
}

/**
 * Create transaction record
 */
async function createTransaction(studentId, packageData, paymentMethod, transactionDate = new Date()) {
    // Ensure transactionDate is a proper Date object
    const actualTransactionDate = transactionDate instanceof Date ? transactionDate : new Date(transactionDate);
    
    const transactionData = {
        studentId: studentId,
        transactionDate: firebase.firestore.Timestamp.fromDate(actualTransactionDate),
        type: 'concession-purchase',
        packageId: packageData.id,
        packageName: packageData.name,
        numberOfClasses: packageData.numberOfClasses,
        amountPaid: packageData.price,
        paymentMethod: paymentMethod,
        checkinId: null, // Concession purchases are not tied to a check-in
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Generate human-readable transaction ID: firstName-lastName-packageId-timestamp
    const student = await db.collection('students').doc(studentId).get();
    const studentData = student.data();
    
    const firstName = (studentData.firstName || 'unknown').toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const lastName = (studentData.lastName || 'unknown').toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const timestamp = actualTransactionDate.getTime();
    const transactionId = `${firstName}-${lastName}-${packageData.id}-${timestamp}`;
    
    await db.collection('transactions').doc(transactionId).set(transactionData);
    return transactionId;
}

/**
 * Update student's concession balance
 */
async function updateStudentBalance(studentId, classesToAdd) {
    const studentRef = db.collection('students').doc(studentId);
    
    await studentRef.update({
        concessionBalance: firebase.firestore.FieldValue.increment(classesToAdd),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Complete purchase - creates block, transaction, and updates balance
 */
async function completeConcessionPurchase(studentId, packageId, paymentMethod, purchaseDate = null) {
    const packageData = getConcessionPackageById(packageId);
    if (!packageData) {
        throw new Error('Package not found');
    }
    
    // Use provided date or default to now
    // Ensure we have a proper Date object
    let actualPurchaseDate;
    if (purchaseDate) {
        actualPurchaseDate = purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);
    } else {
        actualPurchaseDate = new Date();
    }
    
    try {
        // Create transaction record FIRST so we have the ID
        const transactionId = await createTransaction(studentId, packageData, paymentMethod, actualPurchaseDate);
        
        // Calculate expiry date
        const expiryDate = new Date(actualPurchaseDate.getTime());
        expiryDate.setMonth(expiryDate.getMonth() + packageData.expiryMonths);
        
        // Call createConcessionBlock with correct parameters
        // Signature: createConcessionBlock(studentId, packageData, quantity, price, paymentMethod, expiryDate, notes, purchaseDate, transactionId)
        const blockId = await createConcessionBlock(
            studentId,
            packageData,
            packageData.numberOfClasses,  // quantity
            packageData.price,             // price
            paymentMethod,                 // paymentMethod
            expiryDate,                    // expiryDate
            '',                            // notes
            actualPurchaseDate,            // purchaseDate
            transactionId                  // transactionId
        );
        
        // Update student balance
        await updateStudentBalance(studentId, packageData.numberOfClasses);
        
        return {
            success: true,
            blockId,
            transactionId,
            package: packageData
        };
    } catch (error) {
        console.error('Error completing purchase:', error);
        throw error;
    }
}
