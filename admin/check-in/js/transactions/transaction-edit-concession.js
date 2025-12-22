/**
 * transaction-edit-concession.js
 * Handles editing concession purchase transactions
 */

/**
 * Clean up editing state when modal closes
 * Call this function when the purchase modal is closed
 */
export function cleanupConcessionEditState() {
    delete window.editingTransactionId;
    delete window.editingStudentId;
}

/**
 * Edit a concession purchase transaction
 * @param {Object} transaction - Transaction data
 * @param {Object} transactionData - Full transaction data from Firestore
 */
export async function editConcessionPurchaseTransaction(transaction, transactionData) {
    // Clean up any previous editing state first
    cleanupConcessionEditState();
    
    // Open the purchase modal in edit mode
    if (typeof openPurchaseConcessionsModal === 'function') {
        // Open modal without student lookup
        await openPurchaseConcessionsModal(null, null, null, null);
    }
    
    // Wait for modal to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Manually populate student info
    document.getElementById('purchase-student-name').textContent = transaction.studentName;
    const emailElement = document.getElementById('purchase-student-email');
    if (emailElement) {
        emailElement.style.display = 'none';
    }
    document.getElementById('purchase-student-info').style.display = 'block';
    
    // Pre-populate the form fields
    const datePicker = document.getElementById('purchase-date-picker');
    const packageSelect = document.getElementById('purchase-package-select');
    const paymentSelect = document.getElementById('purchase-payment-select');
    
    if (datePicker && transaction.date) {
        // Use the DatePicker's setDate method to properly set the date
        if (window.purchaseDatePicker) {
            window.purchaseDatePicker.setDate(transaction.date);
        } else {
            // Fallback: manually set the value if DatePicker instance not available
            const day = transaction.date.getDate();
            const month = String(transaction.date.getMonth() + 1).padStart(2, '0');
            const year = transaction.date.getFullYear();
            const dateStr = `${day}/${month}/${year}`;
            datePicker.value = dateStr;
        }
        // Trigger button update since we're setting the value
        if (typeof updatePurchaseButton === 'function') {
            updatePurchaseButton();
        }
    }
    
    if (packageSelect && transactionData.packageId) {
        packageSelect.value = transactionData.packageId;
        // Trigger change event to update total
        packageSelect.dispatchEvent(new Event('change'));
    }
    
    if (paymentSelect && transaction.paymentMethod) {
        let paymentValue = transaction.paymentMethod.toLowerCase();
        // Handle 'stripe' payment method -> 'online'
        if (paymentValue === 'stripe') {
            paymentValue = 'online';
        }
        paymentSelect.value = paymentValue;
    }
    
    // Change the modal title to "Edit Transaction"
    const modalTitle = document.querySelector('#purchase-concessions-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Transaction';
    }
    
    // Change the button text to "Update Transaction"
    const confirmBtn = document.getElementById('confirm-purchase-concessions-btn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-save"></i> Update Transaction';
    }
    
    // Store transaction details for update
    window.editingTransactionId = transaction.id;
    window.editingStudentId = transaction.studentId;
    
    // Override the confirm button to update instead of create
    if (confirmBtn) {
        // Remove existing listeners and add new one
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        newBtn.addEventListener('click', async () => {
            await updateConcessionPurchase();
        });
    }
}

/**
 * Update an existing concession purchase transaction
 */
async function updateConcessionPurchase() {
    const transactionId = window.editingTransactionId;
    const studentId = window.editingStudentId;
    const packageId = document.getElementById('purchase-package-select').value;
    const paymentMethod = document.getElementById('purchase-payment-select').value;
    const purchaseDate = document.getElementById('purchase-date-picker').value;
    
    if (!packageId || !paymentMethod || !purchaseDate) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        // Convert payment method for storage (online -> stripe)
        let dbPaymentMethod = paymentMethod;
        if (paymentMethod === 'online') {
            dbPaymentMethod = 'stripe';
        }
        
        // Get package details to update amount
        const packageDoc = await firebase.firestore()
            .collection('concessionPackages')
            .doc(packageId)
            .get();
        
        if (!packageDoc.exists) {
            showSnackbar('Package not found', 'error');
            return;
        }
        
        const packageData = packageDoc.data();
        
        // Parse date from d/mm/yyyy format
        const [day, month, year] = purchaseDate.split('/').map(Number);
        const parsedDate = new Date(year, month - 1, day);
        // Set to noon to avoid timezone boundary issues
        parsedDate.setHours(12, 0, 0, 0);
        
        // Update transaction
        await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .update({
                packageId: packageId,
                packageName: packageData.name,
                numberOfClasses: packageData.numberOfClasses,
                paymentMethod: dbPaymentMethod,
                transactionDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                amountPaid: packageData.price,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Find and update the associated concession block
        const blocksSnapshot = await firebase.firestore()
            .collection('concessionBlocks')
            .where('transactionId', '==', transactionId)
            .get();
        
        if (!blocksSnapshot.empty) {
            const blockDoc = blocksSnapshot.docs[0];
            const blockData = blockDoc.data();
            
            // Calculate new expiry date
            const newExpiryDate = new Date(parsedDate.getTime());
            newExpiryDate.setMonth(newExpiryDate.getMonth() + packageData.expiryMonths);
            
            // Calculate the difference in classes to update student balance
            const oldQuantity = blockData.originalQuantity;
            const usedClasses = oldQuantity - blockData.remainingQuantity;
            const newQuantity = packageData.numberOfClasses;
            const balanceDiff = newQuantity - oldQuantity;
            
            // Update the concession block
            await firebase.firestore()
                .collection('concessionBlocks')
                .doc(blockDoc.id)
                .update({
                    packageId: packageId,
                    packageName: packageData.name,
                    originalQuantity: newQuantity,
                    remainingQuantity: newQuantity - usedClasses,
                    purchaseDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                    expiryDate: firebase.firestore.Timestamp.fromDate(newExpiryDate),
                    price: packageData.price,
                    paymentMethod: dbPaymentMethod,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Update student's concession balance if the number of classes changed
            if (balanceDiff !== 0) {
                await firebase.firestore()
                    .collection('students')
                    .doc(studentId)
                    .update({
                        concessionBalance: firebase.firestore.FieldValue.increment(balanceDiff),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }
        }
        
        // Close modal
        if (typeof closePurchaseConcessionsModal === 'function') {
            closePurchaseConcessionsModal();
        }
        
        // Clean up
        cleanupConcessionEditState();
        
        showSnackbar('Transaction updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        showSnackbar('Error updating transaction: ' + error.message, 'error');
        
        // Clean up even on error
        cleanupConcessionEditState();
    }
}
