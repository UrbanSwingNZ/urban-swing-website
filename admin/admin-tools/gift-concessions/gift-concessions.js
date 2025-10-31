/**
 * gift-concessions.js - Gift Concessions Tool Logic
 * Allows admin to gift concession packages to students
 */

// Global state
let allStudents = [];
let selectedStudent = null;
let currentUser = null;

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '../index.html';
                return;
            }

            currentUser = user;

            // Check if user is authorized (only dance@urbanswing.co.nz)
            if (user.email !== 'dance@urbanswing.co.nz') {
                alert('Unauthorized: This tool is only available to the super admin.');
                window.location.href = '../index.html';
                return;
            }

            // Display user email
            document.getElementById('user-email').textContent = user.email;

            // Load students
            await loadStudents();

            // Initialize form
            initializeForm();

            // Load recent gifts
            await loadRecentGifts();
        });

        // Logout handler
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            }
        });

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize page: ' + error.message);
    }
});

/**
 * Load all students from Firestore
 */
async function loadStudents() {
    try {
        showLoading(true);
        const snapshot = await db.collection('students').get();
        
        allStudents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error('Error loading students:', error);
        throw error;
    }
}

/**
 * Initialize form elements and event listeners
 */
function initializeForm() {
    const form = document.getElementById('gift-form');
    const studentSearch = document.getElementById('student-search');
    const clearSearchBtn = document.getElementById('clear-student-search');
    const giftDate = document.getElementById('gift-date');
    
    // Set default gift date to today
    const today = new Date().toISOString().split('T')[0];
    giftDate.value = today;
    giftDate.max = today; // Prevent future dates
    
    // Student search
    studentSearch.addEventListener('input', handleStudentSearch);
    studentSearch.addEventListener('focus', handleStudentSearch);
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            studentSearch.value = '';
            clearSearchBtn.style.display = 'none';
            document.getElementById('student-results').style.display = 'none';
            if (!selectedStudent) {
                studentSearch.focus();
            }
        });
    }
    
    // Click outside to close search results
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            document.getElementById('student-results').style.display = 'none';
        }
    });
    
    // Form field listeners for live summary update
    document.getElementById('gift-quantity').addEventListener('input', updateSummary);
    document.getElementById('gift-expiry').addEventListener('change', updateSummary);
    document.getElementById('gift-notes').addEventListener('input', updateSummary);
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Handle student search input
 */
function handleStudentSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const resultsDiv = document.getElementById('student-results');
    const clearBtn = document.getElementById('clear-student-search');
    
    // Show/hide clear button
    if (clearBtn) {
        clearBtn.style.display = searchTerm.length > 0 ? 'flex' : 'none';
    }
    
    if (searchTerm.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    // Filter students
    const matches = allStudents.filter(student => {
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
        const email = (student.email || '').toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
    }).slice(0, 10); // Limit to 10 results
    
    // Display results
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results"><i class="fas fa-search"></i> No students found</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    resultsDiv.innerHTML = matches.map(student => {
        const fullName = getStudentFullName(student);
        const balance = student.concessionBalance || 0;
        return `
            <div class="search-result-item" onclick="selectStudent('${student.id}')">
                <h4>${escapeHtml(fullName)} <span class="balance-badge">${balance} classes</span></h4>
                <p>${escapeHtml(student.email || 'No email')}</p>
            </div>
        `;
    }).join('');
    
    resultsDiv.style.display = 'block';
}

/**
 * Select a student from search results
 */
function selectStudent(studentId) {
    selectedStudent = allStudents.find(s => s.id === studentId);
    if (!selectedStudent) return;
    
    // Update UI
    const fullName = getStudentFullName(selectedStudent);
    document.getElementById('selected-student-name').textContent = fullName;
    document.getElementById('selected-student-email').textContent = selectedStudent.email || 'No email';
    document.getElementById('selected-student-balance').textContent = selectedStudent.concessionBalance || 0;
    
    // Show selected card, hide search results
    document.getElementById('selected-student-card').style.display = 'flex';
    document.getElementById('student-results').style.display = 'none';
    document.getElementById('student-search').value = fullName;
    
    // Update summary
    updateSummary();
}

/**
 * Clear selected student
 */
function clearSelectedStudent() {
    selectedStudent = null;
    document.getElementById('selected-student-card').style.display = 'none';
    document.getElementById('student-search').value = '';
    document.getElementById('clear-student-search').style.display = 'none';
    updateSummary();
}

