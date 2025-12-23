# Online Payment Testing - Mock Transaction Data

**Purpose:** This document provides test transaction data you can manually add to Firestore to test online payment functionality without needing Stripe in dev mode.

---

## How to Add Test Transaction

1. Open Firebase Console → Firestore Database
2. Navigate to the `transactions` collection
3. Click "Add document"
4. Choose "Auto-ID" for the document ID (or use a custom ID)
5. Add the fields below **exactly as shown** (use the "Add field" button for each)

---

## Test Transaction Fields

### Required Fields (in alphabetical order):

| Field Name | Type | Value |
|------------|------|-------|
| `amountPaid` | number | `15` |
| `classDate` | timestamp | **[SET TO TODAY'S DATE at 00:00:00]** |
| `paymentMethod` | string | `online` |
| `reversed` | boolean | `false` |
| `studentId` | string | **[YOUR TEST STUDENT ID]** |
| `transactionDate` | timestamp | **[SET TO TODAY'S DATE at current time]** |
| `type` | string | `casual` |
| `usedForCheckin` | boolean | `false` |

### Optional Fields (add these for more realistic data):

| Field Name | Type | Value |
|------------|------|-------|
| `createdAt` | timestamp | **[SET TO TODAY'S DATE at current time]** |
| `invoiced` | boolean | `false` |
| `stripeCustomerId` | string | `cus_TEST123456789` |
| `stripePaymentIntentId` | string | `pi_TEST987654321` |

---

## Field Details

### Critical Fields for Online Payment Detection:
- **`paymentMethod: 'online'`** - This is what the system looks for to identify online payments
- **`type: 'casual'`** - Must be 'casual' or 'casual-student' (not 'concession-purchase')
- **`usedForCheckin: false`** - Must be false for the transaction to be selectable
- **`reversed: false`** - Reversed transactions are excluded from selection
- **`classDate`** - This is the date the system will match against the check-in date

### studentId:
Replace `[YOUR TEST STUDENT ID]` with the document ID of your test student employee from the `students` collection. You can find this by:
1. Go to Firestore → `students` collection
2. Find your test student
3. Copy the document ID (it's the long string in the left column)

### Timestamps:
For `classDate` and `transactionDate`:
1. Click the field value input
2. Choose "timestamp" type
3. Click the calendar icon
4. Set to today's date
5. For `classDate`: set time to 00:00:00
6. For `transactionDate`: set to current time

---

## Testing Scenarios

### Scenario 1: Exact Date Match (Auto-Selection)
- Set `classDate` to **today's date** at 00:00:00
- When you select this student on today's date, the system should:
  - Auto-select the "Online Payment" radio button
  - Display a green success message
  - Show "Using: Casual Entry for [today] - $15.00"
  - Enable the Confirm button immediately

### Scenario 2: Different Date (Manual Selection)
- Set `classDate` to **tomorrow's date** at 00:00:00
- When you select this student on today's date, the system should:
  - Show the "Online Payment" radio button option
  - Display a warning message when you select it
  - Show "⚠ No match for [today]. Found online payments for:"
  - List the transaction with a "Use This" button
  - Require you to click "Use This" to enable Confirm button

### Scenario 3: Multiple Transactions
- Create 2-3 transactions with different `classDate` values
- System should:
  - List all available transactions sorted by date (newest first)
  - Allow you to choose which one to use
  - Show "Change" button after selection to pick a different one

---

## After Adding Transaction

Once you've added the transaction to Firestore:

1. Go to the check-in page
2. Select your test student employee
3. Select today's date
4. The "Online Payment" radio button should appear
5. Test the scenarios above

---

## Cleanup After Testing

To mark the transaction as "used" (so it doesn't show up again):
1. Go to Firestore → `transactions` collection
2. Find your test transaction
3. Update `usedForCheckin` field to `true`

To delete the test transaction:
1. Find it in Firestore
2. Click the three dots → Delete document

---

## Quick Reference: Minimum Required Fields

```
amountPaid: 15 (number)
classDate: [today 00:00:00] (timestamp)
paymentMethod: "online" (string)
reversed: false (boolean)
studentId: "[your-student-id]" (string)
transactionDate: [today current time] (timestamp)
type: "casual" (string)
usedForCheckin: false (boolean)
```

---

## Expected System Behavior

✅ **Transaction qualifies if:**
- type = 'casual' OR 'casual-student'
- paymentMethod = 'online' OR has stripeCustomerId
- reversed = false
- usedForCheckin = false (OR matches currently editing transaction)
- Within ±30 days of check-in date

❌ **Transaction excluded if:**
- type = 'concession-purchase'
- paymentMethod = 'cash', 'eftpos', or 'bank'
- reversed = true
- usedForCheckin = true (and not currently editing)
- Outside ±30 day window

---

**Note:** Once you provide your test student ID, I can create a ready-to-paste JSON document for you.
