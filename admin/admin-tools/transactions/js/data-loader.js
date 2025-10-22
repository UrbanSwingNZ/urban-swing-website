/**
 * data-loader.js
 * Handles loading transaction data from Firestore
 */

/**
 * Load all transactions from Firestore
 */
async function loadAllTransactions() {
    const [checkinsData, transactionsData] = await Promise.all([
        loadCheckinsWithPayments(),
        loadConcessionPurchases()
    ]);
    
    // Combine and normalize all transactions
    return [
        ...checkinsData.map(normalizeCheckin),
        ...transactionsData.map(normalizeTransaction)
    ];
}

/**
 * Load check-ins with payments from Firestore
 */
async function loadCheckinsWithPayments() {
    const snapshot = await firebase.firestore()
        .collection('checkins')
        .where('amountPaid', '>', 0)
        .get();
    
    const checkins = [];
    snapshot.forEach(doc => {
        checkins.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return checkins;
}

/**
 * Load concession purchases from transactions collection
 */
async function loadConcessionPurchases() {
    const snapshot = await firebase.firestore()
        .collection('transactions')
        .get();
    
    const transactions = [];
    snapshot.forEach(doc => {
        transactions.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return transactions;
}

/**
 * Normalize check-in data to standard transaction format
 */
function normalizeCheckin(checkin) {
    const date = checkin.timestamp?.toDate ? checkin.timestamp.toDate() : new Date(checkin.timestamp);
    const paymentMethod = (checkin.paymentMethod || '').toLowerCase();
    
    return {
        id: checkin.id,
        type: 'checkin',
        typeName: getPaymentTypeDisplay(paymentMethod),
        date: date,
        studentName: checkin.studentName || 'Unknown',
        studentId: checkin.studentId || null,
        amount: checkin.amountPaid || 0,
        cash: paymentMethod === 'cash' ? checkin.amountPaid : 0,
        eftpos: paymentMethod === 'eftpos' ? checkin.amountPaid : 0,
        bankTransfer: paymentMethod === 'bank transfer' ? checkin.amountPaid : 0,
        paymentMethod: paymentMethod,
        invoiced: checkin.invoiced || false,
        collection: 'checkins',
        rawData: checkin
    };
}

/**
 * Normalize transaction data to standard format
 */
function normalizeTransaction(transaction) {
    const date = transaction.timestamp?.toDate ? transaction.timestamp.toDate() : new Date(transaction.timestamp);
    const paymentMethod = (transaction.paymentMethod || '').toLowerCase();
    
    return {
        id: transaction.id,
        type: 'concession',
        typeName: 'Concession Purchase',
        date: date,
        studentName: transaction.studentName || 'Unknown',
        studentId: transaction.studentId || null,
        amount: transaction.price || 0,
        cash: paymentMethod === 'cash' ? transaction.price : 0,
        eftpos: paymentMethod === 'eftpos' ? transaction.price : 0,
        bankTransfer: paymentMethod === 'bank transfer' ? transaction.price : 0,
        paymentMethod: paymentMethod,
        invoiced: transaction.invoiced || false,
        collection: 'transactions',
        rawData: transaction
    };
}

/**
 * Get display name for payment type
 */
function getPaymentTypeDisplay(paymentMethod) {
    const method = paymentMethod.toLowerCase();
    
    if (method === 'cash') return 'Cash Payment';
    if (method === 'eftpos') return 'EFTPOS Payment';
    if (method === 'bank transfer') return 'Bank Transfer';
    
    return 'Other Payment';
}
