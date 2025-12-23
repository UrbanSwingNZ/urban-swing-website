/**
 * checkin-transactions.js
 * Main coordinator for check-in transactions functionality
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { setupTransactionsListener, unsubscribeTransactionsListener } from './transactions/transaction-loader.js';
import { displayCheckinTransactions } from './transactions/transaction-display.js';
import { toggleCheckinTransactionInvoiced, editCheckinTransaction, confirmDeleteCheckinTransaction, restoreCheckinTransaction } from './transactions/transaction-actions.js';

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
        
        // Filter out reversed transactions by default
        const showReversed = document.getElementById('show-reversed-checkins-toggle')?.checked || false;
        const transactionsToDisplay = showReversed 
            ? checkinTransactions 
            : checkinTransactions.filter(t => !t.reversed);
        
        // Sort by date descending
        transactionsToDisplay.sort((a, b) => b.date - a.date);
        
        displayCheckinTransactions(transactionsToDisplay);
    });
}

/**
 * Refresh transactions display (called when toggle changes)
 */
function refreshCheckinTransactionsDisplay() {
    const showReversed = document.getElementById('show-reversed-checkins-toggle')?.checked || false;
    const transactionsToDisplay = showReversed 
        ? checkinTransactions 
        : checkinTransactions.filter(t => !t.reversed);
    
    transactionsToDisplay.sort((a, b) => b.date - a.date);
    displayCheckinTransactions(transactionsToDisplay);
}

// Expose functions globally for use in other modules
window.loadCheckinTransactions = loadCheckinTransactions;
window.toggleCheckinTransactionInvoiced = toggleCheckinTransactionInvoiced;
window.editCheckinTransaction = editCheckinTransaction;
window.confirmDeleteCheckinTransaction = confirmDeleteCheckinTransaction;
window.restoreCheckinTransaction = restoreCheckinTransaction;
window.refreshCheckinTransactionsDisplay = refreshCheckinTransactionsDisplay;
