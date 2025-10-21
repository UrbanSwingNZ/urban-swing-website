# Quick Start: Testing Concession Tracking

This is a quick reference guide for testing the concession tracking system. Follow these steps in order.

## Step 1: Create Firestore Indexes (One-Time Setup)

The system requires 3 composite indexes. Firebase will automatically prompt you to create them:

1. Open the check-in admin page
2. Try to check in a student with concession type
3. Check browser console for error like:
   ```
   The query requires an index. You can create it here: https://console.firebase.google.com/...
   ```
4. Click the link in the error message
5. Click "Create Index" in Firebase Console
6. Wait 1-2 minutes for index to build (status will show "Enabled")
7. Retry the operation that caused the error

**Repeat for each index needed** (up to 3 total).

Or create all indexes manually - see `docs/FIRESTORE_INDEXES.md`.

## Step 2: Deploy Security Rules (One-Time Setup)

Update Firestore security rules to allow admin access to `concessionBlocks`:

**Option A: Via Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Firestore Database → Rules tab
3. Add this rule inside the `match /databases/{database}/documents` block:
   ```javascript
   match /concessionBlocks/{blockId} {
     allow read, write: if isAuthenticated(); // Or isAdmin() if you have role checking
   }
   ```
4. Click "Publish"

**Option B: Via CLI**
1. Update `firebase/firestore.rules` with complete rules from `docs/FIRESTORE_SECURITY_RULES.md`
2. Run: `firebase deploy --only firestore:rules`

## Step 3: Create Test Data

Create test concession blocks via Firestore Console:

### Create a Simple Test Block

1. Go to Firebase Console → Firestore Database
2. Click "Start collection" or select existing `concessionBlocks` collection
3. Add document with these fields:

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| `studentId` | string | `<existing-student-id>` | Use ID from `students` collection |
| `studentName` | string | `John Smith` | Student's full name |
| `packageId` | string | `pkg-10pack` | Any string ID |
| `packageName` | string | `10-Pack` | Display name |
| `originalQuantity` | number | `10` | Total entries purchased |
| `remainingQuantity` | number | `10` | Entries left (start with same as original) |
| `purchaseDate` | timestamp | `<current-date>` | Click "Insert timestamp" |
| `expiryDate` | timestamp | `<future-date>` | Or `null` for no expiry |
| `status` | string | `active` | Must be: `active`, `expired`, or `depleted` |
| `price` | number | `120` | Amount paid (e.g., $120 for 10-pack) |
| `paymentMethod` | string | `cash` | Or `card`, `bank-transfer` |
| `transactionId` | string | `null` | Optional, for future use |
| `createdAt` | timestamp | `<current-date>` | Click "Insert timestamp" |
| `createdBy` | string | `test-admin` | Your admin UID or any string |
| `notes` | string | `` | Optional admin notes |

4. Click "Save"

### Create an Expired Block (for testing)

Follow same steps but:
- Set `expiryDate` to a **past date** (e.g., 1 month ago)
- Set `status` to `expired` (not `active`)
- Set `remainingQuantity` to `5` (some used, some left)

### Create Multiple Blocks (for FIFO testing)

Create 2-3 blocks for the same student with different `purchaseDate` values to test that oldest block is used first.

## Step 4: Update Student Balance Fields

For students with concession blocks, update their balance fields:

