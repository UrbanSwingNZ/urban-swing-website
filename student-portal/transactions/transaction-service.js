// Transaction Service - Handles data loading and processing

class TransactionService {
    constructor() {
        this.allTransactions = [];
    }

    /**
     * Load transactions for a specific student
     */
    async loadTransactions(studentId) {
        try {
            // Query all transactions for this student
            const transactionsSnapshot = await window.db.collection('transactions')
                .where('studentId', '==', studentId)
                .get();
            
            const transactions = [];
            transactionsSnapshot.forEach(doc => {
                const data = doc.data();
                // Filter for only financial transactions (amountPaid > 0)
                if (data.amountPaid && data.amountPaid > 0) {
                    transactions.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            // Sort by date descending (most recent first)
            transactions.sort((a, b) => {
                const dateA = a.transactionDate?.toDate() || new Date(0);
                const dateB = b.transactionDate?.toDate() || new Date(0);
                return dateB - dateA;
            });
            
            console.log(`Found ${transactions.length} transactions`);
            
            this.allTransactions = transactions;
            return transactions;
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            throw error;
        }
    }

    /**
     * Get all transactions
     */
    getAll() {
        return this.allTransactions;
    }

    /**
     * Get paginated transactions
     */
    getPaginated(page, itemsPerPage) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, this.allTransactions.length);
        return this.allTransactions.slice(startIndex, endIndex);
    }

    /**
     * Get total count
     */
    getCount() {
        return this.allTransactions.length;
    }

    /**
     * Calculate total pages
     */
    getTotalPages(itemsPerPage) {
        return Math.ceil(this.allTransactions.length / itemsPerPage);
    }

    /**
     * Normalize transaction type and get display info
     */
    normalizeType(transaction) {
        let transactionType = transaction.type || 'concession-purchase';
        let typeName;
        let badgeClass;
        
        // Handle both old and new type names for concession purchases
        if (transactionType === 'concession-purchase' || transactionType === 'purchase') {
            transactionType = 'concession-purchase';
            typeName = 'Concession Purchase';
            badgeClass = 'concession';
        } else if (transactionType === 'concession-gift') {
            typeName = 'Gifted Concessions';
            badgeClass = 'gift';
        } else if (transactionType === 'casual-entry' || transactionType === 'entry' || transactionType === 'casual' || transactionType === 'casual-student') {
            // Check the entryType field to distinguish casual vs casual-student
            if (transaction.entryType === 'casual-student' || transactionType === 'casual-student') {
                transactionType = 'casual-student';
                typeName = 'Casual Student';
                badgeClass = 'casual-student';
            } else {
                transactionType = 'casual';
                typeName = 'Casual Entry';
                badgeClass = 'casual';
            }
        } else {
            typeName = 'Transaction';
            badgeClass = 'other';
        }
        
        return { type: transactionType, typeName, badgeClass };
    }

    /**
     * Check if transaction is casual online purchase
     */
    isCasualOnline(transaction) {
        const isCasual = ['casual', 'casual-student', 'casual-entry'].includes(transaction.type);
        const isOnline = transaction.stripeCustomerId || transaction.paymentMethod === 'online';
        return isCasual && isOnline;
    }
}

// Export singleton instance
window.TransactionService = new TransactionService();
