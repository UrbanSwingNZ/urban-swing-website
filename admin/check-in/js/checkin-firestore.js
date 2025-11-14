/**
 * checkin-firestore.js - Firestore save operations
 */

/**
 * Handle check-in submission
 */
function handleCheckinSubmit() {
    const student = getSelectedStudent();
    if (!student) return;
    
    const entryType = document.querySelector('input[name="entry-type"]:checked')?.value;
    if (!entryType) {
        showSnackbar('Please select an entry type', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('payment-method').value;
    const freeEntryReason = document.getElementById('free-entry-reason').value;
    const notes = document.getElementById('checkin-notes').value;
    
    // Validate payment for casual entries
    if ((entryType === 'casual' || entryType === 'casual-student') && !paymentMethod) {
        showSnackbar('Please select a payment method for casual entry', 'error');
        return;
    }
    
    // Validate casual rate is loaded
    if (entryType === 'casual') {
        const casualPrice = getCurrentCasualPrice();
        if (casualPrice === null) {
            showSnackbar('Cannot process casual entry: Pricing not loaded. Please refresh the page or contact support.', 'error');
            return;
        }
    }
    
    // Validate student casual rate is loaded
    if (entryType === 'casual-student') {
        const studentPrice = getCurrentStudentPrice();
        if (studentPrice === null) {
            showSnackbar('Cannot process casual student entry: Pricing not loaded. Please refresh the page or contact support.', 'error');
            return;
        }
    }
    
    // Validate reason for free entry
    if (entryType === 'free' && !freeEntryReason) {
        showSnackbar('Please select a reason for free entry', 'error');
        return;
    }
    
    // Save check-in to Firestore
    saveCheckinToFirestore(student, entryType, paymentMethod, freeEntryReason, notes);
}

/**
 * Save check-in to Firestore
 */
async function saveCheckinToFirestore(student, entryType, paymentMethod, freeEntryReason, notes) {
    try {
        // Get the selected check-in date from date picker
        const checkinDate = getSelectedCheckinDate(); // Returns Date object
        
        // Format date for document ID: YYYY-MM-DD
        const year = checkinDate.getFullYear();
        const month = String(checkinDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkinDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Create document ID: checkin-YYYY-MM-DD-firstname-lastname
        const firstName = student.firstName.toLowerCase().replace(/\s+/g, '-');
        const lastName = student.lastName.toLowerCase().replace(/\s+/g, '-');
        const docId = `checkin-${dateStr}-${firstName}-${lastName}`;
        
        let concessionBlockId = null;
        
        // Check if this student already has a check-in for this date
        const existingCheckin = await firebase.firestore()
            .collection('checkins')
            .doc(docId)
            .get();
        
        // Prevent duplicate check-ins (unless we're editing)
        if (existingCheckin.exists && !isEditMode()) {
            const existingData = existingCheckin.data();
            
            // If the existing check-in is not reversed, it's a duplicate
            if (!existingData.reversed) {
                showSnackbar(`${getStudentFullName(student)} is already checked in for this date.`, 'error');
                return;
            }
        }
        
        // Handle existing check-in updates
        if (existingCheckin.exists && (isEditMode() || existingCheckin.data().reversed)) {
            const existingData = existingCheckin.data();
            
            // If the check-in was previously reversed, un-reverse it
            if (existingData.reversed) {
                // Un-reverse the check-in (will be updated with new data below)
                // If it was a concession, re-use the block entry
                if (entryType === 'concession') {
                    const block = await getNextAvailableBlock(student.id, true);
                    if (!block) {
                        showSnackbar('No concession entries available for this student', 'error');
                        return;
                    }
                    await useBlockEntry(block.id);
                    concessionBlockId = block.id;
                }
                // Transaction will be re-created if it's a paid entry (handled after save)
            } else {
                // Normal update of existing active check-in
                // Handle transaction changes when updating check-in
                const hadPayment = existingData.amountPaid > 0;
                const willHavePayment = (entryType === 'casual' || entryType === 'casual-student');
                
                if (hadPayment && !willHavePayment) {
                    // Changing FROM paid TO free - reverse the transaction
                    try {
                        await reverseTransaction(docId);
                    } catch (error) {
                        console.error('Error reversing transaction on update:', error);
                    }
                }
                // Note: If changing FROM free TO paid, new transaction will be created after save
                
                // If they're changing FROM concession TO another type, restore the concession
                if (existingData.entryType === 'concession' && entryType !== 'concession' && existingData.concessionBlockId) {
                    await restoreBlockEntry(existingData.concessionBlockId);
                }
                // If they're changing FROM another type TO concession, use a concession
                else if (existingData.entryType !== 'concession' && entryType === 'concession') {
                    const block = await getNextAvailableBlock(student.id, true);
                    if (!block) {
                        showSnackbar('No concession entries available for this student', 'error');
                        return;
                    }
                    await useBlockEntry(block.id);
                    concessionBlockId = block.id;
                }
                // If both are concession, keep the existing block ID (no change needed)
                else if (existingData.entryType === 'concession' && entryType === 'concession') {
                    concessionBlockId = existingData.concessionBlockId;
                }
            }
        } else {
            // New check-in - if concession, use a block entry
            if (entryType === 'concession') {
                const block = await getNextAvailableBlock(student.id, true); // Allow expired
                
                if (!block) {
                    showSnackbar('No concession entries available for this student', 'error');
                    return;
                }
                
                // Use one entry from the block
                await useBlockEntry(block.id);
                concessionBlockId = block.id;
            }
        }
        
        // Build check-in data
        const checkinData = {
            studentId: student.id,
            studentName: getStudentFullName(student),
            checkinDate: firebase.firestore.Timestamp.fromDate(checkinDate),
            entryType: entryType,
            paymentMethod: (entryType === 'casual' || entryType === 'casual-student') ? paymentMethod : null,
            freeEntryReason: entryType === 'free' ? freeEntryReason : null,
            amountPaid: entryType === 'casual' ? getCurrentCasualPrice() : 
                       entryType === 'casual-student' ? getCurrentStudentPrice() : 0,
            concessionBlockId: concessionBlockId,
            notes: notes || '',
            reversed: false, // Explicitly set to false (un-reverses if previously reversed)
            reversedAt: firebase.firestore.FieldValue.delete(), // Remove reversedAt field if it exists
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown'
        };
        
        // Save to Firestore with custom document ID
        // Use merge:true to allow FieldValue.delete() to work
        await firebase.firestore()
            .collection('checkins')
            .doc(docId)
            .set(checkinData, { merge: true });
        
        // Create transaction record if there's a payment
        if (checkinData.amountPaid > 0 && checkinData.paymentMethod) {
            try {
                await createCheckinTransaction(docId, student.id, checkinData.entryType, checkinData.amountPaid, checkinData.paymentMethod, checkinDate);
            } catch (transactionError) {
                console.error('Error creating transaction:', transactionError);
                // Don't fail the check-in if transaction creation fails
                showSnackbar('Check-in saved, but transaction creation failed', 'warning');
            }
        }
        
        // Close modal and show success
        closeCheckinModal();
        showSnackbar(`${getStudentFullName(student)} checked in successfully!`, 'success');
        
        // Reload today's check-ins to display the new one
        loadTodaysCheckins();
        
        // Reload today's transactions if there was a payment
        if (checkinData.amountPaid > 0 && typeof loadCheckinTransactions === 'function') {
            loadCheckinTransactions();
        }
        
    } catch (error) {
        console.error('Error saving check-in:', error);
        showSnackbar('Failed to save check-in. Please try again.', 'error');
    }
}

/**
 * Create a transaction record for a check-in with payment
 */
async function createCheckinTransaction(checkinId, studentId, entryType, amountPaid, paymentMethod, transactionDate) {
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
async function reverseTransaction(checkinId) {
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

