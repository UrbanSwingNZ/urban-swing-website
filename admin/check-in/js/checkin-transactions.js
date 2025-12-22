/**
 * checkin-transactions.js
 * Main coordinator for check-in transactions functionality
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { setupTransactionsListener, unsubscribeTransactionsListener } from './transactions/transaction-loader.js';
import { displayCheckinTransactions } from './transactions/transaction-display.js';
import { toggleCheckinTransactionInvoiced, editCheckinTransaction, confirmDeleteCheckinTransaction } from './transactions/transaction-actions.js';

let checkinTransactions = [];

/**
 * Public function to load transactions - sets up real-time listener
 */
async function loadCheckinTransactions() {
    // Get the selected check-in date
    const selectedDate = getSelectedCheckinDate();
    
    // Set up real-time listener
    setupTransactionsListener(selectedDate, (transactions) => {
        checkinTransactions = transactions;
        
        // Show all transactions including reversed ones
        // Sort by date descending
        checkinTransactions.sort((a, b) => b.date - a.date);
        
        displayCheckinTransactions(checkinTransactions);
    });
}

/**
 * Refresh transactions display (called when toggle changes)
 */
function refreshCheckinTransactionsDisplay() {
    // Show all transactions including reversed ones
    checkinTransactions.sort((a, b) => b.date - a.date);
    displayCheckinTransactions(checkinTransactions);
}

// Expose functions globally for use in other modules
window.loadCheckinTransactions = loadCheckinTransactions;
window.toggleCheckinTransactionInvoiced = toggleCheckinTransactionInvoiced;
window.editCheckinTransaction = editCheckinTransaction;
window.confirmDeleteCheckinTransaction = confirmDeleteCheckinTransaction;
window.refreshCheckinTransactionsDisplay = refreshCheckinTransactionsDisplay;
