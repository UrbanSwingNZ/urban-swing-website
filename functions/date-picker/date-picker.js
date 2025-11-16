/**
 * Reusable Custom Date Picker Component
 * 
 * A Thursday-only date picker for class scheduling
 * 
 * Usage:
 * 1. Include this script in your HTML: <script src="/functions/date-picker/date-picker.js"></script>
 * 2. Include the CSS: <link rel="stylesheet" href="/styles/date-picker/date-picker.css">
 * 3. Add HTML elements:
 *    - Input: <input type="text" id="your-date-input" readonly placeholder="Select a date">
 *    - Calendar container: <div id="your-calendar" class="custom-calendar" style="display: none;"></div>
 * 4. Initialize: 
 *    const picker = new DatePicker('your-date-input', 'your-calendar', options);
 * 
 * Options:
 * - onDateSelected: callback function when date is selected
 * - allowedDays: array of day numbers (0=Sunday, 4=Thursday, etc.) - defaults to [4] (Thursday only)
 * - disablePastDates: boolean to disable past dates - defaults to true
 * - dateFormat: format for display - defaults to { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
 * - excludeDateRanges: array of {start: Date, end: Date} objects to exclude from selection
 */

class DatePicker {
    constructor(inputId, calendarId, options = {}) {
        // Configuration
        this.inputId = inputId;
        this.calendarId = calendarId;
        this.options = {
            onDateSelected: options.onDateSelected || null,
            onCalendarOpen: options.onCalendarOpen || null,
            onCalendarClose: options.onCalendarClose || null,
            allowedDays: options.allowedDays || [4], // Default to Thursday only
            disablePastDates: options.disablePastDates !== undefined ? options.disablePastDates : true,
            dateFormat: options.dateFormat || { year: 'numeric', month: 'short', day: 'numeric' },
            highlightToday: options.highlightToday !== undefined ? options.highlightToday : true,
            excludeDateRanges: options.excludeDateRanges || [] // Array of {start: Date, end: Date}
        };
        
        // State
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.selectedDate = null;
        this.closedownNights = []; // Will be populated from Firestore
        
        // Elements
        this.dateInput = null;
        this.calendar = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Get DOM elements
        this.dateInput = document.getElementById(this.inputId);
        this.calendar = document.getElementById(this.calendarId);
        
        if (!this.dateInput || !this.calendar) {
            console.error('DatePicker: Required elements not found');
            return;
        }
        
        // Load closedown nights from Firestore
        this.loadClosedownNights();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Show calendar when input is clicked
        this.dateInput.addEventListener('click', () => {
            this.calendar.style.display = 'block';
            this.renderCalendar();
            
            // Trigger callback if provided
            if (this.options.onCalendarOpen) {
                this.options.onCalendarOpen();
            }
        });
        
        // Close calendar when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.dateInput.contains(e.target) && !this.calendar.contains(e.target)) {
                const wasVisible = this.calendar.style.display === 'block';
                this.calendar.style.display = 'none';
                
                // Trigger callback if calendar was visible and is now closing
                if (wasVisible && this.options.onCalendarClose) {
                    this.options.onCalendarClose();
                }
            }
        });
    }
    
    async loadClosedownNights() {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.warn('DatePicker: Firebase not available, closedown nights will not be loaded');
            return;
        }
        
        try {
            const db = firebase.firestore();
            // Don't use orderBy to avoid requiring a Firestore index
            const snapshot = await db.collection('closedownNights').get();
            
            this.closedownNights = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    startDate: data.startDate.toDate(),
                    endDate: data.endDate.toDate()
                };
            }).sort((a, b) => a.startDate - b.startDate); // Sort in JavaScript instead
            
            console.log('DatePicker: Loaded', this.closedownNights.length, 'closedown periods');
            
            // Re-render calendar if it's currently visible
            if (this.calendar && this.calendar.style.display === 'block') {
                this.renderCalendar();
            }
        } catch (error) {
            console.error('DatePicker: Error loading closedown nights:', error);
            // Don't throw - calendar should still work without closedown data
        }
    }
    
    isDateInClosedownPeriod(date) {
        // Normalize the date to start of day for comparison
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        // Check if date falls within any closedown period
        return this.closedownNights.some(period => {
            const start = new Date(period.startDate);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(period.endDate);
            end.setHours(23, 59, 59, 999);
            
            return checkDate >= start && checkDate <= end;
        });
    }
    
    renderCalendar() {
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
        
        let html = `
            <div class="calendar-header">
                <button type="button" class="calendar-nav-btn" data-action="prev-month">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="calendar-month-year">${monthNames[this.currentMonth]} ${this.currentYear}</div>
                <button type="button" class="calendar-nav-btn" data-action="next-month">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">Sun</div>
                <div class="calendar-weekday">Mon</div>
                <div class="calendar-weekday">Tue</div>
                <div class="calendar-weekday">Wed</div>
                <div class="calendar-weekday${this.options.allowedDays.includes(4) ? ' thursday' : ''}">Thu</div>
                <div class="calendar-weekday">Fri</div>
                <div class="calendar-weekday">Sat</div>
            </div>
            <div class="calendar-days">
        `;
        
        // Add empty cells for days before the first day of month
        const startDay = firstDay.getDay();
        for (let i = 0; i < startDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        // Add days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dayOfWeek = date.getDay();
            const isAllowedDay = this.options.allowedDays.includes(dayOfWeek);
            const isPast = this.options.disablePastDates && date < today;
            const isClosedown = this.isDateInClosedownPeriod(date);
            const isToday = this.options.highlightToday && date.toDateString() === today.toDateString();
            const isSelected = this.selectedDate && date.toDateString() === this.selectedDate.toDateString();
            
            let classes = ['calendar-day'];
            if (isPast) {
                classes.push('past');
            } else if (isClosedown) {
                // Closedown dates - use the same 'not-allowed' class as non-allowed days
                classes.push('not-allowed');
            } else if (isAllowedDay) {
                classes.push('allowed-day');
                // Legacy support: add 'thursday' class if Thursday is an allowed day
                if (dayOfWeek === 4) {
                    classes.push('thursday');
                }
                if (isToday) classes.push('today');
                if (isSelected) classes.push('selected');
            } else {
                classes.push('not-allowed');
            }
            
            html += `<div class="${classes.join(' ')}" data-date="${date.toISOString()}">${day}</div>`;
        }
        
        html += '</div>';
        this.calendar.innerHTML = html;
        
        // Add event listeners for navigation buttons
        const prevBtn = this.calendar.querySelector('[data-action="prev-month"]');
        const nextBtn = this.calendar.querySelector('[data-action="next-month"]');
        
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.navigateToPreviousMonth();
        });
        
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.navigateToNextMonth();
        });
        
        // Add click listeners to allowed dates (excluding past and closedown dates via not-allowed class)
        const allowedSelector = '.calendar-day.allowed-day:not(.past)';
            
        this.calendar.querySelectorAll(allowedSelector).forEach(dayElement => {
            dayElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectDate(dayElement.dataset.date);
            });
        });
    }
    
    navigateToPreviousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
    }
    
    navigateToNextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.renderCalendar();
    }
    
    selectDate(dateStr) {
        this.selectedDate = new Date(dateStr);
        
        // Format date for display (d/mm/yyyy)
        const day = this.selectedDate.getDate();
        const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
        const year = this.selectedDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        this.dateInput.value = formattedDate;
        this.calendar.style.display = 'none';
        
        console.log('Date selected:', this.selectedDate);
        
        // Call callback if provided
        if (this.options.onDateSelected && typeof this.options.onDateSelected === 'function') {
            this.options.onDateSelected(this.selectedDate, formattedDate);
        }
    }
    
    /**
     * Public method to get the selected date
     * @returns {Date|null} The selected date or null if no date is selected
     */
    getSelectedDate() {
        return this.selectedDate;
    }
    
    /**
     * Public method to set a date programmatically
     * @param {Date|string} date - Date object or ISO date string
     */
    setDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (date instanceof Date && !isNaN(date)) {
            this.selectDate(date.toISOString());
        }
    }
    
    /**
     * Public method to clear the selected date
     */
    clearDate() {
        this.selectedDate = null;
        this.dateInput.value = '';
    }
    
    /**
     * Public method to reset calendar to current month/year
     */
    resetToCurrentMonth() {
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        if (this.calendar.style.display === 'block') {
            this.renderCalendar();
        }
    }
    
    /**
     * Public method to destroy the date picker (remove event listeners)
     */
    destroy() {
        // Note: This is a simplified destroy method
        // In a production environment, you'd want to keep references to all event listeners
        // and remove them explicitly
        this.calendar.style.display = 'none';
        this.dateInput.value = '';
        this.selectedDate = null;
    }
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatePicker;
}
