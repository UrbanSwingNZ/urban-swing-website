/**
 * payment-validation.js - Validate and query online payment transactions
 */

import { displayOnlinePaymentStatus, showOnlinePaymentError } from './payment-display.js';
import { clearSelectedOnlineTransaction } from './payment-selection.js';

/**
 * Validate online payment for a student on a specific date
 * Query for valid transactions that can be used for check-in
 */
export async function validateOnlinePayment(studentId, checkinDate) {
    try {
        // Clear any previous selection
        clearSelectedOnlineTransaction();
        
        // Clear the current transaction ID UNLESS we're showing all transactions via the Change button
        // This prevents showing already-used transactions when changing dates or creating new check-ins,
        // but allows seeing the current transaction when clicking Change in edit mode
        if (!window.checkinOnlinePayment) window.checkinOnlinePayment = {};
        if (!window.checkinOnlinePayment.showingAllTransactions) {
            window.checkinOnlinePayment.currentTransactionId = null;
        }
        // Reset the flag
        window.checkinOnlinePayment.showingAllTransactions = false;
        
        // Format the check-in date for comparison
        const checkinDateStart = new Date(checkinDate);
        checkinDateStart.setHours(0, 0, 0, 0);
        
        const checkinDateEnd = new Date(checkinDate);
        checkinDateEnd.setHours(23, 59, 59, 999);
        
        // Define date range for search (±30 days from check-in date)
        const searchStartDate = new Date(checkinDate);
        searchStartDate.setDate(searchStartDate.getDate() - 30);
        
        const searchEndDate = new Date(checkinDate);
        searchEndDate.setDate(searchEndDate.getDate() + 30);
        
        // Query ALL transactions for this student (single where clause - no index needed)
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Get currently used transaction ID if editing
        const currentTransactionId = window.checkinOnlinePayment?.currentTransactionId || null;
        
        // Filter transactions in JavaScript to avoid needing a compound index
        const validTransactions = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const transactionDate = data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate);
            const classDate = data.classDate?.toDate ? data.classDate.toDate() : transactionDate;
            
            // Check if this transaction qualifies:
            // 1. Type is 'casual' or 'casual-student' (not 'concession-purchase')
            // 2. Payment method includes 'online' or has stripeCustomerId
            // 3. Not reversed
            // 4. Not already used for check-in (OR is the currently selected one when editing)
            // 5. Within ±30 days of check-in date (based on classDate, not transactionDate)
            
            const isCasualType = data.type === 'casual' || data.type === 'casual-student';
            const isOnlinePayment = data.paymentMethod === 'online' || data.stripeCustomerId;
            const isNotReversed = !data.reversed;
            const isNotUsed = !data.usedForCheckin || doc.id === currentTransactionId;
            const isInDateRange = classDate >= searchStartDate && classDate <= searchEndDate;
            
            if (isCasualType && isOnlinePayment && isNotReversed && isNotUsed && isInDateRange) {
                validTransactions.push({
                    id: doc.id,
                    date: transactionDate,
                    type: data.type,
                    amount: data.amountPaid || 0,
                    classDate: classDate,
                    originalClassDate: data.originalClassDate?.toDate ? data.originalClassDate.toDate() : null,
                    isCurrent: doc.id === currentTransactionId
                });
            }
        }
        
        // Sort by date (newest first)
        validTransactions.sort((a, b) => b.date - a.date);
        
        // Display the results
        displayOnlinePaymentStatus(validTransactions, checkinDateStart);
        
        return validTransactions;
        
    } catch (error) {
        console.error('Error validating online payment:', error);
        showOnlinePaymentError('Failed to validate online payment. Please try again.');
        return [];
    }
}

/**
 * Check if student has any available online payments
 * Hide/show the Online Payment radio button accordingly
 */
export async function checkStudentHasOnlinePayments(studentId) {
    try {
        const onlinePaymentRadio = document.getElementById('entry-online-payment');
        const onlinePaymentContainer = onlinePaymentRadio?.closest('label.radio-option');
        if (!onlinePaymentContainer) return;
        
        // Query all transactions for this student
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Check if any valid unused online payments exist
        let hasAvailablePayments = false;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            const isCasualType = data.type === 'casual' || data.type === 'casual-student';
            const isOnlinePayment = data.paymentMethod === 'online' || data.stripeCustomerId;
            const isNotReversed = !data.reversed;
            const isNotUsed = !data.usedForCheckin;
            
            if (isCasualType && isOnlinePayment && isNotReversed && isNotUsed) {
                hasAvailablePayments = true;
                break;
            }
        }
        
        // Show or hide the Online Payment option
        if (hasAvailablePayments) {
            onlinePaymentContainer.style.display = 'block';
        } else {
            onlinePaymentContainer.style.display = 'none';
            // If it was selected, deselect it
            const onlinePaymentRadio = document.getElementById('entry-online-payment');
            if (onlinePaymentRadio && onlinePaymentRadio.checked) {
                onlinePaymentRadio.checked = false;
            }
        }
    } catch (error) {
        console.error('Error checking for online payments:', error);
    }
}

/**
 * Check if student has a matching online payment for the current check-in date
 * If yes, auto-select the Online Payment radio and the transaction
 */
export async function checkAndAutoSelectOnlinePayment(studentId, checkinDate) {
    try {
        // Don't auto-select if we're editing an existing check-in
        if (isEditMode && isEditMode()) {
            return;
        }
        
        // Format the check-in date
        const checkinDateStart = new Date(checkinDate);
        checkinDateStart.setHours(0, 0, 0, 0);
        
        const checkinDateEnd = new Date(checkinDate);
        checkinDateEnd.setHours(23, 59, 59, 999);
        
        // Query transactions for this student
        const snapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Find exact match
        let exactMatch = null;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Only check valid casual/casual-student transactions
            const isCasualType = data.type === 'casual' || data.type === 'casual-student';
            const isOnlinePayment = data.paymentMethod === 'online' || data.stripeCustomerId;
            const isNotReversed = !data.reversed;
            const isNotUsed = !data.usedForCheckin;
            
            if (!isCasualType || !isOnlinePayment || !isNotReversed || !isNotUsed) {
                continue;
            }
            
            // Check for exact date match
            const classDate = data.classDate?.toDate ? data.classDate.toDate() : (data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate));
            classDate.setHours(0, 0, 0, 0);
            
            if (classDate.getTime() === checkinDateStart.getTime()) {
                exactMatch = {
                    id: doc.id,
                    ...data,
                    classDate: classDate
                };
                break;
            }
        }
        
        // If exact match found, auto-select Online Payment radio
        if (exactMatch) {
            const onlinePaymentRadio = document.getElementById('entry-online-payment');
            if (onlinePaymentRadio) {
                onlinePaymentRadio.checked = true;
                // Trigger the change event to update UI
                const event = new Event('change', { bubbles: true });
                onlinePaymentRadio.dispatchEvent(event);
            }
        }
    } catch (error) {
        console.error('Error checking for auto-select online payment:', error);
    }
}
