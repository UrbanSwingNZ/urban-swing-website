/**
 * history-modal.js - Main orchestrator for history modal
 * Handles opening/closing modal and coordinating between modules
 */

/**
 * Open history modal
 */
function openHistoryModal() {
    const modal = document.getElementById('history-modal');
    
    // Initialize date range to last 7 days
    initializeHistoryDateRange();
    
    // Load history with default filter
    loadHistory();
    
    modal.style.display = 'flex';
}

/**
 * Close history modal
 */
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.style.display = 'none';
}

/**
 * Initialize history modal listeners
 */
function initializeHistoryModalListeners() {
    // Setup date range listeners
    setupDateRangeListeners();
    
    // Setup student search
    setupHistoryStudentSearch();
    
    // Close modal when clicking outside
    document.getElementById('history-modal').addEventListener('click', (e) => {
        if (e.target.id === 'history-modal') {
            closeHistoryModal();
        }
    });
}
