/**
 * payment-display.js - Display online payment validation status and UI
 */

import { selectOnlineTransaction, setSelectedOnlineTransaction } from './payment-selection.js';

/**
 * Display online payment validation status
 * Show success/warning messages based on available transactions
 */
export function displayOnlinePaymentStatus(transactions, checkinDate) {
    const messagesContainer = document.getElementById('online-payment-messages');
    const confirmBtn = document.getElementById('confirm-checkin-btn');
    
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    messagesContainer.style.display = 'none';
    
    if (transactions.length === 0) {
        // No unused online payments found
        messagesContainer.innerHTML = `
            <div class="online-payment-message warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No unused online payments found for this student within ±30 days.</span>
            </div>
        `;
        messagesContainer.style.display = 'block';
        confirmBtn.disabled = true;
        return;
    }
    
    // Find exact match (same date)
    const exactMatch = transactions.find(t => {
        // Don't consider current transaction as an auto-match
        if (t.isCurrent) return false;
        
        const tDate = new Date(t.classDate);
        tDate.setHours(0, 0, 0, 0);
        const cDate = new Date(checkinDate);
        cDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === cDate.getTime();
    });
    
    const currentTransactionId = window.checkinOnlinePayment?.currentTransactionId || null;
    
    // If we have a current transaction (editing mode), always show the list
    if (currentTransactionId) {
        messagesContainer.innerHTML = `
            <div class="online-payment-message ${exactMatch ? 'success' : 'warning'}">
                <i class="fas ${exactMatch ? ICONS.SUCCESS : ICONS.WARNING}"></i>
                <span>${exactMatch ? 'Found match for' : 'No match for'} ${formatDate(checkinDate)}. Available online payments:</span>
            </div>
        `;
        
        transactions.forEach(t => {
            const typeLabel = t.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
            const transactionDiv = document.createElement('div');
            transactionDiv.className = t.isCurrent ? 'online-payment-transaction current-transaction' : 'online-payment-transaction';
            
            // Use originalClassDate if it exists (means the date was changed), otherwise use classDate
            const displayDate = t.originalClassDate || t.classDate;
            
            if (t.isCurrent) {
                transactionDiv.innerHTML = `
                    <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                    <span class="current-badge">✓ Currently Using</span>
                `;
            } else {
                transactionDiv.innerHTML = `
                    <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                    <button type="button" class="btn-use-transaction" onclick="window.selectOnlineTransaction('${t.id}')">Use This</button>
                `;
            }
            
            messagesContainer.appendChild(transactionDiv);
        });
        
        messagesContainer.style.display = 'block';
        confirmBtn.disabled = false;
        return;
    }
    
    if (exactMatch) {
        // Exact match found (new check-in mode) - auto-select it
        const typeLabel = exactMatch.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        messagesContainer.innerHTML = `
            <div class="online-payment-message success">
                <i class="fas fa-check-circle"></i>
                <span>Using: ${typeLabel} for ${formatDate(exactMatch.classDate)} - ${formatCurrency(exactMatch.amount)}</span>
            </div>
        `;
        messagesContainer.style.display = 'block';
        setSelectedOnlineTransaction(exactMatch);
        confirmBtn.disabled = false;
        return;
    }
    
    // Different dates - show all available
    messagesContainer.innerHTML = `
        <div class="online-payment-message warning">
            <i class="fas fa-exclamation-triangle"></i>
            <span>⚠ No match for ${formatDate(checkinDate)}. Found online payments for:</span>
        </div>
    `;
    
    transactions.forEach(t => {
        const typeLabel = t.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        const transactionDiv = document.createElement('div');
        transactionDiv.className = t.isCurrent ? 'online-payment-transaction current-transaction' : 'online-payment-transaction';
        
        // Use originalClassDate if it exists (means the date was changed), otherwise use classDate
        const displayDate = t.originalClassDate || t.classDate;
        
        if (t.isCurrent) {
            transactionDiv.innerHTML = `
                <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                <span class="current-badge">✓ Currently Using</span>
            `;
        } else {
            transactionDiv.innerHTML = `
                <span class="transaction-info">${typeLabel} - ${formatDate(displayDate)} - ${formatCurrency(t.amount)}</span>
                <button type="button" class="btn-use-transaction" onclick="window.selectOnlineTransaction('${t.id}')">Use This</button>
            `;
        }
        
        messagesContainer.appendChild(transactionDiv);
    });
    
    messagesContainer.style.display = 'block';
    confirmBtn.disabled = true; // Disabled until they select one
}

/**
 * Show error message in the online payment section
 */
export function showOnlinePaymentError(message) {
    const messagesContainer = document.getElementById('online-payment-messages');
    const confirmBtn = document.getElementById('confirm-checkin-btn');
    
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = `
        <div class="online-payment-message error">
            <i class="fas fa-exclamation-circle"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    messagesContainer.style.display = 'block';
    confirmBtn.disabled = true;
}
