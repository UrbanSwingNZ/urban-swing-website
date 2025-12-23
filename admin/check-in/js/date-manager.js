/**
 * date-manager.js - Check-in date management
 * Handles date picker state and localStorage persistence
 */

const CHECKIN_DATE_KEY = 'checkin-selected-date';
let selectedCheckinDate = null;

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString() {
    const today = new Date();
    return formatDateToString(today);
}

/**
 * Format Date object to YYYY-MM-DD string
 */
function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
function parseDateString(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Initialize date picker
 */
function initializeDatePicker() {
    const dateInput = document.getElementById('checkin-date');
    if (!dateInput) return;
    
    // Check localStorage for persisted date
    const savedDate = localStorage.getItem(CHECKIN_DATE_KEY);
    const today = getTodayDateString();
    
    // Use saved date if exists, otherwise use today
    const initialDate = savedDate || today;
    selectedCheckinDate = parseDateString(initialDate);
    
    // Update display
    updateDateDisplay(initialDate, today);
    
    // Initialize custom DatePicker component
    const checkinDatePicker = new DatePicker('checkin-date', 'checkin-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow past dates
        onDateSelected: (date, formattedDate) => {
            // Convert d/mm/yyyy to YYYY-MM-DD for consistency
            const [day, month, year] = formattedDate.split('/');
            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Save to localStorage
            localStorage.setItem(CHECKIN_DATE_KEY, dateString);
            
            // Update selected date
            selectedCheckinDate = date;
            
            // Update display
            updateDateDisplay(dateString, getTodayDateString());
            
            // Update transactions date display
            const transactionsDisplayElement = document.getElementById('transactions-date-display');
            if (transactionsDisplayElement) {
                if (dateString === getTodayDateString()) {
                    transactionsDisplayElement.textContent = "Today's";
                } else {
                    const options = { day: 'numeric', month: 'short', year: 'numeric' };
                    const displayDate = date.toLocaleDateString('en-NZ', options);
                    transactionsDisplayElement.textContent = displayDate;
                }
            }
            
            // Reload check-ins for the new date
            loadTodaysCheckins();
            
            // Reload transactions for the new date
            if (typeof loadCheckinTransactions === 'function') {
                loadCheckinTransactions();
            }
        }
    });
    
    // Set initial date on the date picker
    checkinDatePicker.setDate(selectedCheckinDate);
    
    // Date persists in localStorage across page refreshes
    // Only cleared manually or when user navigates away from check-in page
}

/**
 * Handle date change
 * (Legacy function - now handled by DatePicker component callback)
 */
function handleDateChange(event) {
    // This function is kept for backwards compatibility
    // but is no longer used with the custom DatePicker component
}

/**
 * Update date display text
 */
function updateDateDisplay(selectedDate, todayDate) {
    const displayElement = document.getElementById('checkin-date-display');
    if (!displayElement) return;
    
    if (selectedDate === todayDate) {
        displayElement.textContent = "Today's";
    } else {
        // Format date for display
        const date = parseDateString(selectedDate);
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-NZ', options);
        displayElement.textContent = formattedDate;
    }
}

/**
 * Get currently selected check-in date
 */
function getSelectedCheckinDate() {
    return selectedCheckinDate || new Date();
}

/**
 * Get selected check-in date as string (YYYY-MM-DD)
 */
function getSelectedCheckinDateString() {
    return document.getElementById('checkin-date')?.value || getTodayDateString();
}

/**
 * Check if selected date is today
 */
function isSelectedDateToday() {
    const selectedDateStr = getSelectedCheckinDateString();
    const todayStr = getTodayDateString();
    return selectedDateStr === todayStr;
}

// Expose functions to window for use by modules and other scripts
window.getTodayDateString = getTodayDateString;
window.getSelectedCheckinDate = getSelectedCheckinDate;
window.getSelectedCheckinDateString = getSelectedCheckinDateString;
window.isSelectedDateToday = isSelectedDateToday;
