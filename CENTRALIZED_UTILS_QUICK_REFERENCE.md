# Centralized Utilities - Quick Reference

**Location:** `/js/utils/`  
**Import:** `import { ... } from '/js/utils/index.js';`

---

## Quick Start

```javascript
// Import what you need
import { 
    escapeHtml, 
    formatCurrency, 
    formatDate,
    isValidEmail,
    showLoading 
} from '/js/utils/index.js';

// Use them
const safe = escapeHtml(userInput);
const price = formatCurrency(25.50);  // "$25.50"
const date = formatDate(new Date());   // "19 Dec 2025"
const valid = isValidEmail("test@example.com");  // true
showLoading(true);  // Show spinner
```

---

## DOM Utilities (`dom-utils.js`)

### escapeHtml(text)
**Purpose:** Prevent XSS attacks by escaping HTML characters

```javascript
escapeHtml('<script>alert("xss")</script>')
// Returns: &lt;script&gt;alert("xss")&lt;/script&gt;

escapeHtml(null)  // Returns: ""
```

### createElement(tag, attributes, content)
**Purpose:** Create DOM elements programmatically

```javascript
createElement('div', { class: 'card', id: 'my-card' }, 'Hello')
// Returns: <div class="card" id="my-card">Hello</div>
```

---

## Format Utilities (`format-utils.js`)

### formatDate(date, options)
**Purpose:** Format dates in NZ locale

```javascript
formatDate(new Date())  
// Returns: "19 Dec 2025"

formatDate(Date.now())  
// Returns: "19 Dec 2025"

formatDate(null)  
// Returns: "-"
```

### formatDateDDMMYYYY(date)
**Purpose:** Format date as DD/MM/YYYY

```javascript
formatDateDDMMYYYY(new Date(2025, 11, 19))
// Returns: "19/12/2025"
```

### formatCurrency(amount)
**Purpose:** Format money in NZD with proper separators

```javascript
formatCurrency(25)       // "$25.00"
formatCurrency(1250.75)  // "$1,250.75"
formatCurrency(0)        // "$0.00"
formatCurrency(-10.50)   // "-$10.50"
```

### formatTime(timestamp)
**Purpose:** Extract and format time only

```javascript
formatTime(firestoreTimestamp)
// Returns: "2:30 PM"
```

### formatTimestamp(timestamp)
**Purpose:** Format Firestore timestamp to readable date

```javascript
formatTimestamp(firestoreTimestamp)
// Returns: "19 Dec 2025"

formatTimestamp(null)
// Returns: "Unknown"
```

### toTitleCase(text)
**Purpose:** Convert text to Title Case

```javascript
toTitleCase("john doe")      // "John Doe"
toTitleCase("JOHN DOE")      // "John Doe"
toTitleCase("john-paul doe") // "John-Paul Doe"
```

---

## Validation Utilities (`validation-utils.js`)

### isValidEmail(email)
**Purpose:** Validate email format

```javascript
isValidEmail("test@example.com")  // true
isValidEmail("invalid")           // false
isValidEmail("test@")             // false
isValidEmail("")                  // false
```

### hasFieldChanged(currentValue, originalValue)
**Purpose:** Detect if form field changed

```javascript
hasFieldChanged("new value", "old value")  // true
hasFieldChanged("same", "same")            // false
hasFieldChanged("", null)                  // false (both empty)
```

### isRequired(value)
**Purpose:** Check if required field has value

```javascript
isRequired("text")  // true
isRequired("")      // false
isRequired(null)    // false
isRequired("  ")    // false (whitespace only)
```

---

## Date Utilities (`date-utils.js`)

### normalizeDate(date)
**Purpose:** Set date to start of day (00:00:00)

```javascript
const today = new Date();  // 2025-12-19 14:30:45
normalizeDate(today);      // 2025-12-19 00:00:00
```

### isToday(timestamp)
**Purpose:** Check if date is today

```javascript
isToday(new Date())           // true
isToday(yesterday)            // false
isToday(firestoreTimestamp)   // true/false
```

### getStartOfToday()
**Purpose:** Get today at midnight

```javascript
getStartOfToday()  
// Returns: Date object set to today 00:00:00
```

### getEndOfToday()
**Purpose:** Get today at 23:59:59

```javascript
getEndOfToday()
// Returns: Date object set to today 23:59:59
```

### getTodayDateString()
**Purpose:** Get today as YYYY-MM-DD string

```javascript
getTodayDateString()
// Returns: "2025-12-19"
```

### formatDateToString(date)
**Purpose:** Convert Date to YYYY-MM-DD string

```javascript
formatDateToString(new Date(2025, 11, 19))
// Returns: "2025-12-19"
```

### parseDateString(dateString)
**Purpose:** Convert YYYY-MM-DD string to Date

```javascript
parseDateString("2025-12-19")
// Returns: Date object (2025-12-19)
```

---

## UI Utilities (`ui-utils.js`)

### showLoading(show)
**Purpose:** Show/hide loading spinner

```javascript
showLoading(true)   // Show spinner
showLoading(false)  // Hide spinner
```

**Note:** Check-in module has special version that also hides main-container

### showError(message)
**Purpose:** Display error message

```javascript
showError("Something went wrong")
// Shows browser alert (basic implementation)
```

### navigateTo(path)
**Purpose:** Navigate to different page

```javascript
navigateTo('/student-portal/dashboard/')
// Changes window location
```

### showSnackbar(message, type, duration)
**Purpose:** Show notification snackbar with icons

