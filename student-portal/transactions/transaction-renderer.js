// Transaction Renderer - Handles UI rendering

class TransactionRenderer {
    constructor(transactionService) {
        this.transactionService = transactionService;
    }

    /**
     * Create a table row for a transaction
     */
    createRow(transaction) {
        const row = document.createElement('tr');
        
        // Add reversed class if transaction is reversed
        if (transaction.reversed) {
            row.classList.add('reversed');
        }
        
        // Date column
        const dateCell = document.createElement('td');
        dateCell.className = 'transaction-date';
        const date = transaction.transactionDate?.toDate() || new Date();
        dateCell.textContent = this.formatDate(date);
        row.appendChild(dateCell);
        
        // Type column with badges
        const typeCell = document.createElement('td');
        typeCell.className = 'transaction-type';
        
        // Add reversed badge if applicable
        if (transaction.reversed) {
            const reversedBadge = document.createElement('span');
            reversedBadge.className = 'type-badge reversed';
            reversedBadge.textContent = 'REVERSED';
            typeCell.appendChild(reversedBadge);
        }
        
        // Normalize transaction type and get display info
        const typeInfo = this.transactionService.normalizeType(transaction);
        
        // Add type badge
        const typeBadge = document.createElement('span');
        typeBadge.className = `type-badge ${typeInfo.badgeClass}`;
        typeBadge.textContent = typeInfo.typeName;
        typeCell.appendChild(typeBadge);
        
        row.appendChild(typeCell);
        
        // Class Date column (for casual transactions with online payment)
        const classDateCell = document.createElement('td');
        classDateCell.className = 'class-date';
        
        if (this.transactionService.isCasualOnline(transaction) && transaction.classDate) {
            const classDate = transaction.classDate?.toDate() || new Date();
            classDateCell.textContent = this.formatDate(classDate);
        } else {
            classDateCell.innerHTML = '<span class="na-text">N/A</span>';
        }
        
        row.appendChild(classDateCell);
        
        // Amount column
        const amountCell = document.createElement('td');
        amountCell.className = 'align-right amount';
        amountCell.textContent = `$${(transaction.amountPaid || 0).toFixed(2)}`;
        row.appendChild(amountCell);
        
        // Payment method column
        const paymentCell = document.createElement('td');
        paymentCell.className = 'payment-method';
        paymentCell.innerHTML = this.getPaymentBadgeHTML(transaction);
        row.appendChild(paymentCell);
        
        return row;
    }

    /**
     * Create a card for a transaction (mobile view)
     */
    createCard(transaction) {
        const card = document.createElement('div');
        card.className = 'transaction-card';
        
        // Add reversed class if transaction is reversed
        if (transaction.reversed) {
            card.classList.add('reversed');
        }
        
        // Format date
        const date = transaction.transactionDate?.toDate() || new Date();
        const formattedDate = this.formatDate(date);
        
        // Get type info
        const typeInfo = this.transactionService.normalizeType(transaction);
        
        // Build type badges HTML
        let typeBadgesHTML = '';
        if (transaction.reversed) {
            typeBadgesHTML += '<span class="type-badge reversed">REVERSED</span>';
        }
        typeBadgesHTML += `<span class="type-badge ${typeInfo.badgeClass}">${typeInfo.typeName}</span>`;
        
        // Get payment method badge
        const paymentBadgeHTML = this.getPaymentBadgeHTML(transaction);
        
        // Get class date for casual online purchases
        let classDateRow = '';
        if (this.transactionService.isCasualOnline(transaction) && transaction.classDate) {
            const classDate = transaction.classDate?.toDate() || new Date();
            const formattedClassDate = this.formatDate(classDate);
            classDateRow = `
                <div class="card-row">
                    <div class="card-label">Class Date</div>
                    <div class="card-value">${formattedClassDate}</div>
                </div>
            `;
        }
        
        // Build card HTML
        card.innerHTML = `
            <div class="card-header">
                <div class="card-date">${formattedDate}</div>
                <div class="card-amount">$${(transaction.amountPaid || 0).toFixed(2)}</div>
            </div>
            <div class="card-body">
                <div class="card-row">
                    <div class="card-label">Type</div>
                    <div class="card-value">${typeBadgesHTML}</div>
                </div>
                ${classDateRow}
                <div class="card-row">
                    <div class="card-label">Payment</div>
                    <div class="card-value">${paymentBadgeHTML}</div>
                </div>
            </div>
        `;
        
        return card;
    }

    /**
     * Get payment method badge HTML
     */
    getPaymentBadgeHTML(transaction) {
        // Check if online payment first (has stripeCustomerId)
        if (transaction.stripeCustomerId) {
            return '<span class="payment-badge online">Online</span>';
        }
        
        const paymentMethod = String(transaction.paymentMethod || '').toLowerCase();
        
        if (paymentMethod === 'cash') {
            return '<span class="payment-badge cash"><i class="fas fa-money-bill-wave"></i> Cash</span>';
        } else if (paymentMethod === 'eftpos') {
            return '<span class="payment-badge eftpos"><i class="fas fa-credit-card"></i> EFTPOS</span>';
        } else if (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') {
            return '<span class="payment-badge bank"><i class="fas fa-building-columns"></i> Bank Transfer</span>';
        } else {
            return '<span class="payment-badge unknown"><i class="fas fa-question-circle"></i> Unknown</span>';
        }
    }

    /**
     * Format date as DD/MM/YYYY
     */
    formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

// Export singleton instance
window.TransactionRenderer = new TransactionRenderer(window.TransactionService);
