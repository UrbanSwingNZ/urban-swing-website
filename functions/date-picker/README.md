# Custom Date Picker Component

A reusable, customizable date picker component for selecting dates with configurable allowed days (e.g., Thursdays only).

**Refactored from:** `student-portal/prepay` inline implementation  
**Created:** November 7, 2025  
**Code Reduction:** ~389 lines removed from prepay page

## Features

- ✅ **Customizable allowed days** - Restrict selection to specific days of the week
- ✅ **Past date blocking** - Optionally disable past dates
- ✅ **Responsive design** - Works on mobile and desktop
- ✅ **Clean, modern UI** - Styled with CSS variables for easy theming
- ✅ **Thursday-only mode** - Default behavior for class scheduling
- ✅ **Callback support** - Hook into date selection events
- ✅ **No dependencies** - Pure JavaScript (Font Awesome for icons recommended)

---

## Quick Start (3 Steps)

### 1. Include Files
```html
<link rel="stylesheet" href="/styles/date-picker/date-picker.css">
<script src="/functions/date-picker/date-picker.js"></script>
```

### 2. Add HTML
```html
<div class="date-input-wrapper">
    <input type="text" id="my-date" readonly placeholder="Select date">
    <i class="fas fa-calendar-alt date-input-icon"></i>
</div>
<div id="my-calendar" class="custom-calendar" style="display: none;"></div>
```

### 3. Initialize
```javascript
const picker = new DatePicker('my-date', 'my-calendar');
```

---

## Full Setup

### 1. Include the files in your HTML

```html
<!-- CSS -->
<link rel="stylesheet" href="/styles/date-picker/date-picker.css">

<!-- JavaScript -->
<script src="/functions/date-picker/date-picker.js"></script>

<!-- Font Awesome (for icons) -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
```

### 2. Add HTML elements

```html
<!-- Date input wrapper -->
<div class="date-input-wrapper">
    <input 
        type="text" 
        id="my-date-input" 
        readonly
        placeholder="Click to select a date"
    >
    <i class="fas fa-calendar-alt date-input-icon"></i>
</div>

<!-- Calendar container (hidden by default) -->
<div id="my-calendar" class="custom-calendar" style="display: none;"></div>
```

### 3. Initialize the date picker

```javascript
// Basic usage (Thursday-only picker)
const picker = new DatePicker('my-date-input', 'my-calendar');

// With custom options
const picker = new DatePicker('my-date-input', 'my-calendar', {
    allowedDays: [1, 3, 5], // Monday, Wednesday, Friday
    disablePastDates: true,
    onDateSelected: (date, formattedDate) => {
        console.log('Selected:', date);
        console.log('Formatted:', formattedDate);
    }
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedDays` | Array | `[4]` | Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday) |
| `disablePastDates` | Boolean | `true` | Disable selection of past dates |
| `dateFormat` | Object | `{ weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }` | Format for date display (uses `toLocaleDateString` options) |
| `onDateSelected` | Function | `null` | Callback when date is selected: `(date, formattedDate) => {}` |
| `highlightToday` | Boolean | `true` | Highlight today's date in the calendar |

## Public Methods

### `getSelectedDate()`
Returns the currently selected date as a Date object, or null if no date is selected.

```javascript
const selectedDate = picker.getSelectedDate();
if (selectedDate) {
    console.log('Selected date:', selectedDate);
}
```

### `setDate(date)`
Programmatically set a date. Accepts a Date object or ISO date string.

```javascript
picker.setDate(new Date(2025, 10, 13)); // Set to November 13, 2025
picker.setDate('2025-11-13'); // Same result
```

### `clearDate()`
Clear the selected date.

```javascript
picker.clearDate();
```

### `resetToCurrentMonth()`
Reset the calendar view to the current month/year.

```javascript
picker.resetToCurrentMonth();
```

### `destroy()`
Clean up and remove event listeners (simplified implementation).

```javascript
picker.destroy();
```

## Examples

### Example 1: Thursday-Only Picker (Default)

```javascript
const picker = new DatePicker('class-date', 'class-calendar');
```

