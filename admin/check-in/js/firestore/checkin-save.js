/**
 * checkin-save.js - Main save operations for check-ins
 * 
 * This module handles the core logic for creating and updating check-ins in Firestore,
 * including complex entry type transitions, concession block management, and online payment linking.
 */

import { createCheckinTransaction, reverseTransaction } from './checkin-transactions.js';

/**
 * Save check-in to Firestore
 */
export async function saveCheckinToFirestore(student, entryType, paymentMethod, freeEntryReason, notes) {
    try {
        // Get the selected check-in date from date picker
        const checkinDate = window.getSelectedCheckinDate(); // Returns Date object
        
        // Format date as YYYY-MM-DD for document ID (avoid timezone issues)
        const year = checkinDate.getFullYear();
        const month = String(checkinDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkinDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Create document ID: checkin-YYYY-MM-DD-firstname-lastname
        const firstName = student.firstName.toLowerCase().replace(/\s+/g, '-');
        const lastName = student.lastName.toLowerCase().replace(/\s+/g, '-');
        const docId = `checkin-${dateStr}-${firstName}-${lastName}`;
        
        let concessionBlockId = null;
        let onlineTransactionId = null;
        let actualEntryType = entryType;
        let actualAmountPaid = 0;
        let actualPaymentMethod = paymentMethod;
        
        // Handle online payment
        if (entryType === 'online-payment') {
            const selectedTransaction = window.getSelectedOnlineTransaction();
            if (!selectedTransaction) {
                window.showSnackbar('No online transaction selected', 'error');
                return;
            }
            
            // Use the transaction details
            onlineTransactionId = selectedTransaction.id;
            actualEntryType = selectedTransaction.type; // 'casual' or 'casual-student'
            actualAmountPaid = selectedTransaction.amount;
            actualPaymentMethod = 'online';
            
            // Update the transaction's classDate if needed
            const transactionDate = new Date(selectedTransaction.classDate);
            transactionDate.setHours(0, 0, 0, 0);
            const checkDate = new Date(checkinDate);
            checkDate.setHours(0, 0, 0, 0);
            
            if (transactionDate.getTime() !== checkDate.getTime()) {
                await updateTransactionDate(onlineTransactionId, checkinDate);
            }
        } else {
            // Regular entry types
            actualAmountPaid = entryType === 'casual' ? window.getCurrentCasualPrice() : 
                              entryType === 'casual-student' ? window.getCurrentStudentPrice() : 0;
        }
        
        // Check if this student already has a check-in for this date
        const existingCheckin = await firebase.firestore()
            .collection('checkins')
            .doc(docId)
            .get();
        
        // Prevent duplicate check-ins (unless we're editing)
        if (existingCheckin.exists && !window.isEditMode()) {
            const existingData = existingCheckin.data();
            
            // If the existing check-in is not reversed, it's a duplicate
            if (!existingData.reversed) {
                window.showSnackbar(`${window.getStudentFullName(student)} is already checked in for this date.`, 'error');
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
                    const block = await window.getNextAvailableBlock(student.id, true);
                    if (!block) {
                        window.showSnackbar('No concession entries available for this student', 'error');
                        return;
                    }
                    await window.useBlockEntry(block.id);
                    concessionBlockId = block.id;
                }
                // If it's an online payment, mark the transaction as used (handled after save)
            } else {
                // Normal update of existing active check-in
                const hadPayment = existingData.amountPaid > 0;
                const hadOnlineTransaction = existingData.onlineTransactionId;
                const willHavePayment = (actualEntryType === 'casual' || actualEntryType === 'casual-student');
                const willHaveOnlineTransaction = onlineTransactionId;
                
                // Handle transition FROM one online transaction TO a different online transaction
                if (hadOnlineTransaction && willHaveOnlineTransaction && hadOnlineTransaction !== willHaveOnlineTransaction) {
                    // Un-link the old online transaction and restore its original classDate
                    try {
                        const transactionDoc = await firebase.firestore()
                            .collection('transactions')
                            .doc(existingData.onlineTransactionId)
                            .get();
                        
                        if (transactionDoc.exists) {
                            const transactionData = transactionDoc.data();
                            const updateData = {
                                usedForCheckin: false,
                                checkinId: firebase.firestore.FieldValue.delete()
                            };
                            
                            // Restore original classDate if it exists
                            if (transactionData.originalClassDate) {
                                updateData.classDate = transactionData.originalClassDate;
                                updateData.originalClassDate = firebase.firestore.FieldValue.delete();
                            }
                            
                            await firebase.firestore()
                                .collection('transactions')
                                .doc(existingData.onlineTransactionId)
                                .update(updateData);
                        }
                    } catch (error) {
                        console.error('Error un-linking old online transaction:', error);
                    }
                }
                
                // Handle transition FROM online payment TO something else
                if (hadOnlineTransaction && !willHaveOnlineTransaction) {
                    // Un-link the old online transaction and restore its original classDate
                    try {
                        const transactionDoc = await firebase.firestore()
                            .collection('transactions')
                            .doc(existingData.onlineTransactionId)
                            .get();
                        
                        if (transactionDoc.exists) {
                            const transactionData = transactionDoc.data();
                            const updateData = {
                                usedForCheckin: false,
                                checkinId: firebase.firestore.FieldValue.delete()
                            };
                            
                            // Restore original classDate if it exists
                            if (transactionData.originalClassDate) {
                                updateData.classDate = transactionData.originalClassDate;
                                updateData.originalClassDate = firebase.firestore.FieldValue.delete();
                            }
                            
                            await firebase.firestore()
                                .collection('transactions')
                                .doc(existingData.onlineTransactionId)
                                .update(updateData);
                        }
                    } catch (error) {
                        console.error('Error un-linking online transaction:', error);
                    }
                }
                
                // Handle transition FROM in-person payment TO online or free
                if (hadPayment && !willHavePayment && !hadOnlineTransaction) {
                    // Changing FROM paid TO free - reverse the transaction
                    try {
                        await reverseTransaction(docId);
                    } catch (error) {
                        console.error('Error reversing transaction on update:', error);
                    }
                }
                
                // Handle transition TO online payment FROM something else
                // (Online transaction will be marked as used after save)
                
                // If they're changing FROM concession TO another type, restore the concession
                if (existingData.entryType === 'concession' && entryType !== 'concession' && existingData.concessionBlockId) {
                    await window.restoreBlockEntry(existingData.concessionBlockId);
                }
                // If they're changing FROM another type TO concession, use a concession
                else if (existingData.entryType !== 'concession' && entryType === 'concession') {
                    const block = await window.getNextAvailableBlock(student.id, true);
                    if (!block) {
                        window.showSnackbar('No concession entries available for this student', 'error');
                        return;
                    }
                    await window.useBlockEntry(block.id);
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
                const block = await window.getNextAvailableBlock(student.id, true); // Allow expired
                
                if (!block) {
                    window.showSnackbar('No concession entries available for this student', 'error');
                    return;
                }
                
                // Use one entry from the block
                await window.useBlockEntry(block.id);
                concessionBlockId = block.id;
            }
        }
        
        // Build check-in data
        const checkinData = {
            studentId: student.id,
            studentName: window.getStudentFullName(student),
            checkinDate: firebase.firestore.Timestamp.fromDate(checkinDate),
            entryType: actualEntryType,
            paymentMethod: actualPaymentMethod,
            freeEntryReason: entryType === 'free' ? freeEntryReason : null,
            amountPaid: actualAmountPaid,
            concessionBlockId: concessionBlockId,
            onlineTransactionId: onlineTransactionId,
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
        
        // If using online payment, mark the transaction as used
        if (onlineTransactionId) {
            try {
                await firebase.firestore()
                    .collection('transactions')
                    .doc(onlineTransactionId)
                    .update({
                        usedForCheckin: true,
                        checkinId: docId,
                        classDate: firebase.firestore.Timestamp.fromDate(checkinDate)
                    });
            } catch (transactionError) {
                console.error('Error updating online transaction:', transactionError);
                showSnackbar('Check-in saved, but transaction update failed', 'warning');
            }
        }
        // Create transaction record if there's an in-person payment (not online)
        else if (checkinData.amountPaid > 0 && checkinData.paymentMethod && checkinData.paymentMethod !== 'online') {
            try {
                await createCheckinTransaction(docId, student.id, checkinData.entryType, checkinData.amountPaid, checkinData.paymentMethod, checkinDate);
            } catch (transactionError) {
                console.error('Error creating transaction:', transactionError);
                // Don't fail the check-in if transaction creation fails
                showSnackbar('Check-in saved, but transaction creation failed', 'warning');
            }
        }
        
        // Close modal and show success
        window.closeCheckinModal();
        window.showSnackbar(`${window.getStudentFullName(student)} checked in successfully!`, 'success');
        
        // Clear the selected online transaction
        if (typeof window.clearSelectedOnlineTransaction === 'function') {
            window.clearSelectedOnlineTransaction();
        }
        
        // Reload today's check-ins to display the new one
        window.loadTodaysCheckins();
        
        // Reload today's transactions if there was a payment
        if (checkinData.amountPaid > 0 && typeof window.loadCheckinTransactions === 'function') {
            window.loadCheckinTransactions();
        }
        
    } catch (error) {
        console.error('Error saving check-in:', error);
        window.showSnackbar('Failed to save check-in. Please try again.', 'error');
    }
}

/**
 * Update transaction date (used when linking online payment to different date)
 */
async function updateTransactionDate(transactionId, newDate) {
    try {
        await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .update({
                classDate: firebase.firestore.Timestamp.fromDate(newDate)
            });
    } catch (error) {
        console.error('Error updating transaction date:', error);
        throw error;
    }
}
