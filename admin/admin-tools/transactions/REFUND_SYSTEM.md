# Refund System - Feature Specification

## Overview
A comprehensive refund system for processing full and partial refunds on transactions, with Stripe API integration and proper transaction tracking.

## Transaction Types in System
Based on codebase analysis, the following transaction types exist:
- `casual` - Casual entry (standard rate)
- `casual-student` - Casual entry (student rate)
- `concession-purchase` - Concession package purchase
- `concession-gift` - Gifted concessions (non-financial, no refund support needed)

**Refund Support:** `casual`, `casual-student`, and `concession-purchase` types can be refunded. `concession-gift` is excluded as it represents gifted concession blocks with no financial transaction.

---

## 1. UI Location
**Location:** `/admin/admin-tools/transactions` (Transactions page)

**Action Button:**
- Add a "Refund" button in the Actions column
- Icon: `<i class="fas fa-undo"></i>` or `<i class="fas fa-receipt"></i>`
- Button state logic:
  - Active: Transaction not refunded OR partially refunded (can refund remainder)
  - Disabled: Transaction fully refunded OR transaction already reversed OR transaction type is `concession-gift`

---

## 2. Refund Modal

### Modal Trigger
Clicking the Refund button opens a modal with:

### Modal Fields
1. **Transaction Summary** (read-only display)
   - Original Amount: `$XX.XX`
   - Previously Refunded: `$XX.XX` (if partial refunds exist)
   - Available to Refund: `$XX.XX`

2. **Refund Amount** (input)
   - Type: Number input with currency formatting
   - Validation:
     - Must be > $0
     - Must be ≤ available amount
     - Cannot exceed original transaction amount minus any previous refunds

3. **Payment Method** (dropdown, required)
   - Options:
     - Cash
     - EFTPOS
     - Online
     - Bank Transfer
   - **IMPORTANT:** This is the payment method used to process the refund, NOT copied from the original transaction
   - This value will be displayed in the "Payment Method" column on the Transactions table
   - Default: Pre-select based on original transaction's payment method (convenience), but user can change

4. **Refund Type** (auto-calculated, displayed)
   - Shows "Full Refund" or "Partial Refund" based on amount entered
   - Updates dynamically as user types

5. **Reason** (textarea, optional)
   - Max 500 characters
   - Placeholder: "Optional: Note the reason for this refund..."
   - Stored with refund transaction

6. **Stripe Status** (read-only, conditional)
   - Only displayed if transaction has `stripeCustomerId` or `paymentMethod: 'stripe'`
   - Shows: "This refund will be processed through Stripe"
   - If not Stripe: "Database-only refund (no payment processor action)"

### Modal Actions
- **Process Refund** button (primary)
- **Cancel** button (secondary)

---

## 3. Refund Processing

### 3.1 Original Transaction Updates
When refund is processed, update the original transaction document:

**New/Updated Fields:**
```javascript
{
  refunded: 'full' | 'partial' | 'none',  // String, not boolean
  totalRefunded: <number>,  // Cumulative amount refunded
  refundCount: <number>,    // Number of refund transactions
  lastRefundDate: <timestamp>,
  updatedAt: <timestamp>
}
```

### 3.2 Refund Transaction Creation
Create new document in `transactions` collection:

**Document ID Format:**
```
[studentId]-refund-[timestamp]
```
Example: `STU123-refund-1704985200000`

**Required Fields:**
```javascript
{
  // Core identification
  type: 'refund',
  studentId: <string>,
  studentName: <string>,
  
  // Refund details
  amountRefunded: <number>,
  refundDate: <timestamp>,  // When refund was processed
  createdAt: <timestamp>,
  transactionDate: <timestamp>,  // Same as refundDate for sorting
  paymentMethod: <string>,  // How the refund was issued (cash, eftpos, online, bank-transfer)
                            // IMPORTANT: This is the refund payment method, NOT copied from original
  
  // Original transaction reference
  parentTransactionId: <string>,  // Original transaction ID
  originalTransactionDate: <timestamp>,
  originalAmount: <number>,  // Original transaction amount
  
  // Additional tracking
  reason: <string>,  // Empty string if not provided
  refundedBy: <string>,  // Admin email (always dance@urbanswing.co.nz)
  refundMethod: 'stripe' | 'manual',  // 'stripe' if Stripe used, else 'manual'
  
  // Stripe integration (optional)
  stripeRefundId: <string>,  // Only if Stripe refund
  stripeCustomerId: <string>,  // Copy from original if exists
  
  // Reversal tracking (only present if reversed)
  // reversed: true,  // Only add this field when refund is reversed
  // reversedAt: <timestamp>,  // Only add when reversed
  
  // Standard fields
  invoiced: false,
  remainingRefundable: <number>  // How much of original can still be refunded after this
}
```

