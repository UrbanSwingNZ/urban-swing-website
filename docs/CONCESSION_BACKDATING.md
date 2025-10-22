# Concession Purchase Backdating Feature

## Overview

The Purchase Concessions modal now includes a **date picker** in the header that allows admins to backdate concession purchases. This is essential for migrating historical data from spreadsheets into the new system.

## Visual Design

```
┌────────────────────────────────────────────────┐
│ Purchase Concessions    [📅 Oct 21, 2025]  ✕  │
├────────────────────────────────────────────────┤
│ Student: [Search or select...]                │
│ Package: [10-Pack - $120              ▼]      │
│ Payment: [Cash                        ▼]      │
├────────────────────────────────────────────────┤
│                      [Cancel]  [Complete Purchase] │
└────────────────────────────────────────────────┘
```

The date picker is **subtle, compact, and always visible** in the header between the title and close button.

## Features

### Default Behavior
- **Defaults to today's date** - Most purchases happen in real-time
- **No extra clicks needed** - For normal use, just ignore it and it works

### Backdating Capabilities
- **Click to change** - Simple date picker opens
- **No future dates** - Maximum date is today
- **Historical data entry** - Perfect for migrating spreadsheet records

### Visual Indicators

The date picker provides visual feedback based on how far back you're dating:

| Scenario | Border Color | Tooltip |
|----------|--------------|---------|
| Today | Default gray | "Purchase date (defaults to today)" |
| 1-30 days ago | Blue | "Backdating by X days" |
| > 30 days ago | Orange/Warning | "Warning: Backdating by X days" |

### Validation
- ✅ Cannot select future dates
- ✅ Visual warning for backdating > 30 days
- ✅ Tooltip shows exact number of days backdated

## How It Works

### User Flow

1. Admin clicks "Purchase Concessions" in check-in modal or concessions page
2. Modal opens with date picker showing today's date
3. **For current purchases:** Just select package and payment (ignore date)
4. **For historical data:** Click date picker, select past date, then proceed
5. Complete purchase as normal

### Technical Implementation

**purchaseDate Flow:**
```
Date Picker (default: today)
    ↓
User selects date (or keeps today)
    ↓
handlePurchaseSubmit() reads datePicker.value
    ↓
Converts to Date object: new Date(purchaseDate)
    ↓
completeConcessionPurchase(studentId, packageId, paymentMethod, purchaseDate)
    ↓
createConcessionBlock() → purchaseDate: Timestamp.fromDate(purchaseDate)
createTransaction() → transactionDate: Timestamp.fromDate(purchaseDate)
    ↓
Both use the SAME custom date
    ↓
Expiry calculated from purchase date: purchaseDate + expiryMonths
```

### Key Code Changes

**Modal HTML** (`concessions-modal.js`):
```html
<div class="modal-header">
    <h3><i class="fas fa-shopping-cart"></i> Purchase Concessions</h3>
    <input type="date" id="purchase-date-picker" class="purchase-date-picker">
    <button class="modal-close">&times;</button>
</div>
```

**Default Date Setup** (`openPurchaseConcessionsModal`):
```javascript
const datePicker = document.getElementById('purchase-date-picker');
const today = new Date();
datePicker.value = today.toISOString().split('T')[0];
datePicker.max = today.toISOString().split('T')[0]; // Prevent future
```

**Visual Feedback** (`setupPurchaseModalListeners`):
```javascript
datePicker.addEventListener('change', () => {
    const selectedDate = new Date(datePicker.value);
    const today = new Date();
    const daysDiff = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 30) {
        datePicker.style.borderColor = 'var(--warning-color, #ff9800)';
    } else if (daysDiff > 0) {
        datePicker.style.borderColor = 'var(--info-color, #2196F3)';
    }
});
```

**Purchase Submission** (`handlePurchaseSubmit`):
```javascript
const purchaseDate = document.getElementById('purchase-date-picker').value;
const result = await completeConcessionPurchase(
    studentId,
    packageId,
    paymentMethod,
    new Date(purchaseDate) // Custom date
);
```

**Backend** (`completeConcessionPurchase`):
```javascript
async function completeConcessionPurchase(studentId, packageId, paymentMethod, purchaseDate = null) {
    const actualPurchaseDate = purchaseDate || new Date();
    
    // Create block with custom date
    await createConcessionBlock(studentId, packageData, actualPurchaseDate);
    
    // Create transaction with same date
    await createTransaction(studentId, packageData, paymentMethod, actualPurchaseDate);
}
```

