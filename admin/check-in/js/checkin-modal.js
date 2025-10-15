/**
 * checkin-modal.js - Check-in modal functionality
 * Handles the main check-in modal UI and logic
 */

let selectedStudent = null;

/**
 * Open check-in modal
 */
function openCheckinModal(studentId = null) {
    const modal = document.getElementById('checkin-modal');
    const studentSelection = document.getElementById('student-selection');
    const selectedInfo = document.getElementById('selected-student-info');
    
    // Reset form
    resetCheckinForm();
    
    if (studentId) {
        // Student pre-selected
        selectedStudent = findStudentById(studentId);
        if (selectedStudent) {
            studentSelection.style.display = 'none';
            showSelectedStudent(selectedStudent);
        }
    } else {
        // No student selected, show search
        studentSelection.style.display = 'block';
        selectedInfo.style.display = 'none';
        initializeModalSearch();
    }
    
    modal.style.display = 'flex';
}

/**
 * Close check-in modal
 */
function closeCheckinModal() {
    const modal = document.getElementById('checkin-modal');
    modal.style.display = 'none';
    selectedStudent = null;
}

/**
 * Reset check-in form
 */
function resetCheckinForm() {
    // Clear student search
    const modalSearchInput = document.getElementById('modal-student-search');
    const modalSearchResults = document.getElementById('modal-search-results');
    if (modalSearchInput) modalSearchInput.value = '';
    if (modalSearchResults) modalSearchResults.style.display = 'none';
    
    // Clear entry type selection
    document.querySelectorAll('input[name="entry-type"]').forEach(radio => {
        radio.checked = false;
    });
    
    // Clear payment method
    document.getElementById('payment-method').value = '';
    document.getElementById('payment-section').style.display = 'none';
    
    // Clear free entry reason
    document.getElementById('free-entry-reason').value = '';
    document.getElementById('free-entry-section').style.display = 'none';
    
    // Clear notes
    document.getElementById('checkin-notes').value = '';
    
    // Disable submit button (will be re-enabled when student is selected)
    document.getElementById('confirm-checkin-btn').disabled = true;
}

/**
 * Initialize modal search
 */
function initializeModalSearch() {
    const modalSearchInput = document.getElementById('modal-student-search');
    const modalSearchResults = document.getElementById('modal-search-results');
    const clearBtn = document.getElementById('clear-modal-search');
    
    let timeout;
    
    // Show all students when focused with empty input
    modalSearchInput.addEventListener('focus', () => {
        if (modalSearchInput.value.trim() === '') {
            const allStudents = getStudents();
            displayModalSearchResults(allStudents);
        }
    });
    
    modalSearchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        
        // Show/hide clear button
        clearBtn.style.display = modalSearchInput.value ? 'block' : 'none';
        
        timeout = setTimeout(() => {
            const query = modalSearchInput.value;
            if (query.trim() === '') {
                modalSearchResults.style.display = 'none';
                return;
            }
            
            const results = searchStudents(query);
            displayModalSearchResults(results);
        }, 300);
    });
    
    // Clear button functionality
    clearBtn.addEventListener('click', () => {
        modalSearchInput.value = '';
        clearBtn.style.display = 'none';
        modalSearchResults.style.display = 'none';
        modalSearchInput.focus();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper') && !e.target.closest('#student-selection')) {
            modalSearchResults.style.display = 'none';
        }
    });
}

/**
 * Display search results in modal
 */
function displayModalSearchResults(results) {
    const modalSearchResults = document.getElementById('modal-search-results');
    
    if (results.length === 0) {
        modalSearchResults.innerHTML = '<div class="search-result-item no-results">No students found</div>';
        modalSearchResults.style.display = 'block';
        return;
    }
    
    modalSearchResults.innerHTML = results.map(student => {
        const fullName = getStudentFullName(student);
        return `<div class="search-result-item" onclick="selectStudentInModal('${student.id}')">
            <div class="search-result-name">${escapeHtml(fullName)}</div>
            <div class="search-result-email">${escapeHtml(student.email || '')}</div>
        </div>`;
    }).join('');
    
    modalSearchResults.style.display = 'block';
}

