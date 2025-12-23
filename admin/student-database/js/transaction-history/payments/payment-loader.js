/**
 * payment-loader.js
 * Handles loading payment transactions from Firestore
 */

// Store transactions for editing (shared with display and actions modules)
let currentPaymentTransactions = [];

/**
 * Load payment history for a student
 * @param {string} studentId - The student's ID
 * @returns {Promise<Array>} Array of payment transactions
 */
export async function loadTransactionHistoryPayments(studentId) {
    const contentEl = document.getElementById('payments-content');
    
    // Show loading
    contentEl.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading payment history...</p>';
    
    try {
        // Query transactions collection only (includes both concession purchases and casual entries)
        const transactionsSnapshot = await firebase.firestore()
            .collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        // Get all transactions for this student
        const allPayments = transactionsSnapshot.docs
            .filter(doc => {
                const data = doc.data();
                // Exclude reversed transactions
                return !data.reversed;
            })
            .map(doc => transformTransactionData(doc))
            .sort((a, b) => b.date - a.date);
        
        // Store transactions for editing
        currentPaymentTransactions = allPayments;
        
        return allPayments;
    } catch (error) {
        console.error('Error loading payment history:', error);
        contentEl.innerHTML = '<p class="text-error">Error loading payment history. Please try again.</p>';
        throw error;
    }
}

/**
 * Transform Firestore transaction document to display format
 * @param {object} doc - Firestore document
 * @returns {object} Transformed transaction data
 */
function transformTransactionData(doc) {
    const data = doc.data();
    
    // Determine transaction type and package name
    let transactionType, packageName, numberOfClasses;
    
    if (data.type === 'casual-entry') {
        transactionType = 'casual-entry';
        packageName = 'Casual Entry';
        numberOfClasses = 1;
    } else {
        // Concession purchase
        transactionType = 'concession-purchase';
        packageName = data.packageName;
        numberOfClasses = data.numberOfClasses;
    }
    
    return {
        id: doc.id,
        studentId: data.studentId,
        date: data.transactionDate?.toDate ? data.transactionDate.toDate() : new Date(data.transactionDate),
        type: transactionType,
        packageName: packageName,
        numberOfClasses: numberOfClasses,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        classDate: data.classDate?.toDate ? data.classDate.toDate() : null
    };
}

/**
 * Get current payment transactions
 * @returns {Array} Current payment transactions
 */
export function getCurrentPaymentTransactions() {
    return currentPaymentTransactions;
}

/**
 * Find a transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {object|null} Transaction or null
 */
export function findTransactionById(transactionId) {
    return currentPaymentTransactions.find(t => t.id === transactionId) || null;
}
