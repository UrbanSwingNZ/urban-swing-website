/**
 * checkin-loader.js - Load check-ins data with real-time Firestore listener
 */

import { displayTodaysCheckins } from './checkin-display.js';

let todaysCheckins = [];
let checkinsUnsubscribe = null;

/**
 * Set up real-time listener for check-ins
 */
function setupCheckinsListener() {
    // Unsubscribe from any existing listener
    if (checkinsUnsubscribe) {
        checkinsUnsubscribe();
    }
    
    // Get the selected check-in date (not today's actual date)
    const selectedDate = getSelectedCheckinDate();
    
    // Start and end of selected day
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Set up real-time listener for check-ins on selected date
    checkinsUnsubscribe = firebase.firestore()
        .collection('checkins')
        .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
        .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
        .orderBy('checkinDate', 'desc')
        .onSnapshot(async (snapshot) => {
            await processCheckinsSnapshot(snapshot);
        }, (error) => {
            console.error('Error in checkins listener:', error);
        });
}

/**
 * Process check-ins snapshot (from real-time listener)
 */
async function processCheckinsSnapshot(snapshot) {
    try {
        
        // Convert to array and check for reversed transactions
        const checkinPromises = snapshot.docs.map(async doc => {
            const data = doc.data();
            
            // Check if this check-in has a reversed transaction
            let hasReversedTransaction = false;
            if (data.amountPaid > 0) {
                try {
                    const transactionSnapshot = await firebase.firestore()
                        .collection('transactions')
                        .where('checkinId', '==', doc.id)
                        .get();
                    
                    if (!transactionSnapshot.empty) {
                        const transactionData = transactionSnapshot.docs[0].data();
                        hasReversedTransaction = transactionData.reversed || false;
                    }
                } catch (error) {
                    console.error('Error checking transaction status:', error);
                }
            }
            
            return {
                id: doc.id,
                studentId: data.studentId,
                studentName: data.studentName,
                timestamp: data.checkinDate.toDate(),
                entryType: data.entryType,
                paymentMethod: data.paymentMethod,
                freeEntryReason: data.freeEntryReason,
                balance: 0, // TODO: Get actual balance from student or concessionBlocks
                notes: data.notes,
                reversed: data.reversed || false, // Include reversed status
                hasReversedTransaction: hasReversedTransaction
            };
        });
        
        todaysCheckins = await Promise.all(checkinPromises);
        
        // Sort alphabetically by first name, then last name
        todaysCheckins.sort((a, b) => {
            const nameA = a.studentName.toLowerCase();
            const nameB = b.studentName.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        displayTodaysCheckins();
        
    } catch (error) {
        console.error('Error processing check-ins:', error);
        todaysCheckins = [];
        displayTodaysCheckins();
    }
}

/**
 * Public function to load check-ins - sets up real-time listener
 */
export async function loadTodaysCheckins() {
    setupCheckinsListener();
}

/**
 * Add a check-in to today's list
 * Note: With real-time listeners, this is rarely needed as Firestore updates automatically
 */
export function addCheckinToDisplay(checkin) {
    todaysCheckins.unshift(checkin); // Add to beginning of array
    displayTodaysCheckins(); // This will update the counts
}

/**
 * Get today's check-ins (for other modules to access)
 */
export function getTodaysCheckins() {
    return todaysCheckins;
}
