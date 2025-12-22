/**
 * transaction-actions.js
 * Handles transaction actions: edit, delete (reverse), and invoice toggle
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { formatCurrency } from '/js/utils/index.js';

/**
 * Toggle invoiced status for a transaction
 * @param {Object} transaction - Transaction data
 */
export async function toggleCheckinTransactionInvoiced(transaction) {
    try {
        const newStatus = !transaction.invoiced;
        
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                invoiced: newStatus
            });
        
        // Update local data
        transaction.invoiced = newStatus;
        
        // Update the button in the table
        const btn = document.querySelector(`.btn-invoice[data-id="${transaction.id}"]`);
        if (btn) {
            if (newStatus) {
                btn.classList.add('invoiced');
                btn.title = 'Mark as Not Invoiced';
            } else {
                btn.classList.remove('invoiced');
                btn.title = 'Mark as Invoiced';
            }
        }
        
        showSnackbar(`Transaction marked as ${newStatus ? 'invoiced' : 'not invoiced'}`, 'success');
        
    } catch (error) {
        console.error('Error toggling invoiced status:', error);
        showSnackbar('Error updating invoice status: ' + error.message, 'error');
    }
}

/**
 * Edit a transaction
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
        // Get checkinId - we need to fetch it from the checkins collection
        let checkinId = null;
        try {
            const checkinSnapshot = await firebase.firestore()
                .collection('checkins')
                .where('studentId', '==', transaction.studentId)
                .where('checkinDate', '==', firebase.firestore.Timestamp.fromDate(transaction.date))
                .get();
            
            if (!checkinSnapshot.empty) {
                checkinId = checkinSnapshot.docs[0].id;
            }
        } catch (error) {
            console.error('Error fetching checkin:', error);
        }
        
        // Open casual entry modal for editing with callback to reload transactions
        await openCasualEntryModal(
            transaction.id,                    // transactionId
            checkinId,                         // checkinId
            transaction.studentId,             // studentId
            transaction.studentName,           // studentName
            transaction.date,                  // entryDate
            transaction.paymentMethod,         // paymentMethod
            transaction.amount,                // amount
            async () => {                      // callback
                // Reload transactions after update
                if (typeof window.loadCheckinTransactions === 'function') {
                    await window.loadCheckinTransactions();
                }
            },
            null                               // parentModalId
        );
    } else {
        showSnackbar('Cannot edit this transaction type', 'error');
    }
}

/**
 * Confirm transaction deletion
 * @param {Object} transaction - Transaction data
 */
export function confirmDeleteCheckinTransaction(transaction) {
    // Format date as d/mm/yyyy
    const day = transaction.date.getDate();
    const month = transaction.date.getMonth() + 1;
    const year = transaction.date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    // Create and show delete confirmation modal
    const deleteModal = new ConfirmationModal({
        title: 'Delete Transaction',
        message: `
            <p>Are you sure you want to delete this transaction?</p>
            <div class="student-info-delete">
                <strong>${transaction.studentName}</strong><br>
                ${formattedDate} · ${formatCurrency(transaction.amount)}
            </div>
            <p class="text-muted" style="margin-top: 15px;">This action cannot be undone.</p>
        `,
        icon: 'fas fa-trash',
        variant: 'danger',
        confirmText: 'Delete Transaction',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            await deleteCheckinTransaction(transaction);
        }
    });
    
    deleteModal.show();
}

/**
 * Delete a transaction (mark as reversed)
 * @param {Object} transaction - Transaction data
 */
async function deleteCheckinTransaction(transaction) {
    try {
        // Mark transaction as reversed
        await firebase.firestore()
            .collection(transaction.collection)
            .doc(transaction.id)
            .update({
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // If this is a concession purchase, delete the associated concession block and adjust student balance
        if (transaction.type === 'concession-purchase') {
            // Find the associated concession block
            const blocksSnapshot = await firebase.firestore()
                .collection('concessionBlocks')
                .where('transactionId', '==', transaction.id)
                .get();
            
            if (!blocksSnapshot.empty) {
                const blockDoc = blocksSnapshot.docs[0];
                const blockData = blockDoc.data();
                
                // Calculate remaining classes that were unused
                const unusedClasses = blockData.remainingQuantity;
                
                // Delete the concession block
                await firebase.firestore()
                    .collection('concessionBlocks')
                    .doc(blockDoc.id)
                    .delete();
                
                // Adjust student's concession balance (subtract unused classes)
                if (transaction.studentId && unusedClasses > 0) {
                    await firebase.firestore()
                        .collection('students')
                        .doc(transaction.studentId)
                        .update({
                            concessionBalance: firebase.firestore.FieldValue.increment(-unusedClasses),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                }
            }
        }
        
        // Reload transactions
        if (typeof window.loadCheckinTransactions === 'function') {
            await window.loadCheckinTransactions();
        }
        
        showSnackbar('Transaction reversed successfully', 'success');
        
    } catch (error) {
        console.error('Error reversing transaction:', error);
        showSnackbar('Error reversing transaction: ' + error.message, 'error');
    }
}

/**
 * Edit a concession purchase transaction
 * @param {Object} transaction - Transaction data
 * @param {Object} transactionData - Full transaction data from Firestore
 */
async function editConcessionPurchaseTransaction(transaction, transactionData) {
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
        delete window.editingTransactionId;
        delete window.editingStudentId;
        
        showSnackbar('Transaction updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        showSnackbar('Error updating transaction: ' + error.message, 'error');
    }
}