## Use Cases

### 1. Migrating Historical Data

**Scenario:** You have 50 students with concession purchases recorded in a spreadsheet from the past 6 months.

**Solution:**
1. For each student purchase in spreadsheet:
   - Open purchase modal
   - Set date picker to the original purchase date
   - Select matching package
   - Select payment method
   - Complete purchase
2. System creates blocks with correct historical dates
3. FIFO logic will use oldest blocks first (as expected)

### 2. Late Data Entry

**Scenario:** Admin forgets to record a cash payment from last Tuesday.

**Solution:**
1. Open purchase modal
2. Set date to last Tuesday
3. Select cash payment
4. System records it with correct date (blue border indicates backdate)

### 3. Reconciling Offline Payments

**Scenario:** Student made bank transfer last week but admin just verified it today.

**Solution:**
1. Set date to when payment was actually made
2. Record purchase with bank-transfer method
3. System accurately reflects payment timeline

## Best Practices

### When to Backdate
✅ **DO backdate for:**
- Historical data migration
- Late entry of verified payments
- Reconciling offline transactions
- Fixing data entry errors

❌ **DON'T backdate for:**
- Adjusting expiry dates (use admin tools instead)
- "Gaming" the FIFO system
- Hiding payment delays

### Data Integrity

The backdating feature maintains data integrity:

- **Expiry dates calculated correctly** - Based on purchase date, not entry date
- **FIFO works properly** - Oldest purchase (by actual date) used first
- **Audit trail preserved** - `createdAt` shows when entered, `purchaseDate` shows actual date
- **Transaction consistency** - Block and transaction use same date

### Migration Workflow

Recommended process for bulk historical data:

1. **Export spreadsheet** to CSV with: student name, purchase date, package, amount, payment
2. **Sort by purchase date** (oldest first)
3. **For each row:**
   - Search student in check-in system
   - Open purchase modal
   - Set date from spreadsheet
   - Select matching package
   - Select payment method
   - Complete purchase
4. **Verify balance** matches spreadsheet totals

## Styling

### CSS Classes

```css
/* Subtle, compact date picker */
.purchase-date-picker {
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 0.9rem;
    color: var(--text-muted);
    max-width: 150px;
}

/* Hover state */
.purchase-date-picker:hover {
    border-color: var(--admin-purple);
}

/* Focus state */
.purchase-date-picker:focus {
    border-color: var(--admin-purple);
    box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.1);
}
```

### Responsive Design

On mobile (< 768px):
- Font size reduces to 0.85rem
- Padding reduces to 5px 8px
- Max width reduces to 130px
- Still fully functional and accessible

## Future Enhancements

Potential improvements for this feature:

1. **Bulk Import** - Upload CSV to create multiple backdated purchases
2. **Date Presets** - Quick buttons for "Yesterday", "Last Week", "Last Month"
3. **Date Range Warning** - "You're entering data from 6 months ago, continue?"
4. **Audit Log** - Track who backdated what and why
5. **Notes Field** - Required explanation for backdates > 30 days

## Testing

### Test Scenarios

1. **Default behavior**
   - Open modal → verify shows today's date
   - Complete purchase → verify uses today

2. **Backdate recent**
   - Set date to 5 days ago
   - Verify blue border
   - Complete purchase → verify block has correct date

3. **Backdate old**
   - Set date to 60 days ago
   - Verify orange/warning border
   - Complete purchase → verify expiry calculated from old date

4. **Future date prevention**
   - Try to select tomorrow → should not allow
   - Max date should be today

5. **FIFO validation**
   - Create block dated 30 days ago
   - Create block dated today
   - Check-in → should use 30-day-old block first

## Summary

✅ **Always visible** - No hidden settings or advanced modes
✅ **Defaults to today** - Normal workflow unchanged
✅ **Allows backdating** - Essential for historical data
✅ **Visual feedback** - Clear indicators for backdated entries
✅ **Prevents errors** - No future dates, warnings for old dates
✅ **Consistent data** - Same date used for block, transaction, expiry calculation
✅ **No extra space** - Compact design in existing header

**Result:** Clean, professional solution for both real-time purchases and historical data migration.
