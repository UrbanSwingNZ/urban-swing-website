/**
 * history-filters.js - Date range initialization and management
 */

/**
 * Initialize history date range inputs
 */
function initializeHistoryDateRange() {
    const dateFrom = document.getElementById('history-date-from');
    const dateTo = document.getElementById('history-date-to');
    
    // Set default range to last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    dateFrom.value = formatDateToString(sevenDaysAgo);
    dateTo.value = formatDateToString(today);
}

/**
 * Setup date range change listeners
 */
function setupDateRangeListeners() {
    const dateFrom = document.getElementById('history-date-from');
    const dateTo = document.getElementById('history-date-to');
    
    // Date range changes - reload history
    dateFrom.addEventListener('change', () => {
        loadHistory();
    });
    
    dateTo.addEventListener('change', () => {
        loadHistory();
    });
    
    // Calendar button clicks - trigger date picker
    const dateInputWrappers = document.querySelectorAll('#history-modal .date-input-wrapper');
    dateInputWrappers.forEach(wrapper => {
        const input = wrapper.querySelector('.date-input');
        
        wrapper.addEventListener('click', (e) => {
            if (e.target !== input && input.showPicker) {
                input.showPicker();
            }
        });
    });
}
