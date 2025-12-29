/**
 * history-filters.js - Date range initialization and management
 */

// Store DatePicker instances
let historyDateFromPicker = null;
let historyDateToPicker = null;

/**
 * Initialize history date range inputs with custom DatePicker
 */
function initializeHistoryDateRange() {
    // Set default range to last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // Initialize custom DatePicker for "from" date
    historyDateFromPicker = new DatePicker('history-date-from', 'history-calendar-from', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow past dates
        onDateSelected: (date, formattedDate) => {
            loadHistory();
        }
    });
    
    // Initialize custom DatePicker for "to" date
    historyDateToPicker = new DatePicker('history-date-to', 'history-calendar-to', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow past dates
        onDateSelected: (date, formattedDate) => {
            loadHistory();
        }
    });
    
    // Set initial dates
    historyDateFromPicker.setDate(sevenDaysAgo);
    historyDateToPicker.setDate(today);
}

/**
 * Setup date range change listeners
 */
function setupDateRangeListeners() {
    // DatePicker instances handle their own click events
    // No additional listeners needed
}
