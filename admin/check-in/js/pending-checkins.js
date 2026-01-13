/**
 * pending-checkins.js - Handle pending check-ins (prepaid transactions)
 * Shows transactions with classDate but no checkinId
 */

let pendingCheckinsUnsubscribe = null;

/**
 * Set up real-time listener for pending check-ins
 */
export function setupPendingCheckinsListener(selectedDate) {
    // Unsubscribe from any existing listener
    if (pendingCheckinsUnsubscribe) {
        pendingCheckinsUnsubscribe();
    }
    
    // Normalize the selected date to start of day
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Set up real-time listener for transactions with classDate on the selected date
    pendingCheckinsUnsubscribe = firebase.firestore()
        .collection('transactions')
        .where('classDate', '>=', startOfDay)
        .where('classDate', '<=', endOfDay)
        .onSnapshot(async (snapshot) => {
            await processPendingCheckinsSnapshot(snapshot);
        }, (error) => {
            console.error('Error in pending check-ins listener:', error);
        });
}

/**
 * Process pending check-ins snapshot (from real-time listener)
 */
async function processPendingCheckinsSnapshot(snapshot) {
    try {
        // Filter to only include transactions without a checkinId
        const pendingTransactions = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Skip if already has a checkinId
            if (data.checkinId) {
                continue;
            }
            
            // Skip if not a casual-rate package type (only prepaid casual entries)
            if (data.packageType !== 'casual-rate') {
                continue;
            }
            
            // Fetch student info
            const studentDoc = await firebase.firestore()
                .collection('students')
                .doc(data.studentId)
                .get();
            
            if (studentDoc.exists) {
                const studentData = studentDoc.data();
                pendingTransactions.push({
                    id: doc.id,
                    transactionData: data,
                    student: {
                        id: data.studentId,
                        firstName: studentData.firstName,
                        lastName: studentData.lastName,
                        email: studentData.email
                    }
                });
            }
        }
        
        // Display pending check-ins
        displayPendingCheckins(pendingTransactions);
        
    } catch (error) {
        console.error('Error processing pending check-ins:', error);
    }
}

/**
 * Legacy function for backwards compatibility
 * Now just calls setupPendingCheckinsListener
 */
export async function loadPendingCheckins(selectedDate) {
    setupPendingCheckinsListener(selectedDate);
}

/**
 * Display pending check-ins in the UI
 */