---

## 4. Partial Refund Handling

### Multiple Refunds Allowed
- If `refunded: 'partial'`, the Refund button remains active
- Modal shows previously refunded amount
- Available amount = Original Amount - Total Refunded
- Each partial refund creates a separate refund transaction

### Cumulative Tracking
On the original transaction:
```javascript
totalRefunded += currentRefundAmount;
refundCount += 1;
refunded = (totalRefunded >= originalAmount) ? 'full' : 'partial';
```

### UI Indicators
- Partial refunds show in Type column with indicator
- Example: `CONCESSION PURCHASE` + `PARTIALLY REFUNDED` badge
- Full refunds show: `CONCESSION PURCHASE` + `FULLY REFUNDED` badge

---

## 5. Transaction Display Styling

### Refunded Transaction Row Styling
Add CSS class to refunded transaction rows:

```css
/* Partially refunded */
.partially-refunded-transaction {
  background-color: color-mix(in srgb, var(--warning) 8%, transparent) !important;
  border-left: var(--border-width-thick) solid var(--warning);
}

/* Fully refunded */
.fully-refunded-transaction {
  background-color: color-mix(in srgb, var(--purple) 8%, transparent) !important;
  border-left: var(--border-width-thick) solid var(--purple);
}
```

**Note:** Uses color variables from `colors.css` and design tokens from `design-tokens.css`.

### Type Column Badges
Create new badges in `/styles/badges.css`:

```css
/* Refund badge */
.type-badge.refund {
  background-color: var(--info);
  color: var(--text-on-primary);
}

.type-badge.refund::before {
  content: '\f0d6';  /* fa-undo */
  font-family: 'Font Awesome 5 Free';
  font-weight: var(--font-weight-bold);
  margin-right: var(--space-xs);
}

/* Refund status badges (shown with original transaction type) */
.refund-status-badge {
  display: inline-block;
  font-size: var(--font-size-xs);
  padding: var(--space-xxs) var(--space-xs);
  border-radius: var(--radius-xs);
  margin-left: var(--space-xs);
  font-weight: var(--font-weight-semibold);
}

.refund-status-badge.partial {
  background-color: color-mix(in srgb, var(--warning) 20%, transparent);
  color: var(--warning);
  border: var(--border-width-thin) solid var(--warning);
}

.refund-status-badge.full {
  background-color: color-mix(in srgb, var(--purple) 20%, transparent);
  color: var(--purple);
  border: var(--border-width-thin) solid var(--purple);
}
```

**Note:** All spacing, sizing, and color values use design tokens from the `/styles` folder.

