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
 */
async function createConcessionBlock(studentId, packageData, purchaseDate = new Date(), paymentMethod = '') {
    console.log('createConcessionBlock called with:', { studentId, packageData, purchaseDate, paymentMethod });
    
    // Ensure purchaseDate is a proper Date object
    const actualPurchaseDate = purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);
    
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
    
    const expiryDate = new Date(actualPurchaseDate.getTime());
    expiryDate.setMonth(expiryDate.getMonth() + packageData.expiryMonths);
    
    // Determine status based on expiry date
    const now = new Date();
    const isExpired = expiryDate < now;
    
    // Format purchase date for document ID (YYYY-MM-DD)
    const dateStr = actualPurchaseDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Create document ID: firstName-lastName-purchased-YYYY-MM-DD (lowercase)
    let docId = `unknown-unknown-purchased-${dateStr}`;
    try {
        if (typeof findStudentById === 'function') {
            const student = findStudentById(studentId);
            if (student) {
                const firstName = (student.firstName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
                const lastName = (student.lastName || 'Unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
                docId = `${firstName}-${lastName}-purchased-${dateStr}`;
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
        originalQuantity: packageData.numberOfClasses,
        remainingQuantity: packageData.numberOfClasses,
        purchaseDate: firebase.firestore.Timestamp.fromDate(actualPurchaseDate),
        expiryDate: firebase.firestore.Timestamp.fromDate(expiryDate),
        status: isExpired ? 'expired' : 'active',
        isLocked: false, // Default: not locked, can be used even if expired
        price: packageData.price || 0,
        paymentMethod: paymentMethod || 'unknown',
        transactionId: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
        notes: ''
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
        type: 'purchase',
        packageId: packageData.id,
        packageName: packageData.name,
        numberOfClasses: packageData.numberOfClasses,
        amountPaid: packageData.price,
        paymentMethod: paymentMethod,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('transactions').add(transactionData);
    return docRef.id;
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
        // Create concession block with specified purchase date
        // Note: If concession-blocks.js is loaded (from check-in page), use that version
        // Otherwise use the local version defined above
        
        // Calculate expiry date
        const expiryDate = new Date(actualPurchaseDate.getTime());
        expiryDate.setMonth(expiryDate.getMonth() + packageData.expiryMonths);
        
        // Call createConcessionBlock with correct parameters
        const blockId = await createConcessionBlock(
            studentId, 
            packageData, 
            actualPurchaseDate,  // purchaseDate
            paymentMethod        // paymentMethod
        );
        
        // Create transaction record
        const transactionId = await createTransaction(studentId, packageData, paymentMethod, actualPurchaseDate);
        
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
