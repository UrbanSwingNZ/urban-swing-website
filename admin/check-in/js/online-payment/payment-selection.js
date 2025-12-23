/**
 * payment-selection.js - Select and manage online payment transactions for check-in
 */

import { validateOnlinePayment } from './payment-validation.js';

// Store the selected online transaction
let selectedOnlineTransaction = null;

/**
 * Select an online transaction for check-in
 * Store the transaction ID for later use
 */
export async function selectOnlineTransaction(transactionId) {
    try {
        // Fetch the full transaction document
        const doc = await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .get();
        
        if (!doc.exists) {
            showSnackbar('Transaction not found', 'error');
            return;
        }
        
        const data = doc.data();
        const transactionDate = data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate);
        const classDate = data.classDate?.toDate ? data.classDate.toDate() : transactionDate;
        
        selectedOnlineTransaction = {
            id: doc.id,
            date: transactionDate,
            type: data.type,
            amount: data.amountPaid || 0,
            classDate: classDate,
            paymentMethod: data.paymentMethod || 'online'
        };
        
        // Update the UI to show selected transaction
        const messagesContainer = document.getElementById('online-payment-messages');
        const confirmBtn = document.getElementById('confirm-checkin-btn');
        
        const typeLabel = selectedOnlineTransaction.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        messagesContainer.innerHTML = `
            <div class="online-payment-message success">
                <i class="fas fa-check-circle"></i>
                <span>✓ Selected: ${typeLabel} for ${formatDate(selectedOnlineTransaction.classDate)} - ${formatCurrency(selectedOnlineTransaction.amount)}</span>
                <button type="button" class="btn-change-transaction" onclick="window.showAllOnlineTransactions()">Change</button>
            </div>
        `;
        
        confirmBtn.disabled = false;
        showSnackbar('Transaction selected', 'success');
        
    } catch (error) {
        console.error('Error selecting transaction:', error);
        showSnackbar('Failed to select transaction', 'error');
    }
}

/**
 * Show all available transactions again (after one was selected)
 */
export async function showAllOnlineTransactions() {
    const student = getSelectedStudent();
    const checkinDate = getSelectedCheckinDate();
    
    if (student && checkinDate) {
        // Set flag to prevent clearing currentTransactionId
        if (!window.checkinOnlinePayment) window.checkinOnlinePayment = {};
        window.checkinOnlinePayment.showingAllTransactions = true;
        
        await validateOnlinePayment(student.id, checkinDate);
    }
}

/**
 * Get the currently selected online transaction
 */
export function getSelectedOnlineTransaction() {
    return selectedOnlineTransaction;
}

/**
 * Set the selected online transaction (used by display module for auto-selection)
 */
export function setSelectedOnlineTransaction(transaction) {
    selectedOnlineTransaction = transaction;
}

/**
 * Clear the selected online transaction
 */
export function clearSelectedOnlineTransaction() {
    selectedOnlineTransaction = null;
}

/**
 * Update transaction's classDate field (if needed)
 * This allows the admin to correct the date if the student paid for a different class
 * Preserves the original classDate in originalClassDate field
 */
export async function updateTransactionDate(transactionId, newDate) {
    try {
        // First, get the current transaction to check if we need to preserve originalClassDate
        const doc = await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .get();
        
        if (!doc.exists) {
            console.error('Transaction not found:', transactionId);
            return false;
        }
        
        const data = doc.data();
        const updateData = {
            classDate: firebase.firestore.Timestamp.fromDate(newDate)
        };
        
        // Only set originalClassDate if it doesn't already exist
        // This preserves the very first classDate, not the most recent one
        if (!data.originalClassDate) {
            updateData.originalClassDate = data.classDate || firebase.firestore.Timestamp.fromDate(newDate);
        }
        
        await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .update(updateData);
        
        console.log('Transaction date updated:', transactionId);
        return true;
        
    } catch (error) {
        console.error('Error updating transaction date:', error);
        return false;
    }
}
