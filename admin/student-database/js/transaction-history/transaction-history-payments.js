/**
 * transaction-history-payments.js
 * Handles loading and displaying payment history (transactions)
 */

// Store transactions for editing
let currentPaymentTransactions = [];

/**
 * Load payment history for a student
 */
async function loadTransactionHistoryPayments(studentId) {
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
            .map(doc => {
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
                    paymentMethod: data.paymentMethod
                };
            })
            .sort((a, b) => b.date - a.date);
        
        console.log(`Found ${allPayments.length} payment(s) for student ${studentId}`);
        
        // Store transactions for editing
        currentPaymentTransactions = allPayments;
        
        displayPaymentHistory(allPayments);
    } catch (error) {
        console.error('Error loading payment history:', error);
        contentEl.innerHTML = '<p class="text-error">Error loading payment history. Please try again.</p>';
    }
}

/**
 * Display payment history
 */
function displayPaymentHistory(transactions) {
    const contentEl = document.getElementById('payments-content');
    
    if (transactions.length === 0) {
        contentEl.innerHTML = '<p class="text-muted">No payment history found.</p>';
        return;
    }
    
    const totalPaid = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
    
    let html = `<p class="section-summary">${transactions.length} payment${transactions.length !== 1 ? 's' : ''} • Total: $${totalPaid.toFixed(2)}</p>`;
    html += '<div class="payments-list">';
    
    transactions.forEach(transaction => {
        const date = formatDate(transaction.date);
        
        // Add edit and delete buttons for all transactions
        const editButton = `<button class="btn-icon btn-edit-transaction" onclick="editTransaction('${transaction.id}')" title="Edit transaction">
               <i class="fas fa-edit"></i>
           </button>`;
        
        const deleteButton = `<button class="btn-icon btn-delete-transaction" onclick="confirmDeleteTransaction('${transaction.id}')" title="Delete transaction">
               <i class="fas fa-trash-alt"></i>
           </button>`;
        
        html += `
            <div class="payment-item">
                <div class="payment-date-info">
                    <div class="payment-date-time">
                        <span class="payment-date">${date}</span>
                    </div>
                    <div class="payment-package">
                        <strong>${escapeHtml(transaction.packageName || 'Unknown Package')}</strong>
                        <span class="text-muted">${transaction.numberOfClasses || 0} classes</span>
                    </div>
                </div>
                <div class="payment-amount-method">
                    <div class="payment-amount">$${(transaction.amountPaid || 0).toFixed(2)}</div>
                    <div class="payment-method text-muted">${formatPaymentMethod(transaction.paymentMethod)}</div>
                    <div class="payment-actions">
                        ${editButton}
                        ${deleteButton}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    contentEl.innerHTML = html;
}

/**
 * Format payment method for display
 * EFTPOS in uppercase, others in Title Case
 */
function formatPaymentMethod(method) {
    if (!method) return 'Unknown';
    
    const lowerMethod = method.toLowerCase();
    
    if (lowerMethod === 'eftpos') {
        return 'EFTPOS';
    }
    
    // Title Case for other methods (e.g., "Cash", "Bank Transfer")
    return escapeHtml(method.replace(/\b\w/g, char => char.toUpperCase()));
}

/**
 * Edit a transaction
 * Opens the Purchase Concessions modal with pre-populated data for concession purchases
 * Opens the Casual Entry modal for casual entries
 */
async function editTransaction(transactionId) {
    try {
        // Find the transaction in our stored data
        const transaction = currentPaymentTransactions.find(t => t.id === transactionId);
        
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
            'transaction-history-modal'        // parentModalId
        );
    }
}

/**
 * Edit a concession purchase transaction
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
        // Format date as YYYY-MM-DD for the date input
        // Use local date components to avoid timezone issues
        const year = transactionDate.getFullYear();
        const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
        const day = String(transactionDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        datePicker.value = dateStr;
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
        
        // Parse date
        const [year, month, day] = purchaseDate.split('-').map(Number);
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
 */
function confirmDeleteTransaction(transactionId) {
    // Find the transaction in our stored data
    const transaction = currentPaymentTransactions.find(t => t.id === transactionId);
    
    if (!transaction) {
        console.error('Transaction not found:', transactionId);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Transaction not found', 'error');
        }
        return;
    }
    
    const modal = document.getElementById('delete-modal');
    const titleEl = document.getElementById('delete-modal-title');
    const messageEl = document.getElementById('delete-modal-message');
    const infoEl = document.getElementById('delete-modal-info');
    const btnTextEl = document.getElementById('delete-modal-btn-text');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    if (!modal || !titleEl || !messageEl || !infoEl || !btnTextEl || !confirmBtn) {
        console.error('Delete modal elements not found');
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
    
    // Customize modal for transaction deletion
    titleEl.textContent = 'Delete Transaction';
    messageEl.textContent = 'Are you sure you want to delete this transaction?';
    
    const date = formatDate(transaction.date);
    infoEl.innerHTML = `<strong>${escapeHtml(studentName)}</strong> - $${(transaction.amountPaid || 0).toFixed(2)} - ${date}`;
    
    btnTextEl.textContent = 'Delete Transaction';
    
    // Remove any existing event listeners by replacing the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add click handler for confirm button
    newConfirmBtn.addEventListener('click', () => {
        deleteTransaction(transaction);
    });
    
    modal.style.display = 'flex';
}

/**
 * Delete a transaction
 */
async function deleteTransaction(transaction) {
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        // Close delete modal
        if (typeof closeDeleteModal === 'function') {
            closeDeleteModal();
        }
        
        // Delete the transaction from Firestore
        await firebase.firestore()
            .collection('transactions')
            .doc(transaction.id)
            .delete();
        
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        
        if (typeof showSnackbar === 'function') {
            showSnackbar('Transaction deleted successfully', 'success');
        }
        
        // Reload the payments tab
        await loadTransactionHistoryPayments(transaction.studentId);
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error deleting transaction: ' + error.message, 'error');
        }
    }
}
