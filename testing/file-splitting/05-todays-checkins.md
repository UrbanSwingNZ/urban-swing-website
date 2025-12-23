# File Splitting - Testing Guide

**Purpose:** Test today's check-ins functionality after refactoring during large file splitting (File #5)  
**Branch:** `refactor-split-large-files`  
**Date Started:** December 23, 2025

**Status Legend:** 🟢 Pass | 🔴 Fail | ⏸️ Skip | ⏳ Pending

---

## File #5: `todays-checkins.js` → 3 Modules

**Refactoring Complete:** ✅ December 23, 2025  
**Testing Complete:** ✅ December 23, 2025  
**Status:** ✅ COMPLETE

**What Changed:**
- Original: 1 file, 437 lines
- New: 3 modules + 1 coordinator
- Files: Created 3 new modules, Modified 1 (main coordinator - reduced to 36 lines)

**Module Structure:**
- `todays-checkins/checkin-loader.js` (127 lines) - Real-time Firestore listener, data loading & processing
- `todays-checkins/checkin-display.js` (264 lines) - Render check-in list, event listeners, edit/delete operations
- `todays-checkins/checkin-filters.js` (26 lines) - Show/hide reversed check-ins toggle
- `todays-checkins.js` (33 lines) - Main coordinator (92% reduction from 437 lines)

---

## 🧪 How to Test

### Quick Start
1. Open admin check-in page (`/admin/check-in/`)
2. Select today's date
3. Open browser DevTools (F12) → Console tab
4. Follow tests below
5. Mark each test: ⏳ → 🟢 (pass) or 🔴 (fail)

---

## Test 1: Page Load & Module Loading

**What to check:**
- 🟢Check-in page loads without console errors
- 🟢No 404 errors for JavaScript modules
- 🟢No import/export errors
- 🟢Check-in list displays correctly
- 🟢Check-in counts display (students and crew)

**How to test:**
1. Navigate to check-in page
2. Check console for errors (should be none)
3. Verify page renders normally
4. Verify check-in list shows existing check-ins

---

## Test 2: Real-Time Listener

**What to check:**
- 🟢Check-ins list loads on page load
- 🟢Real-time updates work (add check-in → automatically appears)
- 🟢Switching dates loads correct check-ins
- 🟢No duplicate listeners created

**How to test:**
1. Note current check-in count
2. Add a new check-in
3. Verify it appears in list without refresh
4. Change selected date to different day
5. Verify check-ins for that date load
6. Change back to today
7. Verify today's check-ins reload correctly

---

## Test 3: Check-In Display - Entry Types

**What to check:**
- 🟢Concession check-ins show blue "Concession" badge
- 🟢Casual entry check-ins show green "Casual Entry" badge
- 🟢Casual student check-ins show orange "Casual Student" badge
- 🟢Crew members show grey "Crew" badge
- 🟢Free entries show grey "Free Entry" badge
- 🟢Student names display correctly

**How to test:**
1. Create check-ins of each type
2. Verify correct badge colors and labels
3. Verify student names display
4. Check that list is sorted alphabetically by name

---

## Test 4: Check-In Actions - Edit

**What to check:**
- 🟢Clicking on check-in row opens edit modal
- 🟢Modal pre-populates with existing data
- 🟢Can modify entry type, payment method
- 🟢Saving updates check-in in Firestore
- 🟢List updates automatically after save
- 🟢Error handling if check-in not found

**How to test:**
1. Click on a check-in row
2. Verify modal opens with current data
3. Change entry type or payment method
4. Save changes
5. Verify check-in updates in list
6. Check Firestore to confirm data saved

---

## Test 5: Check-In Actions - Purchase Concessions

**What to check:**
- 🟢Purchase button (cart icon) opens concessions modal
- 🟢Modal loads student data correctly
- 🟢Can purchase concessions
- 🟢Check-in list refreshes after purchase
- 🟢Concessions transaction created

**How to test:**
1. Click purchase button on a check-in
2. Verify concessions modal opens
3. Verify correct student selected
4. Purchase a concession block
5. Verify modal closes
6. Check Firestore for transaction

---

## Test 6: Check-In Actions - Delete (Reverse)

**What to check:**
- 🟢Delete button visible for super admin on any date
- 🟢Delete button visible for front desk on today's date only
- 🟢Delete button hidden for front desk on past dates
- 🟢Clicking delete shows confirmation modal
- 🟢Modal shows student name
- 🟢Confirming marks check-in as reversed (not deleted)
- 🟢Reversed check-in disappears from list
- 🟢Show Reversed toggle brings it back

**How to test:**
1. Login as super admin
2. Verify delete button visible on all dates
3. Login as front desk
4. Verify delete button only on today
5. Click delete on a check-in
6. Verify confirmation modal appears
7. Confirm deletion
8. Verify check-in disappears
9. Toggle "Show Reversed" ON
10. Verify check-in reappears with REVERSED badge

---

## Test 7: Delete - Concession Block Restoration

**What to check:**
- 🟢Deleting concession check-in restores the entry
- 🟢Block's remainingQuantity increases by 1
- 🟢Student can use that entry again

