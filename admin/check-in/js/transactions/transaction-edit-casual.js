/**
 * transaction-edit-casual.js
 * Handles editing casual entry transactions
 */

/**
 * Edit a casual entry transaction
 * @param {Object} transaction - Transaction data
 */
export async function editCasualTransaction(transaction) {
    // Get checkinId - we need to fetch it from the checkins collection
    let checkinId = null;
    try {
        const checkinSnapshot = await firebase.firestore()
            .collection('checkins')
            .where('studentId', '==', transaction.studentId)
            .where('checkinDate', '==', firebase.firestore.Timestamp.fromDate(transaction.date))
            .get();
        
        if (!checkinSnapshot.empty) {
            checkinId = checkinSnapshot.docs[0].id;
        }
    } catch (error) {
        console.error('Error fetching checkin:', error);
    }
    
    // Open casual entry modal for editing with callback to reload transactions
    await openCasualEntryModal(
        transaction.id,                    // transactionId
        checkinId,                         // checkinId
        transaction.studentId,             // studentId
        transaction.studentName,           // studentName
        transaction.date,                  // entryDate
        transaction.paymentMethod,         // paymentMethod
        transaction.amount,                // amount
        async () => {                      // callback
            // Reload transactions after update
            if (typeof window.loadCheckinTransactions === 'function') {
                await window.loadCheckinTransactions();
            }
        },
        null,                              // parentModalId
        transactionData.classDate?.toDate ? transactionData.classDate.toDate() : null  // classDate (convert Timestamp to Date)
    );
}
