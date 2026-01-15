/**
 * payment-actions.js
 * Handles editing and deleting payment transactions
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { findTransactionById } from './payment-loader.js';
import { loadTransactionHistoryPayments } from './payment-loader.js';

/**
 * Edit a transaction
 * Opens the appropriate modal based on transaction type
 * @param {string} transactionId - Transaction ID
 */
export async function editTransaction(transactionId) {
    try {
        // Find the transaction in our stored data
        const transaction = findTransactionById(transactionId);
        
        if (!transaction) {
            console.error('Transaction not found:', transactionId);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Transaction not found', 'error');
            }
            return;
        }
        
        // Handle based on transaction type
        if (transaction.type === 'casual-entry') {
            await editCasualEntryTransaction(transaction);
        } else if (transaction.type === 'concession-purchase') {
            await editConcessionPurchaseTransaction(transaction);
        }
        
    } catch (error) {
        console.error('Error editing transaction:', error);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error opening edit modal', 'error');
        }
    }
}

/**
 * Edit a casual entry transaction
 * @param {object} transaction - Transaction object
 */
async function editCasualEntryTransaction(transaction) {
    // Fetch the full transaction data from Firestore to get checkinId
    const transactionDoc = await firebase.firestore()
        .collection('transactions')
        .doc(transaction.id)
        .get();
    
    if (!transactionDoc.exists) {
        console.error('Transaction document not found in Firestore');
        if (typeof showSnackbar === 'function') {
            showSnackbar('Transaction not found', 'error');
        }
        return;
    }
    
    const transactionData = transactionDoc.data();
    
    if (!transactionData.checkinId) {
        console.error('Check-in ID not found in transaction');
        if (typeof showSnackbar === 'function') {
            showSnackbar('Unable to edit: Check-in reference missing', 'error');
        }
        return;
    }
    
    // Get student name
    let studentName = 'Unknown Student';
    try {
        if (typeof findStudentById === 'function') {
            const student = findStudentById(transaction.studentId);
            if (student && typeof getStudentFullName === 'function') {
                studentName = getStudentFullName(student);
            }
        }
    } catch (error) {
        console.warn('Could not get student name:', error);
    }
    
    // Initialize the casual entry modal if needed
    if (typeof initializeCasualEntryModal === 'function') {
        initializeCasualEntryModal();
    }
    
    // Close the transaction history modal
    const transactionHistoryModal = document.getElementById('transaction-history-modal');
    if (transactionHistoryModal) {
        transactionHistoryModal.style.display = 'none';
    }
    
    // Open the casual entry edit modal with a callback to reload the payments tab
    if (typeof openCasualEntryModal === 'function') {
        await openCasualEntryModal(
            transaction.id,                    // transactionId
            transactionData.checkinId,         // checkinId
            transaction.studentId,             // studentId
            studentName,                       // studentName
            transaction.date,                  // entryDate
            transaction.paymentMethod,         // paymentMethod
            transaction.amountPaid,            // amount
            async () => {                      // callback
                // Reload the payments tab after update
                await loadTransactionHistoryPayments(transaction.studentId);
            },
            'transaction-history-modal',       // parentModalId
            transactionData.classDate?.toDate ? transactionData.classDate.toDate() : null  // classDate (convert Timestamp to Date)
        );
    }
}

/**
 * Edit a concession purchase transaction
 * @param {object} transaction - Transaction object
 */
async function editConcessionPurchaseTransaction(transaction) {
    // Fetch the full transaction data from Firestore to get packageId
    const transactionDoc = await firebase.firestore()
        .collection('transactions')
        .doc(transaction.id)
        .get();
    
    if (!transactionDoc.exists) {
        console.error('Transaction document not found in Firestore');
        if (typeof showSnackbar === 'function') {
            showSnackbar('Transaction not found', 'error');
        }
        return;
    }
    
    const transactionData = transactionDoc.data();
    
    // Close the transaction history modal
    const transactionHistoryModal = document.getElementById('transaction-history-modal');
    if (transactionHistoryModal) {
        transactionHistoryModal.style.display = 'none';
    }
    
    // Open the purchase modal in edit mode
    await openPurchaseConcessionsModalForEdit(
        transaction.studentId,
        transaction.id,
        transactionData.packageId,
        transaction.paymentMethod,
        transaction.date,
        'transaction-history-modal'
    );
}

/**
 * Open Purchase Concessions modal in edit mode
 * @param {string} studentId - Student ID
 * @param {string} transactionId - Transaction ID
 * @param {string} packageId - Package ID
 * @param {string} paymentMethod - Payment method
 * @param {Date} transactionDate - Transaction date
 * @param {string} parentModalId - Parent modal ID
 */