/**
 * Select student in modal
 */
function selectStudentInModal(studentId) {
    selectedStudent = findStudentById(studentId);
    if (!selectedStudent) return;
    
    document.getElementById('student-selection').style.display = 'none';
    document.getElementById('modal-search-results').style.display = 'none';
    showSelectedStudent(selectedStudent);
}

/**
 * Show selected student info
 */
function showSelectedStudent(student) {
    const selectedInfo = document.getElementById('selected-student-info');
    const fullName = getStudentFullName(student);
    
    document.getElementById('selected-student-name').textContent = fullName;
    document.getElementById('selected-student-email').textContent = student.email || '';
    document.getElementById('selected-student-id').value = student.id;
    
    // Show concession info
    updateConcessionInfo(student);
    
    selectedInfo.style.display = 'block';
    
    // Setup entry type listeners
    setupEntryTypeListeners();
}

/**
 * Update concession info display
 */
function updateConcessionInfo(student) {
    const concessionData = getMockConcessionData(student.id);
    const balanceSpan = document.getElementById('concession-balance');
    const blocksDiv = document.getElementById('concession-blocks');
    
    balanceSpan.textContent = concessionData.balance;
    
    if (concessionData.blocks.length > 0) {
        blocksDiv.innerHTML = concessionData.blocks
            .map(block => formatConcessionBlock(block))
            .join('');
    } else {
        blocksDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No active concessions</p>';
    }
    
    // Enable/disable concession option based on balance
    const concessionRadio = document.getElementById('entry-concession');
    const casualRadio = document.getElementById('entry-casual');
    
    if (concessionData.balance > 0) {
        concessionRadio.disabled = false;
        concessionRadio.parentElement.style.opacity = '1';
        // Default to concession if available
        concessionRadio.checked = true;
    } else {
        concessionRadio.disabled = true;
        concessionRadio.parentElement.style.opacity = '0.5';
        // Default to casual if no concession
        casualRadio.checked = true;
        document.getElementById('payment-section').style.display = 'block';
    }
    
    // Enable confirm button since we have a default selection
    document.getElementById('confirm-checkin-btn').disabled = false;
}

/**
 * Setup entry type radio listeners
 */
function setupEntryTypeListeners() {
    const entryRadios = document.querySelectorAll('input[name="entry-type"]');
    const paymentSection = document.getElementById('payment-section');
    const freeEntrySection = document.getElementById('free-entry-section');
    const confirmBtn = document.getElementById('confirm-checkin-btn');
    
    entryRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // Hide both sections first
            paymentSection.style.display = 'none';
            freeEntrySection.style.display = 'none';
            
            // Show appropriate section based on selection
            if (radio.value === 'casual') {
                paymentSection.style.display = 'block';
                // Check if payment method is selected
                const paymentMethod = document.getElementById('payment-method').value;
                confirmBtn.disabled = paymentMethod === '';
            } else if (radio.value === 'free') {
                freeEntrySection.style.display = 'block';
                // Check if reason is selected
                const freeReason = document.getElementById('free-entry-reason').value;
                confirmBtn.disabled = freeReason === '';
            } else {
                // Concession - no additional selection needed
                confirmBtn.disabled = false;
            }
        });
    });
    
    // Payment method required for casual
    document.getElementById('payment-method').addEventListener('change', (e) => {
        const casualRadio = document.getElementById('entry-casual');
        if (casualRadio.checked) {
            confirmBtn.disabled = e.target.value === '';
        }
    });
    
    // Free entry reason required for free
    document.getElementById('free-entry-reason').addEventListener('change', (e) => {
        const freeRadio = document.getElementById('entry-free');
        if (freeRadio.checked) {
            confirmBtn.disabled = e.target.value === '';
        }
    });
}

/**
 * Initialize modal listeners
 */
