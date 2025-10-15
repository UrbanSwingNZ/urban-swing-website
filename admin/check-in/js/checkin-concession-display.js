/**
 * checkin-concession-display.js - Concession info display
 */

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
