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
    dateInput.value = initialDate;
    selectedCheckinDate = parseDateString(initialDate);
    
    // Update display
    updateDateDisplay(initialDate, today);
    
    // Listen for date changes
    dateInput.addEventListener('change', handleDateChange);
    
    // Make custom calendar button trigger the native date picker
    const calendarButton = document.querySelector('.calendar-button');
    if (calendarButton) {
        calendarButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dateInput.showPicker(); // Modern browsers support this
        });
        // Enable pointer events on the button
        calendarButton.style.pointerEvents = 'auto';
    }
    
    // Date persists in localStorage across page refreshes
    // Only cleared manually or when user navigates away from check-in page
}

/**
 * Handle date change
 */
function handleDateChange(event) {
    const newDate = event.target.value;
    const today = getTodayDateString();
    
    // Save to localStorage
    localStorage.setItem(CHECKIN_DATE_KEY, newDate);
    
    // Update selected date
    selectedCheckinDate = parseDateString(newDate);
    
    // Update display
    updateDateDisplay(newDate, today);
    
    // Update transactions date display
    const transactionsDisplayElement = document.getElementById('transactions-date-display');
    if (transactionsDisplayElement) {
        if (newDate === today) {
            transactionsDisplayElement.textContent = "Today's";
        } else {
            const date = parseDateString(newDate);
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            const formattedDate = date.toLocaleDateString('en-NZ', options);
            transactionsDisplayElement.textContent = formattedDate;
        }
    }
    
    // Reload check-ins for the new date
    loadTodaysCheckins();
    
    // Reload transactions for the new date
    if (typeof loadCheckinTransactions === 'function') {
        loadCheckinTransactions();
    }
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
