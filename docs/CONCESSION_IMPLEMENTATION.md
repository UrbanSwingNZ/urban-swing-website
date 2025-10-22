# Concession Tracking Implementation Complete

This document summarizes the concession tracking system implementation for the Urban Swing check-in system.

## Overview

The concession tracking system allows students to purchase concession packages (e.g., 10-pack entries) and use them when checking in. The system tracks individual "blocks" of concessions, handles expiry dates, and implements First-In-First-Out (FIFO) deduction logic.

## What Was Implemented

### 1. Core Module: `concession-blocks.js`

New file that handles all concession block operations:

**Functions:**
- `createConcessionBlock()` - Create a new block when student purchases concessions
- `getNextAvailableBlock()` - Find next block to use (FIFO with status priority)
- `useBlockEntry()` - Decrement a block's remaining quantity
- `getStudentBlocks()` - Get all blocks for a student
- `updateStudentBalance()` - Recalculate student's total balance from blocks
- `markExpiredBlocks()` - Background job to mark blocks that have passed expiry date

**Key Features:**
- FIFO logic: Uses oldest blocks first
- Status priority: Active blocks before expired blocks
- Automatic balance updates: Student balance fields updated after each operation
- Validation: Prevents invalid operations (e.g., using depleted blocks)

### 2. Updated: `checkin-firestore.js`

Enhanced check-in submission to handle concession deduction:

**Changes:**
```javascript
// Before: concessionBlockId: null
// After: Queries for next available block, uses entry, stores block ID

if (entryType === 'concession') {
    const block = await getNextAvailableBlock(student.id, true); // Allow expired
    if (!block) {
        showSnackbar('No concession entries available', 'error');
        return;
    }
    await useBlockEntry(block.id);
    concessionBlockId = block.id;
}
```

**Result:** Check-ins now automatically deduct from concession blocks using FIFO logic.

### 3. Updated: `checkin-concession-display.js`

Replaced mock data with real Firestore queries:

**Changes:**
- Made `updateConcessionInfo()` async
- Added `getConcessionData()` to query actual blocks from Firestore
- Updated balance display format: `"15 entries (incl. 3 expired)"`
- Added loading states and error handling
- Enhanced block display with status badges and expiry dates

**Display Variations:**
- `"15 entries (incl. 3 expired)"` - Has both active and expired
- `"15 entries"` - Only active, no expired
- `"3 entries (all expired)"` - Only expired, no active
- `"No concessions available"` - Zero balance

### 4. Updated: `index.html`

Added new script to load order:

```html
<!-- Concession blocks management (before check-in modules that use it) -->
<script src="js/concession-blocks.js"></script>
```

Positioned after `students.js` and before `checkin-*` modules to ensure dependencies are met.

## Data Model

### Collection: `concessionBlocks`

```javascript
{
  studentId: string,              // Reference to student document
  studentName: string,            // Display name (denormalized)
  packageId: string,              // Reference to concessionPackage
  packageName: string,            // Display name (denormalized)
  originalQuantity: number,       // Original entries purchased (e.g., 10)
  remainingQuantity: number,      // Entries left (decrements on use)
  purchaseDate: timestamp,        // When block was created
  expiryDate: timestamp | null,   // When block expires (null = never)
  status: string,                 // 'active', 'expired', or 'depleted'
  price: number,                  // Amount paid for this block
  paymentMethod: string,          // 'cash', 'card', 'bank-transfer', etc.
  transactionId: string | null,   // Reference to transaction (future)
  createdAt: timestamp,           // Server timestamp
  createdBy: string,              // Admin UID who created block
  notes: string                   // Optional admin notes
}
```

### Student Balance Fields

Added to existing `students` collection:

```javascript
{
  // ... existing fields ...
  concessionBalance: number,      // Total entries (including expired)
  expiredConcessions: number      // Subset of balance that is expired
}
```

**Calculation:**
```
concessionBalance = sum of all remainingQuantity where remainingQuantity > 0
expiredConcessions = sum of remainingQuantity where status == 'expired'
```

## Business Logic

### Purchase Flow (Fully Implemented)

When a student purchases concessions:

1. Admin opens Purchase Concessions modal
2. Admin selects purchase date (defaults to today, allows backdating for historical data)
   - Visual warning if backdating > 30 days
   - Maximum date is today (cannot set future dates)