function displayPendingCheckins(pendingTransactions) {
    const section = document.getElementById('pending-checkins-section');
    const list = document.getElementById('pending-checkins-list');
    const countBadge = document.getElementById('pending-count');
    
    // Update count
    countBadge.textContent = pendingTransactions.length;
    
    // Show or hide section based on whether there are pending check-ins
    if (pendingTransactions.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    // Build HTML for pending check-ins
    list.innerHTML = pendingTransactions.map(item => {
        const { id, transactionData, student } = item;
        const typeLabel = transactionData.type === 'casual-student' ? 'Casual Student' : 'Casual Entry';
        const amount = transactionData.amountPaid || 0;
        
        return `
            <div class="pending-checkin-item" data-transaction-id="${id}" data-student-id="${student.id}">
                <div class="pending-student-info">
                    <div class="student-name">
                        <i class="fas fa-user"></i>
                        <strong>${student.firstName} ${student.lastName}</strong>
                    </div>
                    <div class="student-email">${student.email}</div>
                </div>
                <div class="pending-transaction-info">
                    <span class="transaction-type">${typeLabel}</span>
                    <span class="transaction-amount">$${amount.toFixed(2)}</span>
                </div>
                <div class="pending-actions">
                    <button class="btn-primary btn-complete-checkin" data-transaction-id="${id}" data-student-id="${student.id}">
                        <i class="fas fa-check"></i> Complete Check-In
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to Complete Check-In buttons
    list.querySelectorAll('.btn-complete-checkin').forEach(btn => {
        btn.addEventListener('click', handlePendingCheckin);
    });
}

/**
 * Handle completing a pending check-in
 */
async function handlePendingCheckin(e) {
    const btn = e.currentTarget;
    const transactionId = btn.dataset.transactionId;
    const studentId = btn.dataset.studentId;
    
    try {
        // Disable button while processing
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Fetch the transaction
        const transactionDoc = await firebase.firestore()
            .collection('transactions')
            .doc(transactionId)
            .get();
        
        if (!transactionDoc.exists) {
            showSnackbar('Transaction not found', 'error');
            return;
        }
        
        const transactionData = transactionDoc.data();
        
        // Fetch the student
        const studentDoc = await firebase.firestore()
            .collection('students')
            .doc(studentId)
            .get();
        
        if (!studentDoc.exists) {
            showSnackbar('Student not found', 'error');
            return;
        }
        
        const student = {
            id: studentId,
            ...studentDoc.data()
        };
        
        // Get the check-in date from the transaction's classDate
        const checkinDate = transactionData.classDate?.toDate ? transactionData.classDate.toDate() : new Date(transactionData.classDate);
        
        // Create the check-in using the same logic as the modal
        await createCheckinFromTransaction(student, transactionData, transactionId, checkinDate);
        
        // Show success message
        showSnackbar(`Check-in completed for ${student.firstName} ${student.lastName}`, 'success');
        
        // Reload both pending check-ins and today's check-ins
        const selectedDate = window.getSelectedCheckinDate ? window.getSelectedCheckinDate() : new Date();
        // Pending check-ins will auto-update via the listener
        
        // Reload today's check-ins if function exists
        if (typeof window.loadCheckinsForDate === 'function') {
            await window.loadCheckinsForDate(selectedDate);
        }
        
    } catch (error) {
        console.error('Error completing pending check-in:', error);
        showSnackbar('Error completing check-in: ' + error.message, 'error');
        
        // Re-enable button on error
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Complete Check-In';
    }
}

/**
 * Create a check-in from a prepaid transaction
 * This mirrors the logic from checkin-save.js for online payments
 */
async function createCheckinFromTransaction(student, transactionData, transactionId, checkinDate) {
    // Format date as YYYY-MM-DD for document ID
    const year = checkinDate.getFullYear();
    const month = String(checkinDate.getMonth() + 1).padStart(2, '0');
    const day = String(checkinDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Create document ID: checkin-YYYY-MM-DD-firstname-lastname
    const firstName = student.firstName.toLowerCase().replace(/\s+/g, '-');
    const lastName = student.lastName.toLowerCase().replace(/\s+/g, '-');
    const docId = `checkin-${dateStr}-${firstName}-${lastName}`;
    
    // Check if this student already has a check-in for this date
    const existingCheckin = await firebase.firestore()
        .collection('checkins')
        .doc(docId)
        .get();
    
    if (existingCheckin.exists && !existingCheckin.data().reversed) {
        throw new Error(`${student.firstName} ${student.lastName} is already checked in for this date.`);
    }
    
    // Determine the actual entry type from the transaction
    const actualEntryType = transactionData.type; // 'casual' or 'casual-student'
    const actualAmountPaid = transactionData.amountPaid || 0;
    
    // Create the check-in document
    const checkinData = {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        checkinDate: firebase.firestore.Timestamp.fromDate(checkinDate),
        entryType: actualEntryType,
        amountPaid: actualAmountPaid,
        paymentMethod: 'online',
        onlineTransactionId: transactionId,
        reversed: false,
        isCrew: student.isCrew || false
    };
    
    // Save the check-in
    await firebase.firestore()
        .collection('checkins')
        .doc(docId)
        .set(checkinData);
    
    // Update the transaction to mark it as used for check-in
    await firebase.firestore()
        .collection('transactions')
        .doc(transactionId)
        .update({
            usedForCheckin: true,
            checkinId: docId
        });
}

// Export functions
window.loadPendingCheckins = loadPendingCheckins;
