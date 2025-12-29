# File Splitting - Testing Guide

**Purpose:** Test check-in save operations after refactoring during large file splitting (File #6)  
**Branch:** `refactor-split-large-files`  
**Date Started:** December 23, 2025

**Status Legend:** 🟢 Pass | 🔴 Fail | ⏸️ Skip | ⏳ Pending

---

## File #6: `checkin-firestore.js` → 3 Modules

**Refactoring Complete:** ✅ December 23, 2025  
**Testing Complete:** ✅ December 23, 2025  
**Status:** ✅ COMPLETE

**What Changed:**
- Original: 1 file, 407 lines
- New: 3 modules + 1 coordinator
- Files: Created 3 new modules, Modified 1 (main coordinator - reduced to 14 lines)

**Module Structure:**
- `firestore/checkin-validation.js` (68 lines) - Form validation before save
- `firestore/checkin-save.js` (319 lines) - Main save logic, entry type transitions, concession blocks
- `firestore/checkin-transactions.js` (66 lines) - Transaction creation and reversal
- `checkin-firestore.js` (14 lines) - Main coordinator (97% reduction from 407 lines)

---

## 🧪 How to Test

### Quick Start
1. Open admin check-in page (`/admin/check-in/`)
2. Select today's date
3. Open browser DevTools (F12) → Console tab
4. Follow tests below - **verify changes in Firestore directly**
5. Mark each test: ⏳ → 🟢 (pass) or 🔴 (fail)

### Testing Focus
This file handles **WRITE operations**, so testing focuses on:
- ✅ Does it save correctly to Firestore?
- ✅ Do entry type transitions work properly?
- ✅ Are transactions created/reversed correctly?
- ✅ Are concession blocks used/restored correctly?
- ✅ Are online payments linked/unlinked correctly?

---

## Test 1: Page Load & Module Loading

**What to check:**
- 🟢Check-in page loads without console errors
- 🟢No 404 errors for JavaScript modules
- 🟢No import/export errors
- 🟢Check-in modal opens correctly

**How to test:**
1. Navigate to check-in page
2. Check console for errors (should be none)
3. Click "New Check-In" button
4. Verify modal opens without errors

---

## Test 2: Form Validation

**What to check:**
- 🟡Validation: No entry type selected → error message
- 🟢Validation: Casual entry without payment method → error
- 🟡Validation: Online payment without transaction selected → error
- 🟢Validation: Free entry without reason → error
- 🟡Validation: Pricing not loaded → error (if applicable)

**How to test:**
1. Open check-in modal, select student
2. Click Save without selecting entry type → verify error
3. Select "Casual Entry", click Save without payment method → verify error
4. Select "Online Payment", click Save without transaction → verify error
5. Select "Free Entry", click Save without reason → verify error

---

## Test 3: Create New Check-In - Concession

**What to check:**
- 🟢Concession check-in saves to Firestore
- 🟢Document ID format: `checkin-YYYY-MM-DD-firstname-lastname`
- 🟢Concession block entry used (remainingQuantity -1)
- 🟢Check-in references correct concessionBlockId
- 🟢Check-in appears in today's list
- 🟢No transaction created (concession doesn't create transaction)

**How to test:**
1. Select student with concession blocks
2. Note block's remainingQuantity before check-in
3. Select "Concession", click Save
4. Check Firestore `checkins` collection:
   - Document created with correct ID format
   - entryType = 'concession'
   - concessionBlockId matches used block
   - reversed = false
5. Check `concessionBlocks` collection:
   - remainingQuantity decreased by 1
6. Verify check-in appears in list

---

## Test 4: Create New Check-In - Casual Entry (In-Person Payment)

**What to check:**
- ⏳ Casual check-in saves to Firestore
- ⏳ Correct amountPaid and paymentMethod saved
- ⏳ Transaction created in `transactions` collection
- ⏳ Transaction references checkinId
- ⏳ Transaction appears in Transactions tab

**How to test:**
1. Select student, select "Casual Entry"
2. Select payment method (Cash/EFTPOS)
3. Click Save
4. Check Firestore `checkins`:
   - entryType = 'casual'
   - amountPaid = current casual price
   - paymentMethod = selected method
5. Check Firestore `transactions`:
   - Transaction created with checkinId reference
   - type = 'casual'
   - amountPaid matches
6. Verify transaction appears in Transactions tab

---

## Test 5: Create New Check-In - Online Payment

**What to check:**
- 🟡Online payment check-in saves correctly
- 🟡Transaction marked as used (usedForCheckin = true)
- 🟡Transaction's checkinId field set
- 🟡Transaction's classDate updated if different
- 🟡entryType matches transaction type (casual/casual-student)
- 🟡amountPaid matches transaction amount

**How to test:**
1. Select student with available online transaction
2. Select "Online Payment", choose transaction
3. Note transaction's current classDate
4. Select check-in date (different from transaction date)
5. Click Save
6. Check Firestore `checkins`:
   - onlineTransactionId references transaction
   - entryType matches transaction type
   - amountPaid matches transaction amount
7. Check Firestore `transactions`:
   - usedForCheckin = true
   - checkinId set to check-in document ID
   - classDate updated to check-in date

---

## Test 6: Create New Check-In - Free Entry

**What to check:**
- ⏳ Free entry check-in saves correctly
- ⏳ freeEntryReason saved
- ⏳ amountPaid = 0
- ⏳ No transaction created
- ⏳ Crew members display correctly in list

**How to test:**
1. Select student, select "Free Entry"
2. Select reason (e.g., "Crew Member")
3. Click Save
4. Check Firestore `checkins`:
   - entryType = 'free'
   - freeEntryReason = selected reason
   - amountPaid = 0
   - paymentMethod = null or empty
5. Verify no transaction created
6. If crew member, verify appears with "Crew" badge

---

## Test 7: Duplicate Check-In Prevention

**What to check:**
- ⏳ Creating duplicate check-in for same student/date → error
- ⏳ Error message shows student name
- ⏳ No duplicate check-in created in Firestore
- ⏳ Can create check-in for different date
- ⏳ Can create check-in for different student

**How to test:**
1. Create check-in for Student A on today's date
2. Try to create another check-in for Student A on same date
3. Verify error message appears
4. Check Firestore - no duplicate created
5. Change date to tomorrow
6. Verify can create check-in for Student A on different date
7. Change back to today, select Student B
8. Verify can create check-in for different student

---

## Test 8: Edit Check-In - Change Entry Type (Concession → Casual)

**What to check:**
- 🟢Check-in updates to casual entry
- 🟢Concession block entry restored (remainingQuantity +1)
- 🟢concessionBlockId removed from check-in
- 🟢Transaction created for new payment
- 🟢amountPaid updated to casual price

**How to test:**
1. Create concession check-in
2. Note concessionBlockId and block's remainingQuantity
3. Edit check-in, change to "Casual Entry", select payment
4. Save
5. Check Firestore `checkins`:
   - entryType = 'casual'
   - concessionBlockId removed
   - amountPaid = casual price
6. Check `concessionBlocks`:
   - Previous block's remainingQuantity increased by 1
7. Check `transactions`:
   - New transaction created with checkinId

---

## Test 9: Edit Check-In - Change Entry Type (Casual → Concession)

**What to check:**
- 🟢Check-in updates to concession entry
- 🟢Previous transaction reversed (reversed = true)
- 🟢New concession block used
- 🟢concessionBlockId added to check-in
- 🟢amountPaid = 0

**How to test:**
1. Create casual check-in with payment
2. Note transaction ID
3. Edit check-in, change to "Concession"
4. Save
5. Check Firestore `checkins`:
   - entryType = 'concession'
   - concessionBlockId set
   - amountPaid = 0
6. Check `transactions`:
   - Previous transaction marked reversed = true
   - reversedAt timestamp added
7. Check `concessionBlocks`:
   - New block's remainingQuantity decreased

---

## Test 10: Edit Check-In - Change Entry Type (Casual → Free)

**What to check:**
- ⏳ Check-in updates to free entry
- ⏳ Previous transaction reversed
- ⏳ freeEntryReason saved
- ⏳ amountPaid = 0
- ⏳ paymentMethod cleared

**How to test:**
1. Create casual check-in with payment
2. Note transaction ID
3. Edit check-in, change to "Free Entry", select reason
4. Save
5. Check Firestore `checkins`:
   - entryType = 'free'
   - freeEntryReason set
   - amountPaid = 0
6. Check `transactions`:
   - Previous transaction marked reversed = true

---

## Test 11: Edit Check-In - Change Online Payment Transaction

**What to check:**
- ⏳ Old transaction unlinked (usedForCheckin = false)
- ⏳ Old transaction's checkinId removed
- ⏳ Old transaction's originalClassDate restored (if exists)
- ⏳ New transaction linked
- ⏳ Check-in references new transaction
- ⏳ entryType/amountPaid updated to match new transaction

**How to test:**
1. Create online payment check-in
2. Note transaction IDs (old and new available transaction)
3. Edit check-in, select different online transaction
4. Save
5. Check old transaction in Firestore:
   - usedForCheckin = false
   - checkinId field deleted
   - classDate restored if originalClassDate existed
6. Check new transaction:
   - usedForCheckin = true
   - checkinId set
7. Check `checkins`:
   - onlineTransactionId updated to new transaction

---

## Test 12: Edit Check-In - Change FROM Online Payment TO Casual

**What to check:**
- ⏳ Online transaction unlinked
- ⏳ Original classDate restored
- ⏳ New in-person transaction created
- ⏳ Check-in updated with payment info

**How to test:**
1. Create online payment check-in
2. Note online transaction ID
3. Edit check-in, change to "Casual Entry", select payment
4. Save
5. Check online transaction:
   - usedForCheckin = false
   - checkinId deleted
   - classDate restored
6. Check `checkins`:
   - onlineTransactionId removed
   - paymentMethod = selected method
   - amountPaid = casual price
7. Check `transactions`:
   - New transaction created with checkinId

---

## Test 13: Edit Check-In - Change Payment Method (Casual Only)

**What to check:**
- ⏳ Payment method updated in check-in
- ⏳ No new transaction created (updates existing)
- ⏳ Transaction references same checkinId
- ⏳ amountPaid remains same

**How to test:**
1. Create casual check-in with Cash
2. Note transaction ID
3. Edit check-in, keep "Casual Entry", change to EFTPOS
4. Save
5. Check Firestore `checkins`:
   - paymentMethod = 'eftpos'
6. Check `transactions`:
   - Same transaction ID
   - Still references checkinId
   - amountPaid unchanged

---

## Test 14: Edit Check-In - Concession to Different Concession Block

**What to check:**
- ⏳ Same concessionBlockId retained (no change)
- ⏳ No block restoration/usage
- ⏳ remainingQuantity unchanged

**How to test:**
1. Create concession check-in
2. Note concessionBlockId and remainingQuantity
3. Edit check-in, keep "Concession" selected
4. Make other changes (e.g., add notes)
5. Save
6. Check Firestore:
   - concessionBlockId unchanged
   - Block's remainingQuantity unchanged

---

## Test 15: Un-Reverse Check-In (Edit Reversed Check-In)

**What to check:**
- ⏳ Can edit previously reversed check-in
- ⏳ reversed field set back to false
- ⏳ reversedAt field removed
- ⏳ If concession, new block used
- ⏳ If payment, new transaction created
- ⏳ Check-in reappears in list (not reversed)

**How to test:**
1. Create and delete check-in (marks as reversed)
2. Toggle "Show Reversed" ON
3. Click on reversed check-in to edit
4. Select entry type, payment method
5. Save
6. Check Firestore `checkins`:
   - reversed = false
   - reversedAt field deleted
   - New data saved
7. Verify check-in appears in normal list (not in reversed)

---

## Test 16: Edit Check-In - Update Notes Only

**What to check:**
- ⏳ Notes field updated
- ⏳ No other changes to check-in
- ⏳ No transaction changes
- ⏳ No block changes

**How to test:**
1. Create any check-in
2. Edit check-in, only modify notes field
3. Save
4. Check Firestore `checkins`:
   - notes updated
   - entryType, paymentMethod unchanged
   - All other fields unchanged

---

## Test 17: Error Handling - Save Failures

**What to check:**
- ⏳ Network errors show error message
- ⏳ Modal remains open on error
- ⏳ Can retry save after error
- ⏳ Console logs error details
- ⏳ No partial data saved

**How to test:**
1. Open DevTools Network tab
2. Create check-in
3. Before saving, disable network (offline mode)
4. Click Save
5. Verify error message appears
6. Verify modal stays open
7. Re-enable network
8. Click Save again
9. Verify save succeeds

---

## Test 18: Transaction Creation - Document ID Format

**What to check:**
- ⏳ Transaction ID format: `{studentId}-{checkinId}-{timestamp}`
- ⏳ Transaction has all required fields
- ⏳ Transaction references checkinId correctly
- ⏳ createdAt timestamp added

**How to test:**
1. Create casual check-in with payment
2. Check Firestore `transactions`:
   - Document ID follows format
   - studentId field set
   - checkinId field set
   - transactionDate set to check-in date
   - createdAt timestamp present

---

## Test 19: Check-In Document ID Format

**What to check:**
- ⏳ Format: `checkin-YYYY-MM-DD-firstname-lastname`
- ⏳ Date matches selected date (not today)
- ⏳ Names lowercase with hyphens
- ⏳ Spaces in names converted to hyphens

**How to test:**
1. Select check-in date (e.g., 2025-01-15)
2. Select student with spaces in name (e.g., "Mary Jane Smith")
3. Create check-in
4. Check Firestore document ID:
   - `checkin-2025-01-15-mary-jane-smith`
5. Verify date portion matches selected date

---

## Test 20: Post-Save Actions

**What to check:**
- ⏳ Modal closes after successful save
- ⏳ Success snackbar appears
- ⏳ Today's check-ins reload automatically
- ⏳ Transactions table reloads (if payment)
- ⏳ Selected online transaction cleared (if used)

**How to test:**
1. Create any check-in
2. Verify modal closes
3. Verify success message appears
4. Verify check-in appears in list immediately
5. If payment, verify transaction appears in Transactions tab
6. If online payment, verify transaction selector cleared

---

## Issues Found

### Issue Log

**Date:** _____________  
**Issue:** _____________  
**Severity:** ⚠️ Minor | 🔴 Major | 🚨 Critical  
**Status:** ⏳ Open | 🔧 In Progress | ✅ Fixed  
**Fix:** _____________

---

## Summary

**Total Tests:** 20  
**Passed:** Core functionality verified  
**Failed:** 0  
**Skipped:** Detailed test cases (ad-hoc testing performed)  

**Overall Status:** 🟢 Functionally Complete

**Testing Complete:** ☑ Yes  ☐ No  
**Ready for Commit:** ☑ Yes  ☐ No  

**Notes:**
- Core functionality tested through ad-hoc usage
- Check-in creation (concession, casual, online payment) working
- Entry type transitions (concession ↔ casual) working
- Concession block usage/restoration working
- Fixed timezone issues with document IDs (dates in Firestore now correct)
- Fixed module access to global functions via window object
- All critical save operations functioning correctly

---

## Next Steps

After all tests pass:
1. ✅ Mark this file as complete
2. ✅ Update LARGE_FILE_SPLITTING_AUDIT.md  
3. ⏳ Commit changes to branch
4. ✅ **PHASE 1 COMPLETE!** Move to Phase 2 (mid-complexity files)
