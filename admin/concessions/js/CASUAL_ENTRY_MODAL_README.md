# Casual Entry Modal - Usage Documentation

## Overview
The Casual Entry Modal is a reusable component for editing casual entry transactions across different admin pages (Student Database, Transactions page, etc.).

## File Locations
- **JavaScript**: `admin/concessions/js/casual-entry-modal.js`
- **CSS**: `admin/concessions/css/casual-entry-modal.css`

## Integration

### 1. Add to your HTML page

#### CSS (in `<head>`)
```html
<link rel="stylesheet" href="../concessions/css/casual-entry-modal.css?v=1">
```

#### JavaScript (before `</body>`)
```html
<script src="../concessions/js/casual-entry-modal.js?v=1"></script>
```

### 2. Initialize the modal

Call this once when your page loads (typically in your main initialization function):

```javascript
// Initialize the casual entry modal
if (typeof initializeCasualEntryModal === 'function') {
    initializeCasualEntryModal();
}
```

### 3. Open the modal

To open the modal for editing a casual entry transaction:

```javascript
await openCasualEntryModal(
    transactionId,      // Transaction document ID (string)
    checkinId,          // Check-in document ID (string)
    studentId,          // Student ID (string)
    studentName,        // Student full name (string)
    entryDate,          // Entry date (Date object)
    paymentMethod,      // Payment method (string: 'cash', 'eftpos', 'bank-transfer')
    amount,             // Amount paid (number)
    callback,           // Optional: function to call after successful update
    parentModalId       // Optional: parent modal ID to return to on cancel
);
```

### Example Usage

```javascript
// Example: Edit a casual entry from a transaction
async function editCasualEntry(transactionId) {
    // Fetch transaction data
    const transactionDoc = await firebase.firestore()
        .collection('transactions')
        .doc(transactionId)
        .get();
    
    const transactionData = transactionDoc.data();
    
    // Get student name
    const student = findStudentById(transactionData.studentId);
    const studentName = getStudentFullName(student);
    
    // Open the modal
    await openCasualEntryModal(
        transactionId,
        transactionData.checkinId,
        transactionData.studentId,
        studentName,
        transactionData.transactionDate.toDate(),
        transactionData.paymentMethod,
        transactionData.amountPaid,
        async (result) => {
            // Callback after successful update
            console.log('Entry updated!', result);
            await reloadYourData();
        },
        'your-parent-modal-id'  // Will reopen this modal when closed
    );
}
```

## Features

### Date Picker with Validation
- Prevents future dates
- Shows visual feedback for backdating:
  - **Orange border**: Backdating more than 30 days (warning)
  - **Blue border**: Backdating 1-30 days (info)
  - **Default border**: Same day or today

### Payment Method Selector
- Cash
- EFTPOS
- Bank Transfer

### Amount Display
- Shows the transaction amount (display only, not editable at this stage)
- Default: $15.00

### Student Information Card
- Displays student name
- Shows student email if available

### Modal Behavior
- Auto-enables the "Update Entry" button when all required fields are filled
- Closes and returns to parent modal on cancel or after successful update
- Executes optional callback after successful update
- Updates both the `transactions` and `checkins` collections in Firestore

## What Gets Updated

When a casual entry is updated, the following fields are modified:

### In `transactions` collection:
- `transactionDate`: Updated to the new date
- `paymentMethod`: Updated to the new payment method
- `updatedAt`: Set to current timestamp

### In `checkins` collection:
- `checkinDate`: Updated to the new date
- `paymentMethod`: Updated to the new payment method
- `updatedAt`: Set to current timestamp

## Dependencies

The modal requires:
1. **Firebase Firestore**: For database operations
2. **Utility functions** (optional but recommended):
   - `showLoading()` / `showLoading(false)`: Display loading state
   - `showSnackbar(message, type)`: Show success/error messages
   - `findStudentById(studentId)`: Get student data
   - `getStudentFullName(student)`: Format student name

## Modal State Management

The modal maintains its state in the `casualEntryModalData` object:
```javascript
{
    transactionId: string,
    checkinId: string,
    studentId: string,
    studentName: string,
    callback: function,
    parentModalId: string
}
```

This state is cleared when the modal is closed.

## Styling Customization

The modal uses CSS variables for theming:
- `--admin-purple`: Primary color
- `--admin-success`: Success color (amount display)
- `--text-primary`: Primary text color
- `--text-muted`: Muted text color
- `--bg-secondary`: Secondary background
- `--border-color`: Border color
- `--warning-color`: Warning state (backdating)
- `--info-color`: Info state (backdating)

## Future Enhancements

Potential additions for the future:
- Editable amount field
- Notes/comments field
- Entry type change (casual → free/concession)
- Transaction reversal/deletion
- Audit log display
