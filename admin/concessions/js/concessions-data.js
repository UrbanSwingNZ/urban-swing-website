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
async function createConcessionBlock(studentId, packageData, purchaseDate = new Date()) {
    const expiryDate = new Date(purchaseDate);
    expiryDate.setMonth(expiryDate.getMonth() + packageData.expiryMonths);
    
    const blockData = {
        studentId: studentId,
        packageId: packageData.id,
        packageName: packageData.name,
        purchaseDate: firebase.firestore.Timestamp.fromDate(purchaseDate),
        expiryDate: firebase.firestore.Timestamp.fromDate(expiryDate),
        totalClasses: packageData.numberOfClasses,
        remaining: packageData.numberOfClasses,
        used: 0,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('concessionBlocks').add(blockData);
    return docRef.id;
}

/**
 * Create transaction record
 */
async function createTransaction(studentId, packageData, paymentMethod, transactionDate = new Date()) {
    const transactionData = {
        studentId: studentId,
        transactionDate: firebase.firestore.Timestamp.fromDate(transactionDate),
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
async function completeConcessionPurchase(studentId, packageId, paymentMethod) {
    const packageData = getConcessionPackageById(packageId);
    if (!packageData) {
        throw new Error('Package not found');
    }
    
    try {
        // Create concession block
        const blockId = await createConcessionBlock(studentId, packageData);
        
        // Create transaction record
        const transactionId = await createTransaction(studentId, packageData, paymentMethod);
        
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
