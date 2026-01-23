/**
 * transaction-loader.js
 * Handles loading transactions from Firestore with real-time listener
 */

let transactionsUnsubscribe = null; // Store unsubscribe function

/**
 * Set up real-time listener for transactions on the selected check-in date
 * @param {Date} selectedDate - The date to load transactions for
 * @param {Function} onSnapshot - Callback function when data changes
 * @returns {Function} Unsubscribe function
 */
export function setupTransactionsListener(selectedDate, onSnapshot) {
    // Unsubscribe from any existing listener
    if (transactionsUnsubscribe) {
        transactionsUnsubscribe();
    }
    
    // Start and end of selected day
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Set up real-time listener
    transactionsUnsubscribe = firebase.firestore()
        .collection('transactions')
        .where('transactionDate', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
        .where('transactionDate', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
        .onSnapshot(async (snapshot) => {
            const transactions = await processTransactionsSnapshot(snapshot);
            onSnapshot(transactions);
        }, (error) => {
            console.error('Error in transactions listener:', error);
            onSnapshot([]);
        });
    
    return transactionsUnsubscribe;
}

/**
 * Process transactions snapshot and normalize data
 * @param {QuerySnapshot} snapshot - Firestore snapshot
 * @returns {Promise<Array>} Normalized transactions array
 */
async function processTransactionsSnapshot(snapshot) {
    try {
        const transactionPromises = snapshot.docs.map(async doc => {
            const data = doc.data();
            const date = data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate);
            const paymentMethod = (data.paymentMethod || '').toLowerCase();
            let transactionType = data.type || 'concession-purchase';
            const isRefund = transactionType === 'refund';
            const rawAmount = isRefund ? (data.amountRefunded || 0) : (data.amountPaid || 0);
            // Make refund amounts negative so they subtract from totals
            const amount = isRefund ? -rawAmount : rawAmount;
            
            // Fetch student name
            let studentName = data.studentName || 'Unknown';
            if (data.studentId) {
                try {
                    const studentDoc = await firebase.firestore()
                        .collection('students')
                        .doc(data.studentId)
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
            let typeName;
            
            if (transactionType === 'concession-purchase' || transactionType === 'purchase') {
                transactionType = 'concession-purchase';
                typeName = 'Concession Purchase';
            } else if (transactionType === 'concession-gift') {
                typeName = 'Gifted Concessions';
            } else if (transactionType === 'casual-entry' || transactionType === 'entry' || transactionType === 'casual' || transactionType === 'casual-student') {
                // For casual-entry transactions, check the entryType field
                if (data.entryType === 'casual-student' || transactionType === 'casual-student') {
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
                id: doc.id,
                collection: 'transactions',
                type: transactionType,
                typeName: typeName,
                date: date,
                studentName: studentName,
                studentId: data.studentId || null,
                amount: amount,
                cash: paymentMethod === 'cash' ? amount : 0,
                eftpos: paymentMethod === 'eftpos' ? amount : 0,
                bankTransfer: (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') ? amount : 0,
                online: (paymentMethod === 'stripe' || paymentMethod === 'online') ? amount : 0,
                paymentMethod: paymentMethod,
                invoiced: data.invoiced || false,
                reversed: data.reversed || false,
                stripeCustomerId: data.stripeCustomerId || null
            };
        });
        
        return await Promise.all(transactionPromises);
    } catch (error) {
        console.error('Error processing transactions:', error);
        return [];
    }
}

/**
 * Unsubscribe from the current listener
 */
export function unsubscribeTransactionsListener() {
    if (transactionsUnsubscribe) {
        transactionsUnsubscribe();
        transactionsUnsubscribe = null;
    }
}
