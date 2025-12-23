/**
 * gift-api.js - Gift processing and Firebase operations
 * Handles gifting concessions, creating transactions, and Firebase operations
 */

import { getSelectedStudent, updateStudentInCache } from './student-search.js';
import { resetForm } from './gift-form.js';
import { loadRecentGifts } from './recent-gifts.js';

let currentUser = null;

/**
 * Set current user
 */
export function setCurrentUser(user) {
    currentUser = user;
}

/**
 * Convert date from d/mm/yyyy format to Date object
 */
function parseDateFromInput(dateString) {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Process the gift after confirmation
 */
export async function processGift() {
    const selectedStudent = getSelectedStudent();
    if (!selectedStudent) {
        showError('No student selected');
        return;
    }
    
    const quantity = parseInt(document.getElementById('gift-quantity').value);
    const expiryDateStr = document.getElementById('gift-expiry').value;
    const expiryDate = parseDateFromInput(expiryDateStr);
    const giftDateStr = document.getElementById('gift-date').value;
    const giftDate = parseDateFromInput(giftDateStr);
    const notes = document.getElementById('gift-notes').value.trim();
    const fullName = getStudentFullName(selectedStudent);
    
    try {
        showLoading(true, 'Processing gift...');
        
        // Gift the concessions
        const result = await giftConcessions(
            selectedStudent.id,
            quantity,
            expiryDate,
            giftDate,
            notes
        );
        
        showLoading(false);
        
        // Show success snackbar
        showSnackbar(`Successfully gifted ${quantity} class${quantity !== 1 ? 'es' : ''} to ${fullName}`, 'success');
        
        // Reset the form after successful gift
        resetForm();
        
        // Reload recent gifts
        await loadRecentGifts();
        
    } catch (error) {
        showLoading(false);
        console.error('Gift error:', error);
        showError('Failed to gift concessions: ' + error.message);
    }
}

/**
 * Gift concessions to a student
 */
async function giftConcessions(studentId, quantity, expiryDate, giftDate, notes) {
    // Package data for gifted concessions
    const packageData = {
        id: 'gifted-concessions',
        name: 'Gifted Concessions',
        numberOfClasses: quantity,
        price: 0,
        expiryMonths: 0 // Not used, we provide explicit expiry date
    };
    
    // Create transaction record with type 'concession-gift'
    const transactionId = await createGiftTransaction(studentId, quantity, giftDate, notes);
    
    // Create concession block
    const blockId = await createConcessionBlock(
        studentId,
        packageData,
        quantity,           // quantity
        0,                  // price
        'none',            // paymentMethod
        expiryDate,        // expiryDate
        notes,             // notes
        giftDate,          // purchaseDate
        transactionId      // transactionId
    );
    
    // Get current balance before updating
    const selectedStudent = getSelectedStudent();
    const currentBalance = selectedStudent ? (selectedStudent.concessionBalance || 0) : 0;
    const newBalance = currentBalance + quantity;
    
    // Update student balance in Firestore
    await updateStudentBalance(studentId, quantity);
    
    // Update local student cache with calculated balance
    updateStudentInCache(studentId, newBalance);
    
    return {
        success: true,
        blockId,
        transactionId,
        newBalance
    };
}

/**
 * Create a gift transaction record
 */
async function createGiftTransaction(studentId, quantity, giftDate, notes) {
    const actualGiftDate = giftDate instanceof Date ? giftDate : new Date(giftDate);
    
    // Get student data for transaction ID
    const student = await db.collection('students').doc(studentId).get();
    const studentData = student.data();
    
    const firstName = (studentData.firstName || 'unknown').toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const lastName = (studentData.lastName || 'unknown').toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    // Use Date.now() + random component to ensure uniqueness even if multiple gifts created simultaneously
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 random chars
    const transactionId = `${firstName}-${lastName}-gifted-${timestamp}-${randomSuffix}`;
    
    const transactionData = {
        studentId: studentId,
        transactionDate: firebase.firestore.Timestamp.fromDate(actualGiftDate),
        type: 'concession-gift', // Special type for gifts
        packageId: 'gifted-concessions',
        packageName: 'Gifted Concessions',
        numberOfClasses: quantity,
        amountPaid: 0,
        paymentMethod: 'none',
        checkinId: null,
        notes: notes,
        giftedBy: currentUser ? currentUser.email : 'unknown',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('transactions').doc(transactionId).set(transactionData);
    return transactionId;
}

/**
 * Get student full name
 */
function getStudentFullName(student) {
    if (!student) return 'Unknown';
    const firstName = student.firstName || '';
    const lastName = student.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
}

/**
 * Show/hide loading spinner
 */
function showLoading(show = true, message = 'Processing...') {
    if (show) {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.showGlobal(message);
        }
    } else {
        if (window.LoadingSpinner) {
            window.LoadingSpinner.hideGlobal();
        }
    }
}

/**
 * Show error message
 */
function showError(message) {
    // Create modal using BaseModal directly to only have one button
    import('/components/modals/modal-base.js').then(({ BaseModal }) => {
        const modal = new BaseModal({
            title: '<i class="fas fa-exclamation-circle"></i> Error',
            content: message,
            size: 'small',
            buttons: [
                {
                    text: 'OK',
                    class: 'btn-cancel',
                    onClick: (m) => m.hide()
                }
            ]
        });
        
        // Add danger variant styling
        modal.element.classList.add('modal-danger');
        modal.show();
    });
}
