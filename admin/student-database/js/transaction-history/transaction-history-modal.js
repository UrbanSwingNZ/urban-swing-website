/**
 * transaction-history-modal.js
 * Main orchestrator for student transaction history modal
 * Displays class attendance, payment history, and concession information
 */

/**
 * Open transaction history modal for a student
 */
async function openTransactionHistoryModal(studentId) {
    const student = findStudentById(studentId);
    if (!student) {
        console.error('Student not found:', studentId);
        return;
    }
    
    const modal = document.getElementById('transaction-history-modal');
    const studentNameEl = document.getElementById('transaction-history-student-name');
    const studentEmailEl = document.getElementById('transaction-history-student-email');
    
    // Set student info
    studentNameEl.textContent = getStudentFullName(student);
    studentEmailEl.textContent = student.email || '';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Load all sections
    await Promise.all([
        loadTransactionHistoryAttendance(studentId),
        loadTransactionHistoryPayments(studentId),
        loadTransactionHistoryConcessions(studentId)
    ]);
}

/**
 * Close transaction history modal
 */
function closeTransactionHistoryModal() {
    const modal = document.getElementById('transaction-history-modal');
    modal.style.display = 'none';
}

/**
 * Initialize transaction history modal listeners
 */
function initializeTransactionHistoryModalListeners() {
    // Close button
    const closeBtn = document.querySelector('#transaction-history-modal .modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTransactionHistoryModal);
    }
    
    // Close when clicking outside
    const modal = document.getElementById('transaction-history-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeTransactionHistoryModal();
            }
        });
    }
    
    // Tab switching
    const tabs = document.querySelectorAll('.transaction-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.transaction-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active to clicked tab
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}
