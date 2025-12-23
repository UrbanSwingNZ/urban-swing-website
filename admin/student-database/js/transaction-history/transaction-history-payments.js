/**
 * transaction-history-payments.js
 * Main coordinator for payment transaction history
 * Handles loading and displaying payment history (transactions)
 */

import { loadTransactionHistoryPayments } from './payments/payment-loader.js';
import { displayPaymentHistory } from './payments/payment-display.js';
import { editTransaction, confirmDeleteTransaction } from './payments/payment-actions.js';

/**
 * Load and display payment history for a student
 * Main entry point called by transaction history modal
 * @param {string} studentId - The student's ID
 */
async function loadAndDisplayPayments(studentId) {
    try {
        const transactions = await loadTransactionHistoryPayments(studentId);
        displayPaymentHistory(transactions);
    } catch (error) {
        console.error('Error in loadAndDisplayPayments:', error);
    }
}

// Expose functions to window for onclick handlers and external calls
window.loadTransactionHistoryPayments = loadAndDisplayPayments;
window.editTransaction = editTransaction;
window.confirmDeleteTransaction = confirmDeleteTransaction;