1. Go to Firestore → `students` collection
2. Find the student you created blocks for
3. Click "Add field" (if these don't exist yet)
4. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `concessionBalance` | number | `10` (or sum of all remainingQuantity) |
| `expiredConcessions` | number | `5` (sum of remainingQuantity where status='expired') |

**Note:** These will auto-update when you use the system, but set initial values manually for first test.

## Step 5: Test Check-in with Concession

1. **Open Admin Check-in Page**
   - Navigate to: `admin/check-in/index.html`
   - Ensure you're logged in

2. **Open Check-in Modal**
   - Click "Check In" button or click a student row
   - Search for student with test blocks

3. **Verify Balance Displays**
   - Should show: `"10 entries"` or `"10 entries (incl. 5 expired)"`
   - Should show list of blocks with remaining/original counts
   - Active blocks have green badge, expired have yellow badge

4. **Complete Check-in**
   - Select "Concession" entry type (should be pre-selected if balance > 0)
   - Click "Confirm Check-In"
   - Should show success message

5. **Verify Deduction in Firestore**
   - Go to Firestore Console → `concessionBlocks`
   - Find the block that should have been used (oldest `purchaseDate`)
   - Verify `remainingQuantity` decreased by 1 (e.g., 10 → 9)
   - If it was the last entry, verify `status` changed to `depleted`

6. **Verify Check-in Document**
   - Go to Firestore Console → `checkins`
   - Find the new check-in document
   - Verify `concessionBlockId` field is populated (should match block used)

## Step 6: Test Edge Cases

### Zero Balance
1. Create student with NO concession blocks
2. Open check-in modal for that student
3. Verify "Concession" option is disabled (grayed out)
4. Verify shows "No concessions available"

### Only Expired Entries
1. Create block with `status = 'expired'` and `remainingQuantity > 0`
2. Ensure student has NO active blocks
3. Open check-in modal
4. Should show: `"5 entries (all expired)"`
5. Concession option should still be enabled (expired can be used)

### FIFO Order
1. Create 2 blocks with different purchase dates:
   - Block A: `purchaseDate = Jan 1, 2024`, `remainingQuantity = 3`
   - Block B: `purchaseDate = Feb 1, 2024`, `remainingQuantity = 5`
2. Check in 3 times
3. Verify Block A is depleted first (remainingQuantity → 0)
4. 4th check-in should use Block B

### Depleted Status
1. Create block with `remainingQuantity = 1`
2. Check in once
3. Verify:
   - `remainingQuantity` becomes `0`
   - `status` changes to `depleted`
   - Block no longer shows in balance display

## Troubleshooting

### "Index not found" error
- Click the link in the error message to create the index
- Wait 1-2 minutes for it to build
- Refresh page and try again

### "No concession entries available" error
- Check that student has blocks with `remainingQuantity > 0`
- Check that blocks are not `depleted` status
- Verify `studentId` in blocks matches selected student

### Balance not displaying
- Check browser console for errors
- Verify Firebase is connected (check other queries work)
- Check security rules allow read access to `concessionBlocks`

### Balance not updating after check-in
- Check that `updateStudentBalance()` is being called
- Manually run balance calculation:
  ```javascript
  updateStudentBalance('student-id-here')
  ```
- Check Firestore Console to see if block was actually decremented

### Check-in saved but block not decremented
- Check browser console for errors in `useBlockEntry()`
- Verify Firestore security rules allow write to `concessionBlocks`
- Check that `getNextAvailableBlock()` is finding the correct block

## Console Commands for Testing

Open browser console on check-in page and run:

```javascript
// Get next available block for a student
getNextAvailableBlock('student-id-here', true)
  .then(block => console.log('Next block:', block));

// Get all blocks for a student
getStudentBlocks('student-id-here')
  .then(blocks => console.log('All blocks:', blocks));

// Update student balance manually
updateStudentBalance('student-id-here')
  .then(() => console.log('Balance updated'));

// Mark expired blocks (background job simulation)
markExpiredBlocks()
  .then(count => console.log(`Marked ${count} blocks as expired`));
```

## Success Indicators

✅ **Working correctly when:**
- Balance displays correct total including expired
- Oldest active block is used first (FIFO)
- Expired blocks can still be used for check-ins
- Block remainingQuantity decrements by 1 after check-in
- Status changes to depleted when remainingQuantity reaches 0
- Check-in document stores concessionBlockId reference
- Student balance fields update automatically

## Next Steps After Testing

Once basic functionality is working:

1. **Add Purchase UI** - Build form to create blocks (instead of manual Firestore entry)
2. **Schedule Expiry Job** - Set up Cloud Function to auto-expire blocks
3. **Add Admin Tools** - Bulk operations, refunds, transfers
4. **Create Reports** - Analytics on concession usage

## Quick Reference - Field Values

**Status values:**
- `active` - Valid, not expired, has remaining entries
- `expired` - Past expiry date but still usable
- `depleted` - remainingQuantity is zero (no longer usable)

**Entry types:**
- `casual` - Pay per entry ($15)
- `concession` - Use from prepaid block
- `free` - Free entry (staff, trial, etc.)

**Payment methods:**
- `cash`
- `card`
- `bank-transfer`
- `online`

## Getting Help

1. Check browser console for specific error messages
2. Review `docs/FIRESTORE_INDEXES.md` for index issues
3. Review `docs/FIRESTORE_SECURITY_RULES.md` for permission issues
4. Review `docs/CONCESSION_IMPLEMENTATION.md` for complete documentation