### Refund Button States
```css
/* Active refund button */
.btn-icon.btn-refund:not(:disabled) {
  color: var(--info);
}

.btn-icon.btn-refund:not(:disabled):hover {
  background-color: var(--info);
  color: white;
}

/* Disabled refund button (fully refunded) */
.btn-icon.btn-refund:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

---

## 6. Badge Styling

Add to `/styles/badges.css`:

```css
/* Refund transaction type badge */
.type-badge.refund {
  background: linear-gradient(135deg, var(--purple-light) 0%, var(--purple) 100%);
  color: var(--text-on-primary);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  padding: var(--space-xxs) var(--space-sm);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.type-badge.refund i {
  font-size: var(--font-size-sm);
}
```

**Note:** Uses purple gradient from color palette with design tokens for all dimensions.

---

## 7. Modal Visual Indicators

### Partial Refund Warning
When original transaction has `refunded: 'partial'`, show info banner at top of modal:

```html
<div class="refund-info-banner partial">
  <i class="fas fa-info-circle"></i>
  <div>
    <strong>Previous Refunds:</strong> 
    $XX.XX has already been refunded on this transaction.
    <br>
    <strong>Remaining refundable:</strong> $XX.XX
  </div>
</div>
```

### Full Refund Indicator
When amount entered equals remaining refundable:

```html
<div class="refund-type-indicator full">
  <i class="fas fa-check-circle"></i>
  This will <strong>fully refund</strong> the remaining balance.
</div>
```

---

## 8. Refund Reversal

### Reversing a Refund Transaction
- Refund transactions can be reversed using existing delete/reverse functionality
- When reversed:
  ```javascript
  {
    reversed: true,
    reversedAt: <timestamp>
  }
  ```
- Display uses same `reversed-transaction` styling as other reversed transactions

### Impact on Original Transaction
When a refund is reversed:

1. **Update original transaction:**
   ```javascript
   totalRefunded -= reversedRefundAmount;
   refundCount -= 1;
   
   if (totalRefunded === 0) {
     refunded = 'none';
   } else if (totalRefunded < originalAmount) {
     refunded = 'partial';
   }
   // refunded cannot be 'full' after reversal
   ```

2. **Stripe handling:**
   - Database-only reversal
   - No Stripe API call (Stripe refunds cannot be reversed through API)
   - Note in system: "Refund reversed in database only. Stripe refund remains processed."

---

## 9. Type-Specific Reversal Logic

### 9.1 Casual & Casual-Student Transactions
When reversing (deleting) a `casual` or `casual-student` transaction:

```javascript
// Check for associated check-in
if (transaction.checkinId) {
  // Show confirmation modal
  const modal = new ConfirmationModal({
    title: 'Delete Check-in Too?',
    message: `This transaction has an associated check-in. 
              Do you want to delete the check-in as well?`,
    variant: 'warning',
    showCheckbox: true,
    checkboxLabel: 'Also delete the check-in record',
    checkboxId: 'delete-checkin-checkbox',
    onConfirm: async (checkboxValue) => {
      await reverseTransaction(transaction.id);
      
      if (checkboxValue) {
        await deleteCheckin(transaction.checkinId);
      }
    }
  });
}
```

**Logic:**
- Always reverse the transaction
- Optionally delete the check-in (user choice)
- If check-in was concession-based, restore the concession entry

### 9.2 Concession-Purchase Transactions
When reversing a `concession-purchase` transaction:

**Step 1: Find Associated Concession Block**
```javascript
const blocksSnapshot = await db.collection('concessionBlocks')
  .where('transactionId', '==', transactionId)
  .get();

if (blocksSnapshot.empty) {
  // No block found - safe to reverse
  await reverseTransaction(transactionId);
  return;
}

const blockData = blocksSnapshot.docs[0].data();
const blockId = blocksSnapshot.docs[0].id;
```

**Step 2: Check Usage Status**
```javascript
const hasBeenUsed = blockData.remainingQuantity < blockData.originalQuantity;

if (!hasBeenUsed) {
  // Block is unused - delete it
  await deleteConcessionBlock(blockId);  // Uses existing function
  await reverseTransaction(transactionId);
  
} else {
  // Block has been used - lock it instead
  const refundAmount = originalTransactionAmount;
  const refundDate = new Date().toLocaleDateString('en-NZ');
  
  const lockNote = `Refund of $${refundAmount.toFixed(2)} issued on ${refundDate}. ` +
                   `Original transaction reversed. ` +
                   (reasonProvided ? `Reason: ${reasonProvided}` : '');
  
  await lockConcessionBlock(blockId, lockNote);  // Uses existing function
  await reverseTransaction(transactionId);
}
```

**Notes Field:**
- Concession blocks have a `lockNotes` field (confirmed from codebase)
- Use existing `updateConcessionBlockNotes()` function
- Lock note should include:
  - Refund amount
  - Refund date
  - Note that transaction was reversed
  - Admin-provided reason (if any)

### 9.3 Concession-Gift Transactions
- **No refund support needed:** Concession-gift represents gifted concession blocks with no financial transaction
- Refund button should be disabled for these transactions
- Existing reverse/delete functionality remains unchanged

---

## 10. Stripe Integration

### When to Use Stripe API
Process through Stripe if:
- Original transaction has `stripeCustomerId` field, OR
- Original transaction has `paymentMethod: 'stripe'` or `paymentMethod: 'online'`

### Stripe Refund API Call
```javascript
// In Firebase Functions (server-side)
const { refundPayment } = require('./stripe/stripe-payment');

// The refundPayment function already exists in the codebase:
// functions/stripe/stripe-payment.js

// Usage:
const result = await refundPayment(
  stripePaymentIntentId,  // Need to store this with transaction
  'requested_by_customer'  // or other reason
);

if (result.success) {
  // Save stripeRefundId to refund transaction
  refundTransaction.stripeRefundId = result.refundId;
  refundTransaction.refundMethod = 'stripe';
  refundTransaction.stripeRefundProcessedAt = Date.now();
} else {
  // Handle error - show to admin
  throw new Error(`Stripe refund failed: ${result.error}`);
}
```

### ⚠️ CRITICAL: Stripe Refund Reversals

**IMPORTANT:** Stripe refunds **CANNOT** be reversed through the Stripe API. Once money is refunded to a customer's card, it cannot be automatically charged back.

**Recommended Approach:**
1. **Prevent Stripe Refund Reversals:** If `refundMethod === 'stripe'`, disable the reverse/delete button on the refund transaction
2. **UI Warning:** Show tooltip: "Stripe refunds cannot be reversed. Contact the student to arrange re-payment if needed."
3. **Alternative:** If you must track the reversal:
   - Allow database-only reversal
   - Add clear warning in confirmation modal
   - Update original transaction totals
   - Add note that this is administrative only - no money movement occurs
   - Require manual follow-up with student for re-payment

**Confirmation Modal for Stripe Refund Reversal (if allowed):**
```javascript
const modal = new ConfirmationModal({
  title: 'Reverse Stripe Refund?',
  message: `
    <div class="warning-banner">
      <i class="fas fa-exclamation-triangle"></i>
      <strong>WARNING:</strong> This is a database-only reversal.
    </div>
    <p>The customer has already received $${refundAmount.toFixed(2)} back to their card through Stripe.</p>
    <p><strong>This reversal will NOT charge the customer's card again.</strong></p>
    <p>You will need to manually arrange re-payment with the student.</p>
    <p>Are you sure you want to mark this refund as reversed in the system?</p>
  `,
  variant: 'danger',
  confirmText: 'Reverse (Database Only)',
  // ...
});
```

**Recommendation:** Disable reversal for Stripe refunds to avoid confusion.

### Required Updates to Transaction Structure
**Add to all Stripe transactions going forward:**
```javascript
{
  stripePaymentIntentId: <string>,  // Payment Intent ID from Stripe
  stripeCustomerId: <string>,       // Already exists
  stripeChargeId: <string>          // Charge ID (optional, for reference)
}
```

### Error Handling
If Stripe refund fails:
1. Show error to admin with Stripe error message
2. Do NOT create refund transaction in database
3. Log error for debugging
4. Suggest manual refund through Stripe dashboard if needed

### Manual (Non-Stripe) Refunds
For transactions without Stripe:
- `refundMethod: 'manual'`
- No Stripe API call
- Database-only refund
- Admin responsible for processing refund externally (cash, bank transfer, etc.)

---

## 11. File Structure

### New Files to Create

#### `/admin/admin-tools/transactions/refund-handler.js`
Main refund logic module in the transactions folder containing:
- `openRefundModal(transaction)` - Modal display and form handling
- `processRefund(refundData)` - Core refund processing (includes refund payment method)
- `validateRefundAmount(amount, maxRefundable)` - Validation
- `validateRefundPaymentMethod(paymentMethod)` - Ensure payment method is selected
- `calculateRefundStatus(originalAmount, totalRefunded)` - Helper function

#### `/admin/admin-tools/transactions/refunds/` (NEW FOLDER)
Create new subfolder for refund-related modules:

##### `/admin/admin-tools/transactions/refunds/refund-data.js`
- `updateOriginalTransaction(transactionId, refundAmount, isFullRefund)` - Update parent transaction
- `createRefundTransaction(refundDetails)` - Create refund record in Firestore
- `getRefundHistory(transactionId)` - Fetch all refunds for a transaction

##### `/admin/admin-tools/transactions/refunds/refund-reversal.js`
- `reverseRefund(refundTransactionId)` - Handle refund reversal
- `canReverseRefund(refundTransaction)` - Check if reversal is allowed (Stripe check)
- `updateTransactionAfterReversal(transactionId, refundAmount)` - Update original transaction

##### `/admin/admin-tools/transactions/refunds/refund-display.js`
- Helper functions for rendering refund UI elements
- Refund status badge generation
- Row styling application

##### `/admin/admin-tools/transactions/refunds/refund-modal.css`
Styles specific to refund modal and indicators

**Note on Modal:** Can we reuse the existing shared modal component (`/components/modals/`) or do we need a custom modal for the refund functionality? The shared `ConfirmationModal` might work if we can pass custom HTML content, otherwise we may need a custom refund modal component.

### Files to Modify

#### `transactions.js`
- Import refund handler
- Add refund button to action column
- Add event listeners for refund buttons
- Handle refund status display

#### `js/display.js`
- Add refund status badges to transaction rows
- Add CSS classes for refunded transactions
- Add refund button to action buttons
- Update type badge logic to include refund status indicators

#### `js/actions.js`
- Add refund-specific action handlers
- Update delete/reverse logic for refund transactions
- Add type-specific reversal confirmations (casual with check-in, concession with block)

#### `js/data-loader.js`
- Include refunded/totalRefunded fields in normalized data
- Handle refund transactions in data loading

#### `/styles/badges.css`
- Add `.type-badge.refund` styles
- Add `.refund-status-badge` styles (partial/full indicators)

### Firebase Functions Updates

#### `functions/index.js`
Add new function:
```javascript
exports.processRefund = require('./process-refund').processRefund;
```

#### `functions/process-refund.js` (NEW)
Server-side refund processing:
- Validate refund amount
- Call Stripe API if needed
- Create refund transaction
- Update original transaction
- Handle concession block locking if applicable
- Return success/failure

---

## 12. Permissions

**Refund Permission:** Super Admin only (`dance@urbanswing.co.nz`)

**Rationale:** 
- Transactions page already restricted to super admin
- No additional permission checks needed
- Only super admin can reverse transactions

---

## 13. Modal Implementation Question

**QUESTION:** Can we reuse the existing shared modal component from `/components/modals/confirmation-modal.js`?

The refund modal needs:
- Transaction summary display (read-only)
- Currency input field with validation
- Textarea for reason (optional)
- Dynamic refund type indicator (Full/Partial)
- Conditional Stripe status message
- Two action buttons (Process Refund, Cancel)

**If ConfirmationModal supports:**
- Custom HTML content in message
- Form inputs within the modal
- Dynamic content updates (for the Full/Partial indicator)
- Custom button handlers with form data access

**Then:** Use ConfirmationModal with custom content

**Otherwise:** Create a custom `RefundModal` class extending the base modal pattern

---

## 14. Email Notifications (Future Enhancement)

**Status:** Not implementing in initial version, but document for future

**Suggested Implementation:**
- Send email to student when refund is processed
- Include:
  - Refund amount
  - Original transaction details
  - Reason (if provided by admin)
  - Expected processing time (if Stripe)
  - Contact information for questions

**Template Location:** `functions/emails/templates/refund-notification.html`

**Function:** `functions/email-notifications.js` (already exists)

**Trigger:** After successful refund processing

---

## 15. Concession Block Fields

### Confirmed Existing Fields
From codebase analysis:
- `isLocked: boolean` - Prevents use of block
- `lockNotes: string` - Reason for lock/notes
- `lockedAt: timestamp`
- `lockedBy: string` - User ID
- `originalQuantity: number`
- `remainingQuantity: number`
- `transactionId: string` - Associated transaction
- `studentId: string`
- `packageId: string`

### Existing Functions to Use
- `lockConcessionBlock(blockId, notes)` - Lock a block
- `unlockConcessionBlock(blockId, notes)` - Unlock a block
- `deleteConcessionBlock(blockId)` - Delete unused block (hard delete)
- `updateConcessionBlockNotes(blockId, notes)` - Update notes only

**Note:** Concession blocks are **hard deleted**, not soft deleted (confirmed from codebase)

---

## 16. Refund History Array (Alternative Suggestion)

### Option A: Current Spec (Individual Fields)
```javascript
// On original transaction
{
  refunded: 'partial' | 'full' | 'none',
  totalRefunded: <number>,
  refundCount: <number>,
  lastRefundDate: <timestamp>
}
```

### Option B: Refund History Array
```javascript
// On original transaction
{
  refunded: 'partial' | 'full' | 'none',
  totalRefunded: <number>,  // Keep for quick reference
  refundHistory: [
    {
      refundTransactionId: <string>,
      amount: <number>,
      date: <timestamp>,
      refundedBy: <string>,
      reason: <string>,
      reversed: <boolean>  // Track if this specific refund was reversed
    }
  ]
}
```

**Pros of Option B:**
- Complete audit trail on the parent transaction
- Easier to display refund history in UI
- Track which specific refunds were reversed

**Cons of Option B:**
- Duplicates data (refund transactions already exist separately)
- Array updates are more complex in Firestore
- Potential for sync issues between array and refund transactions

**Recommendation:** 
Ask Business Analyst to evaluate:
- Is the refund transaction collection sufficient for audit trail?
- Do we need quick access to refund history on parent transaction?
- How important is tracking reversed status of individual refunds?

---

## 17. Testing Checklist

### Basic Refund Flow
- [ ] Refund button appears for non-reversed transactions
- [ ] Refund button disabled for fully refunded transactions
- [ ] Modal opens with correct transaction details
- [ ] Amount validation works correctly
- [ ] Cannot refund more than available amount
- [ ] Reason field accepts text up to 500 characters

### Full Refund
- [ ] Full refund creates correct refund transaction
- [ ] Original transaction marked as `refunded: 'full'`
- [ ] `totalRefunded` equals original amount
- [ ] Refund button becomes disabled
- [ ] Row styling applied correctly

### Partial Refund
- [ ] Partial refund creates correct refund transaction
- [ ] Original transaction marked as `refunded: 'partial'`
- [ ] `totalRefunded` updated correctly
- [ ] Refund button remains active
- [ ] Can issue multiple partial refunds
- [ ] Final partial refund that completes total sets status to 'full'

### Stripe Integration
- [ ] Stripe refunds call API correctly
- [ ] `stripeRefundId` stored with refund transaction
- [ ] Non-Stripe transactions skip API call
- [ ] Error handling works for failed Stripe refunds

### Refund Reversal
- [ ] Refund transaction can be reversed
- [ ] Original transaction `totalRefunded` decremented
- [ ] Original transaction `refundCount` decremented
- [ ] Original transaction status updates correctly
- [ ] Refund button becomes active again if needed
- [ ] Stripe refunds cannot be reversed (button disabled)
- [ ] Manual refunds can be reversed normally

### Type-Specific Logic
- [ ] Casual transaction reversal prompts for check-in deletion
- [ ] Concession-purchase with unused block deletes block
- [ ] Concession-purchase with used block locks block
- [ ] Lock notes include refund details and reason
- [ ] Concession-gift transactions have disabled refund button

### Display & UI
- [ ] Refund transactions appear in table as separate rows
- [ ] Refund type badge displays correctly
- [ ] Refunded transaction rows have correct styling
- [ ] Partial refund status badge appears
- [ ] Full refund status badge appears
- [ ] Refund payment method displays in Payment Method column
- [ ] Payment method selector shows all options in refund modal
- [ ] Default payment method is pre-selected but can be changed
- [ ] Modal shows previous refunds correctly

---

## 18. Database Migration Notes

**No migration required** - New fields will be added as refunds are processed:
- Existing transactions without `refunded` field: treat as `'none'`
- Existing transactions without `totalRefunded`: treat as `0`
- Backward compatible

---

## 19. Future Enhancements

1. **Bulk Refund Processing**
   - Select multiple transactions
   - Process refunds in batch

2. **Refund Reports**
   - Total refunds by date range
   - Refund reasons analysis
   - Student refund history

3. **Automated Refund Approval**
   - Set maximum auto-approve amount
   - Require secondary approval for large refunds

4. **Stripe Webhook Integration**
   - Listen for Stripe refund events
   - Auto-update database when refund processes
   - Handle asynchronous refund completion

5. **Email Notifications** (see section 13)

6. **Refund Notes Timeline**
   - Show timeline of all actions on original transaction
   - Include refunds, reversals, edits

---

## 20. Security Considerations

1. **Server-Side Validation**
   - All refund amounts validated server-side
   - Cannot refund more than original amount
   - Stripe API calls must be server-side only

2. **Audit Trail**
   - Track `refundedBy` on every refund
   - Store timestamps for all actions
   - Maintain reason field for accountability

3. **Stripe Security**
   - Never expose Stripe secret key client-side
   - Use Firebase Functions for all Stripe API calls
   - Validate Stripe webhook signatures

4. **Permission Enforcement**
   - Verify super admin status server-side
   - Client-side checks are UI-only

---

## 21. Summary of Key Decisions

| Aspect | Decision |
|--------|----------|
| **Refund Status Field** | String with values: `'none'`, `'partial'`, `'full'` |
| **Tracking Method** | Individual fields (`totalRefunded`, `refundCount`) on original transaction |
| **Refund History Array** | Not implementing initially - under BA review |
| **Transaction Naming** | `[studentId]-refund-[timestamp]` |
| **Concession Block Deletion** | Hard delete (following existing pattern) |
| **Concession Block Lock Notes** | Use existing `lockNotes` field with `updateConcessionBlockNotes()` |
| **Display Location** | Separate rows in transactions table |
| **Stripe Integration** | Required for Stripe transactions, with proper error handling |
| **Stripe Refund Reversals** | Disabled/prevented - cannot re-charge customer |
| **Email Notifications** | Future enhancement, not in initial version |
| **Permissions** | Super admin only (already enforced by page access) |
| **Refund Payment Method** | Required field in modal; records how refund was issued (not copied from original) |
| **Concession-Gift Support** | No refund support (non-financial transaction) |
| **CSS Approach** | Use design tokens from `/styles` folder, no hardcoded values |
| **File Organization** | Main handler in `/transactions`, supporting files in `/transactions/refunds` |

---

## Questions for Business Analyst

1. **Refund History Array:** Should we implement Option B (array) or stick with Option A (individual fields)? **Option B.**

2. **Email Notifications:** Priority level for implementation? Should this be included in initial release? **No.**

3. **Stripe Payment Intent Storage:** Current transactions may not have `stripePaymentIntentId`. How should we handle:
   - Legacy Stripe transactions without Payment Intent ID?
   - Manual Stripe refunds required for these?

4. **Concession Block Lock Visibility:** Should locked blocks from refunds have special UI indication vs. manually locked blocks? **No - we have notes included already for reference.**

5. **Refund Reason Requirement:** Should reason field be required or truly optional? **Required.**

6. **Maximum Refund Amount:** Any business rules for maximum refundable amounts or time limits? **If trying to refund a transaction that has a check in in the past, this can't be refunded.**

7. **Stripe Refund Reversals:** Should we completely prevent reversal of Stripe refunds, or allow database-only reversal with strong warnings? (Recommendation: prevent entirely) **Prevent entirely - we would need our usual processes to be followed in order to record the new transaction accurately anyway.**

8. **Modal Component:** Can we use the shared ConfirmationModal with custom HTML, or do we need to create a custom RefundModal component? **This isn't a BA question - it's a question for the AI agent. The AI agent should investment the ConfirmationModal and make a recommendation as to whether it can be reused.**

---

**Document Version:** 1.0  
**Created:** January 10, 2026  
**Author:** GitHub Copilot  
**Review Status:** Awaiting Business Analyst feedback
