# File Splitting - Testing Guide

**Purpose:** Test check-in transactions functionality after refactoring during large file splitting (File #3)  
**Branch:** `refactor-split-large-files`  
**Date Started:** December 23, 2025

**Status Legend:** 🟢 Pass | 🔴 Fail | ⏸️ Skip | ⏳ Pending

---

## File #3: `checkin-transactions.js` → 4 Modules

**Refactoring Complete:** ✅ December 23, 2025  
**Status:** ⏳ Testing Pending

**What Changed:**
- Original: 1 file, 685 lines
- New: 4 modules (loader, display, actions, coordinator)
- Files: Created 3 new modules, Modified 1 (main coordinator - reduced to 54 lines), Created 1 subdirectory

**Module Structure:**
- `transactions/transaction-loader.js` (140 lines) - Firestore real-time listener, data loading & normalization
- `transactions/transaction-display.js` (180 lines) - Render transactions table, summary statistics, badges
- `transactions/transaction-actions.js` (404 lines) - Edit, delete (reverse), invoice toggle
- `checkin-transactions.js` (54 lines) - Main coordinator (92% reduction from 685 lines)

---

## 🧪 How to Test

### Quick Start
1. Open admin check-in page (`/admin/check-in/`)
2. Select a date with existing transactions
3. Open browser DevTools (F12) → Console tab
4. Follow tests below
5. Mark each test: ⏳ → 🟢 (pass) or 🔴 (fail)

---

## Test 1: Page Load & Structure

**What to check:**
- ⏳ Check-in page loads without console errors
- ⏳ No 404 errors for JavaScript modules
- ⏳ Transactions section visible
- ⏳ Summary statistics row displays (count, amount, cash, eftpos, online, bank)
- ⏳ Show Reversed toggle visible

**How to test:**
1. Navigate to check-in page
2. Check console for errors (should be none)
3. Scroll to transactions section
4. Verify all UI elements present

---

## Test 2: Load Transactions for Selected Date

**What to check:**
- ⏳ Selecting a date loads transactions for that date only
- ⏳ Transactions table displays with correct columns
- ⏳ Each row shows: Date, Student Name, Type badge, Amount, Payment badge, Actions
- ⏳ Summary statistics calculate correctly
- ⏳ Real-time listener works (add transaction in Firestore → automatically appears)

**How to test:**
1. Select a date with known transactions
2. Verify transactions for that date display
3. Check summary totals match the displayed data
4. (Optional) Add a transaction in Firestore console → verify it appears automatically

---

## Test 3: Transaction Type Badges

**What to check:**
- ⏳ Concession Purchase → blue "Concession Purchase" badge
- ⏳ Concession Gift → purple "Gifted Concessions" badge
- ⏳ Casual Entry → green "Casual Entry" badge
- ⏳ Casual Student → orange "Casual Student" badge
- ⏳ Reversed transactions → red "REVERSED" badge

**How to test:**
1. View transactions of different types
2. Verify badge colors and text match type
3. If reversed transactions exist, verify REVERSED badge shows

---

## Test 4: Payment Method Badges

**What to check:**
- ⏳ Cash → yellow "Cash" badge with money icon
- ⏳ EFTPOS → blue "EFTPOS" badge with card icon
- ⏳ Bank Transfer → purple "Bank Transfer" badge with bank icon
- ⏳ Online/Stripe → green "Online" badge with globe icon
- ⏳ None/Unknown → grey badge

**How to test:**
1. View transactions with different payment methods
2. Verify badge colors, icons, and text display correctly

---

## Test 5: Summary Statistics

**What to check:**
- ⏳ Total Count matches number of displayed transactions
- ⏳ Total Amount sums all transaction amounts correctly
- ⏳ Cash total sums only cash transactions
- ⏳ EFTPOS total sums only eftpos transactions
- ⏳ Online total sums only online transactions
- ⏳ Bank Transfer total sums only bank transfers
- ⏳ Summary updates when Show Reversed toggle changes

**How to test:**
1. Manually count and sum transactions
2. Verify summary statistics match
3. Toggle Show Reversed → verify summary updates

---

## Test 6: Show Reversed Toggle

**What to check:**
- ⏳ Toggle starts OFF (reversed transactions hidden)
- ⏳ Turning toggle ON shows reversed transactions
- ⏳ Reversed transactions have "REVERSED" badge
- ⏳ Reversed transactions have disabled action buttons
- ⏳ Summary includes reversed transactions when toggle ON

**How to test:**
1. Verify reversed transactions don't show initially
2. Toggle Show Reversed ON
3. If reversed transactions exist, verify they display with badge
4. Check action buttons are disabled/grayed
5. Verify summary includes reversed amounts

---

## Test 7: Invoice Toggle (Super Admin Only)

**What to check:**
- ⏳ Invoice button visible for super admin (dance@urbanswing.co.nz)
- ⏳ Invoice button NOT visible for front desk users
- ⏳ Clicking invoice button toggles status
- ⏳ Button visual updates (color changes)
- ⏳ Status saves to Firestore
- ⏳ Success snackbar displays
- ⏳ Reversed transactions cannot be invoiced (button disabled)

**How to test:**
1. Login as super admin
2. Verify invoice buttons visible
3. Click invoice button on non-reversed transaction
4. Verify button changes to "invoiced" style
5. Click again → verify returns to "not invoiced"
6. Check Firestore to confirm invoiced field updates

---

## Test 8: Edit Casual Entry Transaction

**What to check:**
- ⏳ Clicking Edit button on casual entry opens modal
- ⏳ Modal shows "Edit Casual Entry" title
- ⏳ Form pre-populates with current transaction data
- ⏳ Can change date, payment method, amount
- ⏳ Saving updates transaction in Firestore
- ⏳ Table refreshes automatically with updated data
- ⏳ Success snackbar displays
- ⏳ Summary updates if amount changed

**How to test:**
1. Find a casual entry transaction (not reversed)
2. Click Edit button
3. Verify modal opens with pre-filled data
4. Change payment method to different option
5. Click "Update Transaction"
6. Verify transaction updates in table automatically
7. Check Firestore to confirm data saved

---

## Test 9: Edit Concession Purchase Transaction

**What to check:**
- ⏳ Clicking Edit button on concession purchase opens modal
- ⏳ Modal shows "Edit Transaction" title
- ⏳ Form pre-populates with current transaction data
- ⏳ Can change date, package, payment method
- ⏳ Saving updates transaction in Firestore
- ⏳ Associated concession block updates correctly
- ⏳ Student balance updates if package quantity changed
- ⏳ Table refreshes automatically with updated data
- ⏳ Success snackbar displays

**How to test:**
1. Find a concession purchase transaction
2. Click Edit button
3. Verify modal opens with pre-filled data
4. Change package to different option
5. Click "Update Transaction"
6. Verify transaction updates in table automatically
7. Check Firestore: transaction, concessionBlocks, student balance

---

## Test 10: Delete Transaction

**What to check:**
- ⏳ Delete button visible for super admin OR on today's date
- ⏳ Delete button NOT visible for front desk on past dates
- ⏳ Clicking delete opens confirmation modal
- ⏳ Modal shows transaction details
- ⏳ Clicking "Delete Transaction" marks as reversed
- ⏳ Transaction disappears from list
- ⏳ Transaction marked as reversed in Firestore
- ⏳ Success snackbar displays
- ⏳ Reversed transactions cannot be deleted again (button disabled)

**How to test:**
1. Login as super admin (or front desk on today's date)
2. Click delete button on transaction
3. Verify confirmation modal appears
4. Click "Delete Transaction"
5. Verify transaction disappears from table
6. Toggle "Show Reversed" ON
7. Verify transaction appears with REVERSED badge
8. Check Firestore to confirm reversed: true, reversedAt timestamp

---

## Test 11: Change Selected Date

**What to check:**
- ⏳ Changing check-in date reloads transactions for new date
- ⏳ Old date transactions disappear
- ⏳ New date transactions appear
- ⏳ Summary statistics update for new date
- ⏳ Real-time listener switches to new date
- ⏳ No console errors when switching dates

**How to test:**
1. Note current date's transactions
2. Change to different date with known transactions
3. Verify new transactions load
4. Verify old transactions gone
5. Check summary updates correctly
6. Look for console errors (should be none)

---

## Test 12: Empty State

**What to check:**
- ⏳ Selecting a date with no transactions shows empty state
- ⏳ Empty state shows icon and message
- ⏳ Summary shows zeros
- ⏳ No table rows display

**How to test:**
1. Select a date with no transactions (e.g., future date)
2. Verify empty state displays
3. Verify summary shows all zeros

---

## Test 13: Real-Time Updates

**What to check:**
- ⏳ Adding transaction via check-in form → appears in list immediately
- ⏳ Editing transaction via modal → updates in list immediately
- ⏳ Deleting transaction → disappears immediately
- ⏳ Summary statistics update in real-time
- ⏳ No page refresh required

**How to test:**
1. Have transactions list open
2. Add a new check-in with payment
3. Verify it appears in transactions list automatically
4. Edit a transaction
5. Verify it updates in list without refresh
6. Delete a transaction
7. Verify it disappears without refresh

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

**Total Tests:** 13  
**Passed:** ___  
**Failed:** ___  
**Skipped:** ___  

**Overall Status:** ⏳ Pending | 🟢 All Pass | 🔴 Has Failures

**Testing Complete:** ☐ Yes  ☐ No  
**Ready for Commit:** ☐ Yes  ☐ No  

**Notes:**
_____________
_____________

---

## Next Steps

After all tests pass:
1. ✅ Mark this file as complete
2. ⏳ Update LARGE_FILE_SPLITTING_AUDIT.md
3. ⏳ Commit changes to branch
4. ⏳ Move to next file (#4: checkin-online-payment.js)