async function openPurchaseConcessionsModalForEdit(studentId, transactionId, packageId, paymentMethod, transactionDate, parentModalId) {
    // Initialize the modal if it hasn't been initialized yet
    if (typeof initializePurchaseConcessionsModal === 'function') {
        initializePurchaseConcessionsModal();
    }
    
    // Open the modal first to ensure elements exist
    if (typeof openPurchaseConcessionsModal === 'function') {
        await openPurchaseConcessionsModal(studentId, null, parentModalId, null);
    }
    
    // Wait a bit for the modal to fully render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Pre-populate the form fields
    const datePicker = document.getElementById('purchase-date-picker');
    const packageSelect = document.getElementById('purchase-package-select');
    const paymentSelect = document.getElementById('purchase-payment-select');
    const confirmBtn = document.getElementById('confirm-purchase-concessions-btn');
    
    if (datePicker && transactionDate) {
        // Format date as d/mm/yyyy for display (matching DatePicker format)
        const day = transactionDate.getDate();
        const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
        const year = transactionDate.getFullYear();
        const dateStr = `${day}/${month}/${year}`;
        datePicker.value = dateStr;
        // Trigger button update since we're manually setting the value
        if (typeof updatePurchaseButton === 'function') {
            updatePurchaseButton();
        }
    }
    
    if (packageSelect && packageId) {
        packageSelect.value = packageId;
        // Trigger change event to update the amount display
        packageSelect.dispatchEvent(new Event('change'));
    }
    
    if (paymentSelect && paymentMethod) {
        // Convert payment method to match the select options
        const methodValue = paymentMethod.toLowerCase().replace(/\s+/g, '-');
        paymentSelect.value = methodValue;
        // Trigger change event to enable the button
        paymentSelect.dispatchEvent(new Event('change'));
    }
    
    // Change the modal title to indicate edit mode
    const modalTitle = document.querySelector('#purchase-concessions-modal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Transaction';
    }
    
    // Change the button text
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-save"></i> Update Transaction';
    }
    
    // Store the transaction ID for the update operation
    // We'll modify the confirm button to handle updates instead of new purchases
    if (confirmBtn) {
        // Remove existing click listeners by cloning the button
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        // Add new click listener for update
        newBtn.addEventListener('click', async () => {
            await handleTransactionUpdate(transactionId, studentId, parentModalId);
        });
    }
}

/**
 * Handle transaction update
 * @param {string} transactionId - Transaction ID
 * @param {string} studentId - Student ID
 * @param {string} parentModalId - Parent modal ID
 */
async function handleTransactionUpdate(transactionId, studentId, parentModalId) {
    const packageId = document.getElementById('purchase-package-select').value;
    const paymentMethod = document.getElementById('purchase-payment-select').value;
    const purchaseDate = document.getElementById('purchase-date-picker').value;
    
    if (!packageId || !paymentMethod || !purchaseDate) {
        if (typeof showSnackbar === 'function') {
            showSnackbar('Please fill in all fields', 'error');
        }
        return;
    }
    
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        // Parse date from d/mm/yyyy format
        const [day, month, year] = purchaseDate.split('/').map(Number);
        const parsedDate = new Date(year, month - 1, day, 12, 0, 0);
        
        // Get package data
        const packageData = typeof getConcessionPackageById === 'function' 
            ? getConcessionPackageById(packageId) 
            : null;
        
        if (!packageData) {
            throw new Error('Package not found');
        }
        
        // Update the transaction in Firestore
        await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .update({
                transactionDate: firebase.firestore.Timestamp.fromDate(parsedDate),
                packageId: packageId,
                packageName: packageData.name,
                numberOfClasses: packageData.numberOfClasses,
                amountPaid: packageData.price,
                paymentMethod: paymentMethod,
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
                    paymentMethod: paymentMethod,
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
        
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        
        // Close the purchase modal
        if (typeof closePurchaseConcessionsModal === 'function') {
            closePurchaseConcessionsModal();
        }
        
        if (typeof showSnackbar === 'function') {
            showSnackbar('Transaction updated successfully', 'success');
        }
        
        // Reopen the transaction history modal and reload the data
        if (parentModalId) {
            const parentModal = document.getElementById(parentModalId);
            if (parentModal) {
                parentModal.style.display = 'flex';
                
                // Reload the payments tab
                await loadTransactionHistoryPayments(studentId);
            }
        }
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error updating transaction: ' + error.message, 'error');
        }
    }
}

/**
 * Confirm transaction deletion
 * @param {string} transactionId - Transaction ID
 */
export function confirmDeleteTransaction(transactionId) {
    // Find the transaction in our stored data
    const transaction = findTransactionById(transactionId);
    
    if (!transaction) {
        console.error('Transaction not found:', transactionId);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Transaction not found', 'error');
        }
        return;
    }
    
    // Get student name
    let studentName = 'Unknown Student';
    try {
        if (typeof findStudentById === 'function') {
            const student = findStudentById(transaction.studentId);
            if (student && typeof getStudentFullName === 'function') {
                studentName = getStudentFullName(student);
            }
        }
    } catch (error) {
        console.warn('Could not get student name:', error);
    }
    
    const date = formatDate(transaction.date);
    const message = `
        <p>Are you sure you want to delete this transaction?</p>
        <div class="student-info-delete">
            <strong>${escapeHtml(studentName)}</strong> - $${(transaction.amountPaid || 0).toFixed(2)} - ${date}
        </div>
    `;
    
    // Create and show confirmation modal
    const modal = new ConfirmationModal({
        title: 'Delete Transaction',
        message: message,
        icon: 'fas fa-trash-alt',
        variant: 'danger',
        confirmText: 'Delete Transaction',
        confirmClass: 'btn-danger',
        cancelClass: 'btn-cancel',
        onConfirm: () => {
            deleteTransaction(transaction);
        }
    });
    
    modal.show();
}

/**
 * Delete a transaction (mark as reversed instead of permanently deleting)
 * @param {object} transaction - Transaction object
 */
async function deleteTransaction(transaction) {
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        // Mark the transaction as reversed in Firestore
        await firebase.firestore()
            .collection('transactions')
            .doc(transaction.id)
            .update({
                reversed: true,
                reversedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        
        if (typeof showSnackbar === 'function') {
            showSnackbar('Transaction reversed successfully', 'success');
        }
        
        // Reload the payments tab
        await loadTransactionHistoryPayments(transaction.studentId);
        
    } catch (error) {
        console.error('Error reversing transaction:', error);
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error reversing transaction: ' + error.message, 'error');
        }
    }
}