```javascript
showSnackbar('Check-in successful!', 'success', 3000)
// Shows green snackbar with checkmark icon

showSnackbar('Error occurred', 'error')
// Shows red snackbar with error icon

showSnackbar('Warning message', 'warning', 5000)
// Shows yellow snackbar with warning icon

showSnackbar('Info message', 'info')
// Shows blue snackbar with info icon
```

**Parameters:**
- `message` (string): Message to display
- `type` (string): 'success', 'error', 'warning', or 'info' (default: 'success')
- `duration` (number): Display time in milliseconds (default: 3000)

**Icons:**
- Success: `fa-check-circle`
- Error: `fa-exclamation-circle`
- Warning: `fa-exclamation-triangle`
- Info: `fa-info-circle`

### handleLogout()
**Purpose:** Centralized logout handler for Firebase authentication

```javascript
// Direct call
await handleLogout();

// In event listener
logoutButton.addEventListener('click', handleLogout);

// In HTML onclick (global exposure)
<button onclick="handleLogout()">Logout</button>
```

**Behavior:**
1. Signs out from Firebase Authentication
2. Redirects to home page (/)
3. Shows alert on error
4. Console logs any errors

**Note:** Available globally as `window.handleLogout` for backward compatibility with existing HTML onclick handlers.

---

## Common Patterns

### Form Validation
```javascript
import { isValidEmail, isRequired, escapeHtml } from '/js/utils/index.js';

function validateForm(formData) {
    if (!isRequired(formData.email)) {
        return "Email is required";
    }
    
    if (!isValidEmail(formData.email)) {
        return "Invalid email format";
    }
    
    // Escape user input before display
    const safeName = escapeHtml(formData.name);
    return null;  // Valid
}
```

### Display Transaction
```javascript
import { formatDate, formatCurrency, escapeHtml } from '/js/utils/index.js';

function renderTransaction(transaction) {
    return `
        <div class="transaction">
            <span>${escapeHtml(transaction.description)}</span>
            <span>${formatDate(transaction.date)}</span>
            <span>${formatCurrency(transaction.amount)}</span>
        </div>
    `;
}
```

### Date Filtering
```javascript
import { isToday, getStartOfToday, getEndOfToday } from '/js/utils/index.js';

function getTodayTransactions(transactions) {
    return transactions.filter(t => isToday(t.timestamp));
}

// Or use start/end for Firestore queries
const start = getStartOfToday();
const end = getEndOfToday();
```

### Loading States
```javascript
import { showLoading, showError } from '/js/utils/index.js';

async function loadData() {
    try {
        showLoading(true);
        const data = await fetchData();
        // Process data
    } catch (error) {
        showError("Failed to load data");
    } finally {
        showLoading(false);
    }
}
```

---

## Migration Guide

### Before (Old Pattern)
```javascript
// Duplicate function in file
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

// Use them
const safe = escapeHtml(input);
const price = formatCurrency(25.50);
```

### After (Centralized)
```javascript
// Import from centralized utilities
import { escapeHtml, formatCurrency } from '/js/utils/index.js';

// Use them (same API)
const safe = escapeHtml(input);
const price = formatCurrency(25.50);
```

**Benefits:**
- No duplicate code
- Better implementation (formatCurrency has thousand separators)
- Single place to fix bugs
- IDE autocomplete
- JSDoc documentation

---

## Browser Console Testing

```javascript
// Test imports work
import * as utils from '/js/utils/index.js';
console.log(utils);

// Test individual functions
import { escapeHtml, formatCurrency, formatDate, handleLogout } from '/js/utils/index.js';

console.log(escapeHtml('<script>alert("xss")</script>'));
// Expected: &lt;script&gt;alert("xss")&lt;/script&gt;

console.log(formatCurrency(1234.56));
// Expected: $1,234.56

console.log(formatDate(new Date()));
// Expected: 19 Dec 2025 (current date)

// Test handleLogout availability (don't actually call it in console)
console.log(typeof handleLogout);
// Expected: "function"

console.log(typeof window.handleLogout);
// Expected: "function"
```

---

## Troubleshooting

### Import Error: Module Not Found
**Problem:** `Failed to load module script: Expected a JavaScript module script...`

**Solution:** Check import path is absolute:
```javascript
// ✅ Correct
import { formatDate } from '/js/utils/index.js';

// ❌ Wrong
import { formatDate } from 'js/utils/index.js';
import { formatDate } from '../utils/index.js';
```

### Function is Undefined
**Problem:** `TypeError: formatDate is not a function`

**Solution:** Verify you imported the function:
```javascript
// ✅ Correct
import { formatDate } from '/js/utils/index.js';

// ❌ Wrong (forgot to import)
// Just using formatDate without import
```

### CORS Error
**Problem:** `CORS policy: No 'Access-Control-Allow-Origin' header...`

**Solution:** Must run through web server, not file://
```bash
# Use Firebase serve or any local server
firebase serve
```

---

## File Structure Reference

```
/js/utils/
├── index.js              # Import from this file
├── dom-utils.js          # escapeHtml, createElement
├── format-utils.js       # formatDate, formatCurrency, etc.
├── validation-utils.js   # isValidEmail, isRequired, etc.
├── date-utils.js         # Date manipulation functions
└── ui-utils.js           # showLoading, showError, navigateTo
```

**Always import from index.js:**
```javascript
import { ... } from '/js/utils/index.js';
```

---

## Related Documentation

- **CENTRALIZED_UTILS_SUMMARY.md** - Implementation summary
- **CENTRALIZED_UTILS_TESTING.md** - Test plan
- **UTILITY_AUDIT.md** - Audit findings
- **REFACTORING_RECOMMENDATIONS.md** - Item #11 details

---

**Last Updated:** December 19, 2025  
**Status:** Production Ready (pending user testing)