/**
 * Apply a preset package
 */
function applyPreset(quantity, months) {
    document.getElementById('gift-quantity').value = quantity;
    
    // Calculate expiry date
    const giftDate = new Date(document.getElementById('gift-date').value);
    const expiryDate = new Date(giftDate);
    expiryDate.setMonth(expiryDate.getMonth() + months);
    
    document.getElementById('gift-expiry').value = expiryDate.toISOString().split('T')[0];
    
    updateSummary();
}

/**
 * Update the summary section
 */
function updateSummary() {
    const quantity = parseInt(document.getElementById('gift-quantity').value) || 0;
    const expiryDate = document.getElementById('gift-expiry').value;
    const notes = document.getElementById('gift-notes').value.trim();
    
    // Update summary fields
    document.getElementById('summary-student').textContent = selectedStudent 
        ? getStudentFullName(selectedStudent) 
        : '-';
    
    document.getElementById('summary-quantity').textContent = quantity;
    
    const currentBalance = selectedStudent ? (selectedStudent.concessionBalance || 0) : 0;
    const newBalance = currentBalance + quantity;
    document.getElementById('summary-new-balance').textContent = newBalance;
    
    document.getElementById('summary-expiry').textContent = expiryDate 
        ? formatDate(new Date(expiryDate)) 
        : '-';
    
    document.getElementById('summary-notes').textContent = notes || '-';
    
    // Enable/disable submit button
    const submitBtn = document.getElementById('gift-submit-btn');
    const isValid = selectedStudent && quantity > 0 && expiryDate && notes.length > 0;
    submitBtn.disabled = !isValid;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!selectedStudent) {
        showError('Please select a student');
        return;
    }
    
    const quantity = parseInt(document.getElementById('gift-quantity').value);
    const expiryDate = new Date(document.getElementById('gift-expiry').value);
    const giftDate = new Date(document.getElementById('gift-date').value);
    const notes = document.getElementById('gift-notes').value.trim();
    
    // Validation
    if (quantity < 1 || quantity > 100) {
        showError('Quantity must be between 1 and 100');
        return;
    }
    
    if (expiryDate <= giftDate) {
        showError('Expiry date must be after gift date');
        return;
    }
    
    if (notes.length < 3) {
        showError('Please provide a reason for this gift (minimum 3 characters)');
        return;
    }
    
    // Show confirmation modal
    const fullName = getStudentFullName(selectedStudent);
    showConfirmModal(fullName, quantity, expiryDate, notes);
}

/**
 * Show confirmation modal
 */
function showConfirmModal(studentName, quantity, expiryDate, notes) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-student-name').textContent = studentName;
    document.getElementById('confirm-quantity').textContent = `${quantity} class${quantity !== 1 ? 'es' : ''}`;
    document.getElementById('confirm-expiry').textContent = formatDate(expiryDate);
    document.getElementById('confirm-notes').textContent = notes;
    
    modal.style.display = 'flex';
    
    // Set up confirm button
    const confirmBtn = document.getElementById('confirm-gift-btn');
    confirmBtn.onclick = async () => {
        closeConfirmModal();
        await processGift();
    };
}

/**
 * Close confirmation modal
 */
function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    modal.style.display = 'none';
}

/**
 * Process the gift after confirmation
 */
