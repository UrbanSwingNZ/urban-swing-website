/**
 * Merge Service - Firestore Operations
 * Handles all database operations for merging student records
 */

/**
 * Validate merge operation
 */
async function validateMerge(primaryId, deprecatedId) {
    // TODO: Implement in Phase 2
    console.log('Validating merge:', primaryId, deprecatedId);
    return { valid: true, errors: [] };
}

/**
 * Get counts of related documents
 */
async function getRelatedDocumentCounts(studentId) {
    try {
        const counts = {
            transactions: 0,
            checkins: 0,
            concessionBlocks: 0
        };

        // Query transactions
        const transactionsSnapshot = await firebase.firestore().collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        counts.transactions = transactionsSnapshot.size;

        // Query check-ins
        const checkinsSnapshot = await firebase.firestore().collection('checkins')
            .where('studentId', '==', studentId)
            .get();
        counts.checkins = checkinsSnapshot.size;

        // Query concession blocks
        const blocksSnapshot = await firebase.firestore().collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .get();
        counts.concessionBlocks = blocksSnapshot.size;

        return counts;
    } catch (error) {
        console.error('Error getting related document counts:', error);
        return { transactions: 0, checkins: 0, concessionBlocks: 0 };
    }
}

/**
 * Perform the merge operation
 */