function initializeCheckinModalListeners() {
    // Purchase concessions button
    const purchaseBtn = document.getElementById('purchase-concessions-btn');
    
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', () => {
            // Hide check-in modal before opening purchase modal
            document.getElementById('checkin-modal').style.display = 'none';
            
            if (selectedStudent) {
                // Open reusable purchase modal with student ID, callback, and parent modal ID
                openPurchaseConcessionsModal(selectedStudent.id, (result) => {
                    // Refresh concession info after purchase
                    updateConcessionInfo(selectedStudent);
                }, 'checkin-modal');
            } else {
                // Fallback: Try to get the student ID from the hidden field
                const studentIdField = document.getElementById('selected-student-id');
                if (studentIdField && studentIdField.value) {
                    const student = findStudentById(studentIdField.value);
                    if (student) {
                        openPurchaseConcessionsModal(student.id, (result) => {
                            updateConcessionInfo(student);
                        }, 'checkin-modal');
                    }
                }
            }
        });
    }
    
    // Confirm check-in button
    document.getElementById('confirm-checkin-btn').addEventListener('click', () => {
        handleCheckinSubmit();
    });
    
    // Close modal when clicking outside
    document.getElementById('checkin-modal').addEventListener('click', (e) => {
        if (e.target.id === 'checkin-modal') {
            closeCheckinModal();
        }
    });
}

/**
 * Handle check-in submission
 */
function handleCheckinSubmit() {
    if (!selectedStudent) return;
    
    const entryType = document.querySelector('input[name="entry-type"]:checked')?.value;
    if (!entryType) {
        showError('Please select an entry type');
        return;
    }
    
    const paymentMethod = document.getElementById('payment-method').value;
    const freeEntryReason = document.getElementById('free-entry-reason').value;
    const notes = document.getElementById('checkin-notes').value;
    
    // Validate payment for casual
    if (entryType === 'casual' && !paymentMethod) {
        showError('Please select a payment method for casual entry');
        return;
    }
    
    // Validate reason for free entry
    if (entryType === 'free' && !freeEntryReason) {
        showError('Please select a reason for free entry');
        return;
    }
    
    // Save check-in to Firestore
    saveCheckinToFirestore(selectedStudent, entryType, paymentMethod, freeEntryReason, notes);
}

/**
 * Save check-in to Firestore
 */
async function saveCheckinToFirestore(student, entryType, paymentMethod, freeEntryReason, notes) {
    try {
        // Get the selected check-in date from date picker
        const checkinDate = getSelectedCheckinDate(); // Returns Date object
        
        // Format date for document ID: YYYY-MM-DD
        const year = checkinDate.getFullYear();
        const month = String(checkinDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkinDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Create document ID: checkin-YYYY-MM-DD-firstname-lastname
        const firstName = student.firstName.toLowerCase().replace(/\s+/g, '-');
        const lastName = student.lastName.toLowerCase().replace(/\s+/g, '-');
        const docId = `checkin-${dateStr}-${firstName}-${lastName}`;
        
        // Build check-in data
        const checkinData = {
            studentId: student.id,
            studentName: getStudentFullName(student),
            checkinDate: firebase.firestore.Timestamp.fromDate(checkinDate),
            entryType: entryType,
            paymentMethod: entryType === 'casual' ? paymentMethod : null,
            freeEntryReason: entryType === 'free' ? freeEntryReason : null,
            amountPaid: entryType === 'casual' ? 15 : 0,
            concessionBlockId: null, // TODO: Link to actual block when concession deduction is implemented
            notes: notes || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown'
        };
        
        // Save to Firestore with custom document ID
        await firebase.firestore()
            .collection('checkins')
            .doc(docId)
            .set(checkinData);
        
        console.log('Check-in saved successfully:', docId);
        
        // Close modal and show success
        closeCheckinModal();
        showSnackbar(`${getStudentFullName(student)} checked in successfully!`, 'success');
        
        // Reload today's check-ins to display the new one
        loadTodaysCheckins();
        
    } catch (error) {
        console.error('Error saving check-in:', error);
        showSnackbar('Failed to save check-in. Please try again.', 'error');
    }
}