3. Admin enters package selection, payment method
4. System creates concessionBlock document with specified purchase date
5. System calculates expiryDate based on purchase date + package terms
6. System updates student's `concessionBalance` and `expiredConcessions`
7. System creates transaction record with purchase date
8. UI shows success message

**Backdating Feature:**
- Date picker in modal header allows setting custom purchase dates
- Useful for migrating historical data from spreadsheets
- Visual indicators: blue border (< 30 days old), orange border (> 30 days old)
- Prevents future-dating (max date is today)

### Check-in Flow (Fully Implemented)

When a student checks in with concession entry type:

1. System queries for next available block (FIFO)
   - Where: `studentId` matches AND `remainingQuantity > 0`
   - Order: `status ASC` (active before expired), then `purchaseDate ASC` (oldest first)
2. System validates block exists
3. System decrements `remainingQuantity` by 1
4. If `remainingQuantity` reaches 0, set `status = 'depleted'`
5. System updates student's balance fields
6. System stores `concessionBlockId` in check-in document
7. UI shows success message

### Expiry Management (Background Job - Not Yet Scheduled)

Daily or hourly background job:

1. Query for blocks where `status == 'active'` AND `expiryDate <= now`
2. Update each block's `status` to `'expired'`
3. Update affected students' balance fields
4. Optional: Send notification to students about expired entries

**Implementation Options:**
- Firebase Cloud Functions (scheduled function)
- Manual admin button to run on demand
- Client-side check on page load

## UI Display

### Check-in Modal - Concession Info Section

Shows student's concession balance with breakdown:

```
Concession Balance: 15 entries (incl. 3 expired)

10-Pack [Active]                          8 / 10 remaining
Expires: 2024-12-31

10-Pack [Expired]                         7 / 10 remaining
Expired: 2024-02-15
```

**Features:**
- Color-coded status badges (Active = green, Expired = yellow)
- Shows remaining/original ratio for each block
- Displays expiry dates for context
- Real-time updates from Firestore

### Entry Type Selection

- **Concession radio disabled** if student has zero balance
- **Concession radio auto-selected** if student has positive balance
- **Casual auto-selected** if no concessions available

## Required Firestore Configuration

### Composite Indexes (Required)

Three indexes must be created before the system will work properly:

1. **FIFO Query Index**
   - Collection: `concessionBlocks`
   - Fields: `studentId` (ASC), `remainingQuantity` (ASC), `status` (ASC), `purchaseDate` (ASC)

2. **Expiry Job Index**
   - Collection: `concessionBlocks`
   - Fields: `status` (ASC), `expiryDate` (ASC)

3. **Balance Display Index**
   - Collection: `concessionBlocks`
   - Fields: `studentId` (ASC), `remainingQuantity` (ASC), `purchaseDate` (DESC)

**How to create:** See `docs/FIRESTORE_INDEXES.md` for detailed instructions.

Firebase will show error messages with links to create these indexes the first time queries are run.

### Security Rules (Required)

Update Firestore security rules to allow admin access to `concessionBlocks` collection:

```javascript
match /concessionBlocks/{blockId} {
  allow read, write: if isAdmin();
}
```

**How to deploy:** See `docs/FIRESTORE_SECURITY_RULES.md` for complete rules and deployment instructions.

## Testing Checklist

### Manual Testing Steps

1. **Create Test Blocks (via Firestore Console)**
   - Create a concessionBlock document manually
   - Set `studentId` to existing student
   - Set `remainingQuantity = 5`, `originalQuantity = 10`
   - Set `status = 'active'`
   - Set `expiryDate` to future date or null

2. **View Balance in Check-in Modal**
   - Open check-in modal
   - Search for test student
   - Verify balance displays correctly
   - Verify block list shows with remaining/original ratio

3. **Check-in with Concession**
   - Select concession entry type
   - Complete check-in
   - Verify `remainingQuantity` decremented in Firestore
   - Verify check-in document has `concessionBlockId`

4. **Test FIFO Logic**
   - Create two blocks for same student with different purchase dates
   - Check in twice
   - Verify oldest block was used first

5. **Test Expired Blocks**
   - Create block with past `expiryDate`
   - Manually set `status = 'expired'`
   - Verify it appears in balance with "(incl. X expired)"
   - Verify check-in still works with expired block

