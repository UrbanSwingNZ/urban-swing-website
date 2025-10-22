/**
 * purchase-modal.js - Purchase concessions modal
 * Handles concession purchase UI and logic
 */

/**
 * Open purchase modal
 */
function openPurchaseModal() {
    const modal = document.getElementById('purchase-modal');
    
    // Reset form
    document.getElementById('package-select').value = '';
    document.getElementById('purchase-payment-method').value = '';
    document.getElementById('purchase-amount').textContent = '$0.00';
    document.getElementById('confirm-purchase-btn').disabled = true;
    
    modal.style.display = 'flex';
}

/**
 * Close purchase modal
 */
function closePurchaseModal() {
    const modal = document.getElementById('purchase-modal');
    modal.style.display = 'none';
}

/**
 * Initialize purchase modal listeners
 */
function initializePurchaseModalListeners() {
    const packageSelect = document.getElementById('package-select');
    const paymentSelect = document.getElementById('purchase-payment-method');
    const confirmBtn = document.getElementById('confirm-purchase-btn');
    const amountDisplay = document.getElementById('purchase-amount');
    
    // Package selection updates amount
    packageSelect.addEventListener('change', () => {
        const value = packageSelect.value;
        let amount = 0;
        
        if (value === '5-block') {
            amount = 60;
        } else if (value === '10-block') {
            amount = 100;
        }
        
        amountDisplay.textContent = `$${amount.toFixed(2)}`;
        updatePurchaseButton();
    });
    
    // Payment method selection
    paymentSelect.addEventListener('change', updatePurchaseButton);
    
    // Confirm purchase button
    confirmBtn.addEventListener('click', handlePurchaseSubmit);
    
    // Close modal when clicking outside
    document.getElementById('purchase-modal').addEventListener('click', (e) => {
        if (e.target.id === 'purchase-modal') {
            closePurchaseModal();
        }
    });
}

/**
 * Update purchase button state
 */
function updatePurchaseButton() {
    const packageValue = document.getElementById('package-select').value;
    const paymentValue = document.getElementById('purchase-payment-method').value;
    const confirmBtn = document.getElementById('confirm-purchase-btn');
    
    confirmBtn.disabled = !packageValue || !paymentValue;
}

/**
 * Handle purchase submission
 */
function handlePurchaseSubmit() {
    if (!selectedStudent) return;
    
    const packageValue = document.getElementById('package-select').value;
    const paymentMethod = document.getElementById('purchase-payment-method').value;
    
    if (!packageValue || !paymentMethod) {
        showError('Please select a package and payment method');
        return;
    }
    
    // TODO: Submit to Firestore when backend is ready
    console.log('Purchase data:', {
        student: selectedStudent,
        package: packageValue,
        paymentMethod,
        timestamp: new Date()
    });
    
    // Close purchase modal
    closePurchaseModal();
    
    // TODO: Save purchase to Firestore and update student's concession balance when backend is implemented
    showSnackbar('Purchase recorded successfully!', 'success');
    
    // Update concession info in main modal
    updateConcessionInfo(selectedStudent);
}