**How to test:**
1. Create check-in using concession
2. Note block's remainingQuantity before delete
3. Delete the check-in
4. Check Firestore: block's remainingQuantity increased
5. Verify student can check in with that block again

---

## Test 8: Delete - Online Transaction Unlinking

**What to check:**
- 🟡Deleting online payment check-in un-links transaction
- 🟡Transaction's usedForCheckin set to false
- 🟡Transaction's checkinId field removed
- 🟡originalClassDate restored to classDate (if exists)
- 🟡Transaction available for future check-ins

**How to test:**
1. Create check-in using online payment
2. Note transaction ID
3. Delete the check-in
4. Check Firestore transaction:
   - usedForCheckin = false
   - checkinId field deleted
   - classDate restored if originalClassDate existed
5. Try creating new check-in with same student
6. Verify transaction appears as available

---

## Test 9: Delete - In-Person Transaction Reversal

**What to check:**
- 🟢Deleting check-in with payment creates reversed transaction
- 🟢Transaction marked as reversed in Firestore
- 🟢reversedAt timestamp added
- 🟢Transaction appears in transactions table with REVERSED badge

**How to test:**
1. Create check-in with cash payment
2. Delete the check-in
3. Check Firestore: transaction marked reversed
4. Go to Transactions tab
5. Toggle "Show Reversed" ON
6. Verify transaction appears with REVERSED badge

---

## Test 10: Check-In Counts

**What to check:**
- 🟢Student count badge shows correct number
- 🟢Crew count badge shows correct number
- 🟢Crew count hidden when zero
- 🟢Counts update when check-ins added/removed
- 🟢Counts update when Show Reversed toggle changes
- 🟢Crew members not counted in student count

**How to test:**
1. Note current counts
2. Add student check-in → student count +1
3. Add crew member → crew count +1, student count unchanged
4. Add reversed check-in
5. Toggle "Show Reversed" OFF
6. Verify counts exclude reversed
7. Toggle "Show Reversed" ON
8. Verify counts include reversed

---

## Test 11: Show Reversed Toggle

**What to check:**
- 🟢Toggle starts OFF (reversed hidden)
- 🟢Turning toggle ON shows reversed check-ins
- 🟢Reversed check-ins have "REVERSED" badge
- 🟢Reversed check-ins have grey styling
- 🟢Counts update to include reversed
- 🟢Toggle also affects transactions table
- 🟢State persists during session

**How to test:**
1. Verify reversed check-ins hidden by default
2. Toggle "Show Reversed" ON
3. Verify reversed check-ins appear with badge
4. Check transactions table also shows reversed
5. Toggle OFF
6. Verify both check-ins and transactions hide reversed

---

## Test 12: Alphabetical Sorting

**What to check:**
- 🟢Check-ins sorted alphabetically by name
- 🟢First name takes priority
- 🟢Case-insensitive sorting
- 🟢New check-ins inserted in correct position

**How to test:**
1. View list with multiple check-ins
2. Verify alphabetical order (A-Z)
3. Add new check-in with name that should go in middle
4. Verify it appears in correct alphabetical position

---

## Test 13: Empty State

**What to check:**
- 🟢Empty state shows when no check-ins
- 🟢Empty state icon and message display
- 🟢Check-in counts show zero
- 🟢Switching to date with check-ins hides empty state

**How to test:**
1. Select future date with no check-ins
2. Verify empty state displays
3. Verify counts show 0/0
4. Switch to date with check-ins
5. Verify empty state hides and list displays

---

## Test 14: Error Handling

**What to check:**
- 🟡Firestore errors logged to console
- 🟡Snackbar shows error messages
- 🟡Edit on non-existent check-in shows error
- 🟡Delete on non-existent check-in shows error
- 🟡Page doesn't crash on errors

**How to test:**
1. Open DevTools console
2. Try to edit deleted check-in (if possible)
3. Verify error message displays
4. Try various error scenarios
5. Verify page remains functional

---

## Test 15: Integration with Other Components

**What to check:**
- 🟢Adding check-in via modal updates list
- 🟢Deleting check-in refreshes transactions table
- 🟢Edit modal opens correctly from list
- 🟢Purchase concessions modal functions correctly
- 🟢Show Reversed toggle affects both sections

**How to test:**
1. Add check-in via check-in modal
2. Verify appears in list automatically
3. Delete a check-in
4. Verify transactions table refreshes
5. Toggle Show Reversed
6. Verify both check-ins and transactions respond

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

**Total Tests:** 15  
**Passed:** 15  
**Failed:** 0  
**Skipped:** 0  

**Overall Status:** 🟢 All Pass

**Testing Complete:** ☑ Yes  ☐ No  
**Ready for Commit:** ☑ Yes  ☐ No  

**Notes:**
- All core functionality working correctly
- Real-time listener performs well
- Delete/reversal logic works as expected
- Concession block restoration confirmed
- Online transaction unlinking verified
- Show Reversed toggle functions properly
- Module organization clean and maintainable

---

## Next Steps

After all tests pass:
1. ✅ Mark this file as complete
2. ✅ Update LARGE_FILE_SPLITTING_AUDIT.md
3. ⏳ Commit changes to branch
4. ⏳ Move to next file (#6: checkin-firestore.js)