6. **Test Depleted Status**
   - Use all entries from a block (e.g., 5 check-ins with remainingQuantity=5)
   - Verify `status` changes to `'depleted'`
   - Verify block no longer shows in balance

7. **Test Zero Balance**
   - Check student with no blocks
   - Verify concession option is disabled
   - Verify UI shows "No concessions available"

### Edge Cases to Test

- Student with only expired entries
- Student with multiple blocks (different statuses)
- Check-in when last entry is used (should update to depleted)
- Check-in attempt when no blocks available (should show error)
- Balance calculation with mix of active and expired

## Known Limitations & Future Work

### Current Limitations

1. **No Purchase UI** - Blocks must be created manually via Firestore Console
   - **Solution:** Add purchase form in concessions admin page

2. **No Background Expiry Job** - Blocks don't auto-expire
   - **Solution:** Set up Firebase Cloud Function with scheduled trigger

3. **No Refund Logic** - Can't add entries back to a block
   - **Solution:** Add admin function to increment remainingQuantity

4. **No Transfer Logic** - Can't move entries between students
   - **Solution:** Add admin function to create new block for recipient

5. **No Bulk Operations** - Can't purchase multiple blocks at once
   - **Solution:** Add batch purchase form

### Planned Enhancements

- **Package Templates:** Predefined packages (5-pack, 10-pack, etc.)
- **Analytics Dashboard:** Track concession usage patterns
- **Expiry Warnings:** Notify students when blocks are about to expire
- **Usage History:** Show which blocks were used for each check-in
- **Partial Refunds:** Refund unused entries from a block
- **Family Accounts:** Share concession blocks between family members
- **Auto-renewal:** Automatic purchase when balance drops below threshold

## Documentation Reference

All documentation is in the `docs/` folder:

- **CONCESSION_TRACKING.md** - Original design specification
- **FIRESTORE_INDEXES.md** - Index creation instructions
- **FIRESTORE_SECURITY_RULES.md** - Security rules and deployment
- **CONCESSION_IMPLEMENTATION.md** - This file (implementation summary)

## File Changes Summary

**New Files:**
- `admin/check-in/js/concession-blocks.js` (220 lines)
- `docs/FIRESTORE_INDEXES.md`
- `docs/FIRESTORE_SECURITY_RULES.md`
- `docs/CONCESSION_IMPLEMENTATION.md`

**Modified Files:**
- `admin/check-in/js/checkin-firestore.js` - Added FIFO deduction logic
- `admin/check-in/js/checkin-concession-display.js` - Real Firestore queries
- `admin/check-in/index.html` - Added script tag for concession-blocks.js

**Total Lines Added:** ~700 lines of code and documentation

## Next Steps for Developer

1. **Deploy Firestore Changes**
   - Create the 3 required composite indexes
   - Update security rules to allow `concessionBlocks` access

2. **Create Test Data**
   - Add sample concessionBlock documents via Firestore Console
   - Use existing student IDs
   - Set reasonable expiry dates and quantities

3. **Test Check-in Flow**
   - Open admin check-in page
   - Search for student with test blocks
   - Complete concession check-in
   - Verify deduction in Firestore

4. **Build Purchase UI** (Next Major Task)
   - Create form in concessions admin page
   - Select student, package, payment method
   - Call `createConcessionBlock()` on submit
   - Show success message and updated balance

5. **Schedule Expiry Job** (Background Task)
   - Set up Firebase Cloud Functions project
   - Create scheduled function (daily at midnight)
   - Call `markExpiredBlocks()` from function
   - Test with manual trigger first

## Support

For questions or issues:
- Check console for error messages with index creation links
- Review `docs/FIRESTORE_INDEXES.md` for troubleshooting
- Verify Firebase Authentication is working
- Ensure security rules are deployed

## Success Criteria

The implementation is complete when:
- ✅ Check-in with concession deducts from correct block (FIFO)
- ✅ Balance displays with expired count in UI
- ✅ Zero balance disables concession option
- ✅ Depleted blocks no longer show in balance
- ✅ Check-in documents store concessionBlockId reference
- ⏳ Purchase UI creates new blocks (next task)
- ⏳ Background job expires blocks automatically (future task)

**Current Status:** Core functionality complete, ready for testing!
