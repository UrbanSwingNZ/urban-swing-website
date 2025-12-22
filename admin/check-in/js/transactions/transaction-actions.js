/**
 * transaction-actions.js
 * Coordinator for transaction actions - delegates to specialized modules
 */

import { toggleCheckinTransactionInvoiced } from './transaction-invoice.js';
import { confirmDeleteCheckinTransaction } from './transaction-deletion.js';
import { editCasualTransaction } from './transaction-edit-casual.js';
import { editConcessionPurchaseTransaction } from './transaction-edit-concession.js';

// Re-export functions for external use
export { toggleCheckinTransactionInvoiced, confirmDeleteCheckinTransaction };

/**
 * Edit a transaction - routes to appropriate editor based on transaction type
 * @param {Object} transaction - Transaction data
 */
export async function editCheckinTransaction(transaction) {
    if (transaction.type === 'concession-purchase') {
        // Fetch the full transaction data from Firestore to get packageId
        try {
            const transactionDoc = await firebase.firestore()
                .collection('transactions')
                .doc(transaction.id)
                .get();
            
            if (!transactionDoc.exists) {
                showSnackbar('Transaction not found', 'error');
                return;
            }
            
            const transactionData = transactionDoc.data();
            
            // Open purchase concessions modal for editing
            await editConcessionPurchaseTransaction(transaction, transactionData);
        } catch (error) {
            console.error('Error fetching transaction data:', error);
            showSnackbar('Error opening edit modal', 'error');
        }
    } else if (transaction.type === 'casual' || transaction.type === 'casual-student') {
        // Open casual entry modal for editing
        await editCasualTransaction(transaction);
    } else {
        showSnackbar('Cannot edit this transaction type', 'error');
    }
}

