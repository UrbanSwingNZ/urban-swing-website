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
    
    // Normalize check-ins (synchronous)
    const normalizedCheckins = checkinsData.map(normalizeCheckin);
    
    // Normalize transactions (asynchronous - need to fetch student names)
    const normalizedTransactions = await Promise.all(
        transactionsData.map(transaction => normalizeTransaction(transaction))
    );
    
    // Combine and return all transactions
    return [
        ...normalizedCheckins,
        ...normalizedTransactions
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
async function normalizeTransaction(transaction) {
    const date = transaction.transactionDate?.toDate ? transaction.transactionDate.toDate() : new Date(transaction.transactionDate);
    const paymentMethod = (transaction.paymentMethod || '').toLowerCase();
    const amount = transaction.amountPaid || 0;
    
    // Fetch student name from students collection if we have a studentId
    let studentName = transaction.studentName || 'Unknown';
    if (transaction.studentId) {
        try {
            const studentDoc = await firebase.firestore()
                .collection('students')
                .doc(transaction.studentId)
                .get();
            
            if (studentDoc.exists) {
                const studentData = studentDoc.data();
                studentName = `${studentData.firstName} ${studentData.lastName}`;
            }
        } catch (error) {
            console.error('Error fetching student name:', error);
        }
    }
    
    return {
        id: transaction.id,
        type: 'concession',
        typeName: 'Concession Purchase',
        date: date,
        studentName: studentName,
        studentId: transaction.studentId || null,
        amount: amount,
        cash: paymentMethod === 'cash' ? amount : 0,
        eftpos: paymentMethod === 'eftpos' ? amount : 0,
        bankTransfer: paymentMethod === 'bank transfer' ? amount : 0,
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
