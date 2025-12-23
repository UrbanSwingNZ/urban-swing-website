/**
 * checkin-transactions.js - Transaction operations for check-ins
 * 
 * This module handles creating and reversing transaction records
 * associated with check-in payments.
 */

/**
 * Create a transaction record for a check-in with payment
 */
export async function createCheckinTransaction(checkinId, studentId, entryType, amountPaid, paymentMethod, transactionDate) {
    // Generate transaction ID: studentId-checkinId-timestamp
    const timestamp = transactionDate.getTime();
    const transactionId = `${studentId}-${checkinId}-${timestamp}`;
    
    const transactionData = {
        studentId: studentId,
        transactionDate: firebase.firestore.Timestamp.fromDate(transactionDate),
        type: entryType, // Use the actual entry type ('casual' or 'casual-student')
        amountPaid: amountPaid,
        paymentMethod: paymentMethod,
        checkinId: checkinId, // Reference back to the check-in
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await firebase.firestore()
        .collection('transactions')
        .doc(transactionId)
        .set(transactionData);
    
    console.log('Transaction created:', transactionId);
}

/**
 * Reverse a transaction (mark as reversed instead of deleting)
 */
export async function reverseTransaction(checkinId) {
    try {
        // Find transaction(s) with this checkinId
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('checkinId', '==', checkinId)
            .get();
        
        if (snapshot.empty) {
            console.log('No transaction found for checkinId:', checkinId);
            return;
        }
        
        // Mark all matching transactions as reversed
        const batch = firebase.firestore().batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log(`Reversed ${snapshot.size} transaction(s) for checkinId:`, checkinId);
    } catch (error) {
        console.error('Error reversing transaction:', error);
        throw error;
    }
}