### Example 2: Weekday Picker

```javascript
const picker = new DatePicker('meeting-date', 'meeting-calendar', {
    allowedDays: [1, 2, 3, 4, 5], // Monday through Friday
    disablePastDates: true
});
```

### Example 3: Any Day Picker with Past Dates Allowed

```javascript
const picker = new DatePicker('event-date', 'event-calendar', {
    allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
    disablePastDates: false
});
```

### Example 4: With Callback

```javascript
const picker = new DatePicker('appointment-date', 'appointment-calendar', {
    allowedDays: [1, 3, 5], // Monday, Wednesday, Friday
    onDateSelected: (date, formattedDate) => {
        // Update other form fields
        document.getElementById('hidden-date').value = date.toISOString();
        
        // Trigger validation
        validateForm();
        
        // Log for debugging
        console.log('User selected:', formattedDate);
    }
});
```

### Example 5: Validation Before Submission

```javascript
const picker = new DatePicker('class-date', 'class-calendar');

document.getElementById('myForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const selectedDate = picker.getSelectedDate();
    
    if (!selectedDate) {
        alert('Please select a date');
        return;
    }
    
    // Check if it's a Thursday (if needed)
    if (selectedDate.getDay() !== 4) {
        alert('Please select a Thursday');
        return;
    }
    
    // Proceed with form submission
    console.log('Form is valid, submitting...');
});
```

## Styling Customization

The date picker uses CSS variables for easy theming. Override these in your stylesheet:

```css
:root {
    --admin-purple: #8b45ff; /* Main accent color */
    --admin-blue: #4287f5;   /* Secondary color */
    --admin-pink: #ff45a0;   /* Tertiary color */
}
```

For more detailed customization, you can override specific classes in your own CSS file:

```css
/* Custom calendar size */
.custom-calendar {
    min-width: 400px;
    padding: 1.5rem;
}

/* Custom day styling */
.calendar-day.allowed-day {
    background: rgba(0, 123, 255, 0.1);
    color: #007bff;
}

/* Custom selected state */
.calendar-day.selected {
    background: #007bff;
    color: white;
}
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Migration Guide

### Migrating from Inline Implementation

If you have an existing inline date picker implementation (like in the prepay page), here's how to migrate:

**Before:**
```javascript
// Old inline code
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

function setupCustomCalendar() { ... }
function renderCalendar() { ... }
```

**After:**
```javascript
// New reusable component
const picker = new DatePicker('class-date', 'custom-calendar', {
    onDateSelected: (date) => {
        console.log('Date selected:', date);
    }
});

// Access selected date when needed
const selectedDate = picker.getSelectedDate();
```

## Troubleshooting

### Calendar doesn't appear
- Ensure the calendar container has `style="display: none;"` initially
- Check that Font Awesome is loaded for the icons
- Verify that both JS and CSS files are properly included

### Dates aren't selectable
- Check the `allowedDays` configuration
- Verify `disablePastDates` setting if trying to select past dates
- Ensure the date isn't marked as `.past` when `disablePastDates` is true

### Styling issues
- Ensure CSS variables are defined (or the fallback colors are acceptable)
- Check for CSS conflicts with existing styles
- Verify the CSS file is loaded after other base styles

---

## Day Numbers Reference

| Day | Number |
|-----|--------|
| Sunday | 0 |
| Monday | 1 |
| Tuesday | 2 |
| Wednesday | 3 |
| Thursday | 4 |
| Friday | 5 |
| Saturday | 6 |

---

## Where to Use Next

Consider using this component in:
1. **Admin tools** - Transaction backdating
2. **Check-in system** - Date selection for check-ins
3. **Student database** - Filtering by date ranges
4. **Concessions** - Backdating concession purchases
5. **Reports** - Date range selection

---

## Files in This Component

```
functions/date-picker/
├── date-picker.js       # Main component (DatePicker class)
└── README.md            # This file

styles/date-picker/
└── date-picker.css      # Shared styles
```

See `student-portal/prepay/` for a working implementation.

---

## License

This component is part of the Urban Swing application.
