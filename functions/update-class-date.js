/**
 * Cloud Function: Update Class Date
 * Allows students to update the class date for their prepaid casual transactions
 * before 7pm on the class date
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Update class date for a prepaid transaction
 * Callable function that validates permissions and time restrictions
 */
exports.updateClassDate = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to update class date'
        );
    }

    const { transactionId, newClassDate } = data;

    // Validate input
    if (!transactionId || !newClassDate) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Transaction ID and new class date are required'
        );
    }

    try {
        const db = admin.firestore();
        const userId = context.auth.uid;

        // Get user document to find studentId
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'User document not found'
            );
        }

        const userData = userDoc.data();
        const studentId = userData.studentId;
        const userRole = userData.role;

        // Get the transaction
        const transactionRef = db.collection('transactions').doc(transactionId);
        const transactionDoc = await transactionRef.get();

        if (!transactionDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Transaction not found'
            );
        }

        const transaction = transactionDoc.data();

        // Check permissions: student must own the transaction OR be admin/front-desk
        if (transaction.studentId !== studentId && !['admin', 'front-desk'].includes(userRole)) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'You do not have permission to update this transaction'
            );
        }

        // Check if transaction is a casual type
        if (!['casual', 'casual-student', 'casual-entry'].includes(transaction.type)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Only casual transactions can have their date changed'
            );
        }

        // Check if transaction is reversed or already used for check-in
        if (transaction.reversed || transaction.usedForCheckin) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Cannot update date for reversed or checked-in transactions'
            );
        }

        // Check time restriction: must be before 7pm on the class date
        const now = new Date();
        const currentClassDate = transaction.classDate.toDate();
        const cutoffTime = new Date(currentClassDate);
        cutoffTime.setHours(19, 0, 0, 0); // 7pm on class date

        if (now >= cutoffTime) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Cannot change class date after 7pm on the class date'
            );
        }

        // Convert newClassDate string to Timestamp
        const newDate = new Date(newClassDate);
        if (isNaN(newDate.getTime())) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Invalid date format'
            );
        }

        // Update the transaction
        await transactionRef.update({
            classDate: admin.firestore.Timestamp.fromDate(newDate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: 'Class date updated successfully',
            transactionId: transactionId,
            newClassDate: newDate.toISOString()
        };

    } catch (error) {
        console.error('Error updating class date:', error);
        
        // If it's already an HttpsError, re-throw it
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        
        // Otherwise, wrap it in a generic error
        throw new functions.https.HttpsError(
            'internal',
            'Failed to update class date: ' + error.message
        );
    }
});