async function performMerge(primaryId, deprecatedId, fieldSelections) {
    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;
    
    if (!currentUser) {
        throw new Error('User not authenticated');
    }

    console.log('Starting merge operation:', { primaryId, deprecatedId });

    try {
        const summary = {
            transactionsUpdated: 0,
            checkinsUpdated: 0,
            concessionBlocksUpdated: 0
        };

        // Step 1: Get both student records
        const [primaryDoc, deprecatedDoc] = await Promise.all([
            db.collection('students').doc(primaryId).get(),
            db.collection('students').doc(deprecatedId).get()
        ]);

        if (!primaryDoc.exists || !deprecatedDoc.exists) {
            throw new Error('One or both student records not found');
        }

        const primaryData = primaryDoc.data();
        const deprecatedData = deprecatedDoc.data();

        // Step 2: Determine Stripe customer ID based on field selection (or primary if not specified)
        const stripeCustomerId = fieldSelections.stripeCustomerId === 'deprecated' 
            ? (deprecatedData.stripeCustomerId || primaryData.stripeCustomerId)
            : (primaryData.stripeCustomerId || deprecatedData.stripeCustomerId);

        // Step 3: Update transactions in batches
        console.log('Updating transactions...');
        const transactionsSnapshot = await db.collection('transactions')
            .where('studentId', '==', deprecatedId)
            .get();

        summary.transactionsUpdated = transactionsSnapshot.size;

        // Process transactions in batches of 500
        const transactionBatches = [];
        let currentBatch = db.batch();
        let operationCount = 0;

        transactionsSnapshot.forEach((doc) => {
            currentBatch.update(doc.ref, {
                studentId: primaryId,
                stripeCustomerId: stripeCustomerId
            });
            operationCount++;

            if (operationCount === 500) {
                transactionBatches.push(currentBatch);
                currentBatch = db.batch();
                operationCount = 0;
            }
        });

        if (operationCount > 0) {
            transactionBatches.push(currentBatch);
        }

        for (const batch of transactionBatches) {
            await batch.commit();
        }

        console.log(`Updated ${summary.transactionsUpdated} transactions`);

        // Step 4: Update checkins in batches
        console.log('Updating check-ins...');
        const checkinsSnapshot = await db.collection('checkins')
            .where('studentId', '==', deprecatedId)
            .get();

        summary.checkinsUpdated = checkinsSnapshot.size;

        const checkinBatches = [];
        currentBatch = db.batch();
        operationCount = 0;

        checkinsSnapshot.forEach((doc) => {
            currentBatch.update(doc.ref, {
                studentId: primaryId
            });
            operationCount++;

            if (operationCount === 500) {
                checkinBatches.push(currentBatch);
                currentBatch = db.batch();
                operationCount = 0;
            }
        });

        if (operationCount > 0) {
            checkinBatches.push(currentBatch);
        }

        for (const batch of checkinBatches) {
            await batch.commit();
        }

        console.log(`Updated ${summary.checkinsUpdated} check-ins`);

        // Step 5: Update concessionBlocks in batches
        console.log('Updating concession blocks...');
        const blocksSnapshot = await db.collection('concessionBlocks')
            .where('studentId', '==', deprecatedId)
            .get();

        summary.concessionBlocksUpdated = blocksSnapshot.size;

        const blockBatches = [];
        currentBatch = db.batch();
        operationCount = 0;

        blocksSnapshot.forEach((doc) => {
            currentBatch.update(doc.ref, {
                studentId: primaryId
            });
            operationCount++;

            if (operationCount === 500) {
                blockBatches.push(currentBatch);
                currentBatch = db.batch();
                operationCount = 0;
            }
        });

        if (operationCount > 0) {
            blockBatches.push(currentBatch);
        }

        for (const batch of blockBatches) {
            await batch.commit();
        }

        console.log(`Updated ${summary.concessionBlocksUpdated} concession blocks`);

        // Step 6: Update primary student record with selected field values
        console.log('Updating primary student record...');
        const primaryUpdate = {
            mergedFrom: firebase.firestore.FieldValue.arrayUnion(deprecatedId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.email
        };

        // Apply field selections - use deprecated values where selected
        const fieldsToMerge = ['email', 'firstName', 'lastName', 'phoneNumber', 'pronouns', 'stripeCustomerId'];
        fieldsToMerge.forEach(field => {
            if (fieldSelections[field] === 'deprecated' && deprecatedData[field]) {
                // User chose to use the deprecated value for this field
                primaryUpdate[field] = deprecatedData[field];
            }
            // If 'primary' or no selection, keep existing primary value (no update needed)
        });

        await db.collection('students').doc(primaryId).update(primaryUpdate);

        console.log('Primary student record updated');

        // Step 7: Soft delete deprecated student record
        console.log('Soft deleting deprecated student record...');
        await db.collection('students').doc(deprecatedId).update({
            deleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: currentUser.email,
            mergedInto: primaryId
        });

        console.log('Deprecated student record soft deleted');

        // Step 8: Delete users collection document for deprecated student and handle auth
        console.log('Managing user access and authentication...');
        
        // Get both users documents
        const [primaryUsersSnapshot, deprecatedUsersSnapshot] = await Promise.all([
            db.collection('users').where('studentId', '==', primaryId).get(),
            db.collection('users').where('studentId', '==', deprecatedId).get()
        ]);

        let primaryAuthUid = null;
        if (!primaryUsersSnapshot.empty) {
            primaryAuthUid = primaryUsersSnapshot.docs[0].data().authUid;
        }

        if (!deprecatedUsersSnapshot.empty) {
            // Should only be one user document per student
            const userDoc = deprecatedUsersSnapshot.docs[0];
            const userData = userDoc.data();
            
            await userDoc.ref.delete();
            console.log('Deprecated users collection document deleted');

            // Step 9: Delete deprecated Firebase Auth user
            if (userData.authUid) {
                console.log('Deleting deprecated Firebase Auth user...');
                try {
                    const manageAuthUsers = firebase.functions().httpsCallable('manageAuthUsers');
                    await manageAuthUsers({
                        operation: 'delete',
                        uid: userData.authUid
                    });
                    console.log('Deprecated Firebase Auth user deleted');
                    
                    // Step 10: Update primary auth user's email if deprecated email was selected
                    if (fieldSelections.email === 'deprecated' && deprecatedData.email && primaryAuthUid) {
                        console.log('Updating primary auth user email to selected email...');
                        try {
                            await manageAuthUsers({
                                operation: 'updateEmail',
                                uid: primaryAuthUid,
                                email: deprecatedData.email
                            });
                            console.log('Primary auth user email updated to:', deprecatedData.email);
                        } catch (emailUpdateError) {
                            console.error('Error updating primary auth user email:', emailUpdateError);
                            throw new Error(`Failed to update auth email: ${emailUpdateError.message}`);
                        }
                    }
                } catch (authError) {
                    console.error('Error managing Firebase Auth users:', authError);
                    throw new Error(`Failed to manage authentication: ${authError.message}`);
                }
            }
        } else {
            console.log('No users collection document found for deprecated student');
        }

        console.log('Merge operation completed successfully', summary);

        return {
            success: true,
            summary
        };

    } catch (error) {
        console.error('Error performing merge:', error);
        throw error;
    }
}