async function processGift() {
    const quantity = parseInt(document.getElementById('gift-quantity').value);
    const expiryDate = new Date(document.getElementById('gift-expiry').value);
    const giftDate = new Date(document.getElementById('gift-date').value);
    const notes = document.getElementById('gift-notes').value.trim();
    const fullName = getStudentFullName(selectedStudent);
    
    try {
        showLoading(true);
        
        // Gift the concessions
        const result = await giftConcessions(
            selectedStudent.id,
            quantity,
            expiryDate,
            giftDate,
            notes
        );
        
        showLoading(false);
        
        // Show success message with structured format
        const successMessageHTML = `
            <p style="font-size: 1.1rem; margin-bottom: 20px;">Successfully gifted <strong>${quantity} class${quantity !== 1 ? 'es' : ''}</strong> to <strong>${fullName}</strong>!</p>
            <div class="success-summary">
                <div class="success-row highlight">
                    <span class="label">New Balance:</span>
                    <span class="value">${result.newBalance} classes</span>
                </div>
                <div class="success-row">
                    <span class="label">Expires:</span>
                    <span class="value">${formatDate(expiryDate)}</span>
                </div>
                <div class="success-reason">
                    <span class="label">Reason:</span>
                    <span class="value">${escapeHtml(notes)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('success-message-text').innerHTML = successMessageHTML;
        document.getElementById('success-modal').style.display = 'flex';
        
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
    const currentBalance = selectedStudent.concessionBalance || 0;
    const newBalance = currentBalance + quantity;
    
    // Update student balance in Firestore
    await updateStudentBalance(studentId, quantity);
    
    // Update local student cache with calculated balance
    const studentIndex = allStudents.findIndex(s => s.id === studentId);
    if (studentIndex !== -1) {
        allStudents[studentIndex].concessionBalance = newBalance;
    }
    
    // Update the selected student reference
    if (selectedStudent && selectedStudent.id === studentId) {
        selectedStudent.concessionBalance = newBalance;
    }
    
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
    
    const timestamp = actualGiftDate.getTime();
    const transactionId = `${firstName}-${lastName}-gifted-${timestamp}`;
    
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
 * Load recent gifts (last 10)
 */
async function loadRecentGifts() {
    try {
        const listDiv = document.getElementById('recent-gifts-list');
        listDiv.innerHTML = '<p class="loading-message"><i class="fas fa-spinner fa-spin"></i> Loading recent gifts...</p>';
        
        // Fetch all gift transactions, then sort in JavaScript to avoid needing composite index
        const snapshot = await db.collection('transactions')
            .where('type', '==', 'concession-gift')
            .get();
        
        if (snapshot.empty) {
            listDiv.innerHTML = '<p class="empty-message"><i class="fas fa-inbox"></i> No gifts have been recorded yet</p>';
            return;
        }
        
        // Get all gifts and sort by date in JavaScript
        const gifts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
                const dateA = a.transactionDate?.toDate() || new Date(0);
                const dateB = b.transactionDate?.toDate() || new Date(0);
                return dateB - dateA; // Descending order (newest first)
            })
            .slice(0, 10); // Limit to 10 most recent
        
        // Check if gifts have been reversed
        // The reversed flag is stored directly on the transaction document
        const giftStatuses = gifts.map(gift => ({
            ...gift,
            isReversed: gift.reversed === true
        }));
        
        listDiv.innerHTML = giftStatuses.map(gift => {
            const date = gift.transactionDate?.toDate() || new Date();
            const student = allStudents.find(s => s.id === gift.studentId);
            const studentName = student ? getStudentFullName(student) : 'Unknown Student';
            const reversedClass = gift.isReversed ? ' gift-item-reversed' : '';
            
            return `
                <div class="gift-item${reversedClass}">
                    <div class="gift-item-header">
                        <h4>
                            <i class="fas fa-gift"></i> ${escapeHtml(studentName)}
                            ${gift.isReversed ? '<span class="reversed-badge">Reversed</span>' : ''}
                        </h4>
                        <span class="gift-item-date">${formatDate(date)}</span>
                    </div>
                    <p class="gift-item-details">
                        <strong>${gift.numberOfClasses}</strong> class${gift.numberOfClasses !== 1 ? 'es' : ''} gifted
                        ${gift.giftedBy ? `by <strong>${escapeHtml(gift.giftedBy)}</strong>` : ''}
                    </p>
                    ${gift.notes ? `<p class="gift-item-notes">"${escapeHtml(gift.notes)}"</p>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent gifts:', error);
        document.getElementById('recent-gifts-list').innerHTML = 
            '<p class="error-message"><i class="fas fa-exclamation-triangle"></i> Failed to load recent gifts. Please refresh the page.</p>';
    }
}

/**
 * Reset the form
 */
function resetForm() {
    document.getElementById('gift-form').reset();
    clearSelectedStudent();
    
    // Reset to defaults
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('gift-date').value = today;
    
    updateSummary();
}

/**
 * Close success modal
 */
function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
}

/**
 * Close success modal and reset form
 */
function closeSuccessModalAndReset() {
    closeSuccessModal();
    resetForm();
}

/**
 * Show/hide loading spinner
 */
function showLoading(show = true) {
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = show ? 'flex' : 'none';
}

/**
 * Show error message
 */
function showError(message) {
    alert('Error: ' + message);
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
 * Format date for display
 */
function formatDate(date) {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-NZ', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Close modal when clicking outside
 */
document.addEventListener('click', (e) => {
    const successModal = document.getElementById('success-modal');
    if (e.target === successModal) {
        closeSuccessModal();
    }
});
