/**
 * data-loader.js
 * Handles loading transaction data from Firestore
 */

/**
 * Load all transactions from Firestore
 */
async function loadAllTransactions() {
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
    
    // Normalize all transactions (asynchronous - need to fetch student names)
    const normalizedTransactions = await Promise.all(
        transactions.map(transaction => normalizeTransaction(transaction))
    );
    
    return normalizedTransactions;
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
    
    // Determine transaction type and display name
    let transactionType = transaction.type || 'concession-purchase'; // 'concession-purchase', 'casual', 'casual-student', 'concession-gift', etc.
    let typeName;
    
    // Handle both old and new type names for concession purchases
    if (transactionType === 'concession-purchase' || transactionType === 'purchase') {
        transactionType = 'concession-purchase'; // Normalize to new name
        typeName = 'Concession Purchase';
    } else if (transactionType === 'concession-gift') {
        typeName = 'Gifted Concessions';
    } else if (transactionType === 'casual-entry' || transactionType === 'entry' || transactionType === 'casual' || transactionType === 'casual-student') {
        // For casual-entry transactions, check the entryType field (if it exists) to distinguish casual vs casual-student
        // This handles both old transactions (type='casual-entry') and new ones (type='casual' or 'casual-student')
        if (transaction.entryType === 'casual-student' || transactionType === 'casual-student') {
            transactionType = 'casual-student';
            typeName = 'Casual Student';
        } else {
            transactionType = 'casual';
            typeName = 'Casual Entry';
        }
    } else {
        typeName = 'Transaction';
    }
    
    return {
        id: transaction.id,
        type: transactionType,
        typeName: typeName,
        date: date,
        studentName: studentName,
        studentId: transaction.studentId || null,
        amount: amount,
        cash: paymentMethod === 'cash' ? amount : 0,
        eftpos: paymentMethod === 'eftpos' ? amount : 0,
        bankTransfer: (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') ? amount : 0,
        paymentMethod: paymentMethod,
        invoiced: transaction.invoiced || false,
        reversed: transaction.reversed || false,
        collection: 'transactions',
        rawData: transaction
    };
}
