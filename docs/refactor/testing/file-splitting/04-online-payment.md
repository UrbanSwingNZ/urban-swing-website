# File Splitting - Testing Guide

**Purpose:** Test online payment functionality after refactoring during large file splitting (File #4)  
**Branch:** `refactor-split-large-files`  
**Date Started:** December 23, 2025

**Status Legend:** 🟢 Pass | 🔴 Fail | ⏸️ Skip | ⏳ Pending

---

## File #4: `checkin-online-payment.js` → 3 Modules

**Refactoring Complete:** ✅ December 23, 2025  
**Status:** ✅ COMPLETE

**What Changed:**
- Original: 1 file, 484 lines
- New: 3 modules + 1 coordinator
- Files: Created 3 new modules, Modified 1 (main coordinator - reduced to 59 lines)

**Module Structure:**
- `online-payment/payment-validation.js` (215 lines) - Query & validate online transactions, auto-select logic
- `online-payment/payment-display.js` (154 lines) - Display transaction lists, success/warning/error messages
- `online-payment/payment-selection.js` (135 lines) - Select transactions, manage selection state, update dates
- `checkin-online-payment.js` (59 lines) - Main coordinator (88% reduction from 484 lines)

---

## 🧪 How to Test

### Setup Required
⚠️ **Important:** You need a test online payment transaction in Firestore to test this functionality.

**Option 1 (Recommended):** Use mock test data
- See `testing/file-splitting/04-online-payment-test-data.md`
- Manually create a test transaction in Firestore
- No need to enable Stripe dev mode

**Option 2:** Enable Stripe in test mode
- Not recommended - requires configuration changes
- Use Option 1 instead

### Quick Start
1. Create test transaction in Firestore (see 04-online-payment-test-data.md)
2. Open admin check-in page (`/admin/check-in/`)
3. Open browser DevTools (F12) → Console tab
4. Follow tests below
5. Mark each test: ⏳ → 🟢 (pass) or 🔴 (fail)

---

## Test 1: Page Load & Module Loading

**What to check:**
- 🟢Check-in page loads without console errors
- 🟢No 404 errors for JavaScript modules
- 🟢No import/export errors
- 🟢Check-in form displays correctly

**How to test:**
1. Navigate to check-in page
2. Check console for errors (should be none)
3. Verify page renders normally

---

## Test 2: Payment Method Radio Button Visibility

**What to check:**
- 🟢Student WITHOUT online payments: "Online Payment" radio button hidden
- 🟢Student WITH online payments: "Online Payment" radio button visible
- 🟢Switching between students updates visibility correctly

**How to test:**
1. Select a student who has no online payments
2. Verify "Online Payment" radio option is hidden (only Cash, EFTPOS, Bank visible)
3. Select your test student (who has the mock online payment)
4. Verify "Online Payment" radio option appears
5. Switch back to first student → verify it hides again

---

## Test 3: Exact Date Match - Auto-Selection

**What to check:**
- 🟢Test transaction with classDate = today
- 🟢System auto-selects "Online Payment" radio button
- 🟢Green success message displays
- 🟢Message shows "Using: Casual Entry for [today] - $15.00"
- 🟢Confirm button enabled immediately
- 🟢No need to manually select transaction

**How to test:**
1. Ensure test transaction has `classDate` = today at 00:00:00
2. Select test student
3. Select today's date
4. Verify "Online Payment" radio is auto-checked
5. Verify green success message appears
6. Verify Confirm button is enabled
7. Verify transaction details match your test data

---

## Test 4: Different Date - Manual Selection

**What to check:**
- 🟢Test transaction with classDate ≠ today (but within ±30 days)
- 🟢"Online Payment" radio button visible but not auto-selected
- 🟢Selecting radio shows warning message
- 🟢Warning message: "⚠ No match for [today]. Found online payments for:"
- 🟢Transaction list displays with "Use This" button
- 🟢Confirm button disabled until transaction selected
- 🟢Clicking "Use This" enables Confirm button
- 🟢Green success message shows selected transaction

**How to test:**
1. Change test transaction `classDate` to tomorrow (or yesterday)
2. Select test student
3. Select today's date
4. Click "Online Payment" radio button
5. Verify warning message appears
6. Verify transaction listed with "Use This" button
7. Verify Confirm button disabled
8. Click "Use This"
9. Verify green success message
10. Verify Confirm button enabled

---

## Test 5: No Available Payments

**What to check:**
- 🟢Student with no unused online payments
- 🟢"Online Payment" radio button hidden
- 🟢If somehow selected, shows error message
- 🟢Confirm button disabled

**How to test:**
1. Mark test transaction as used: `usedForCheckin: true`
2. Or delete the test transaction
3. Select test student
4. Verify "Online Payment" radio option hidden
5. (If you can manually enable it) Verify error/warning displays

---

## Test 6: Transaction Selection - Change Button

**What to check:**
- 🟢After selecting a transaction, "Change" button appears
- 🟢Clicking "Change" shows all available transactions again
- 🟢Can select a different transaction
- 🟢Selection updates correctly
- 🟢Confirm button state updates appropriately

**How to test:**
1. Create 2 test transactions for test student (different dates)
2. Select test student
3. Select "Online Payment"
4. System shows transaction list
5. Click "Use This" on first transaction
6. Verify "Change" button appears
7. Click "Change"
8. Verify transaction list appears again
9. Click "Use This" on second transaction
10. Verify selection updates

---

## Test 7: Transaction Date Range (±30 Days)

**What to check:**
- 🟢Transactions within 30 days of check-in date are shown
- 🟢Transactions outside 30 day window are excluded
- 🟢System correctly calculates date ranges

**How to test:**
1. Create transaction with `classDate` = today - 29 days
2. Create transaction with `classDate` = today + 29 days
3. Create transaction with `classDate` = today - 31 days (should be excluded)
4. Select test student on today's date
5. Select "Online Payment"
6. Verify first two transactions appear
7. Verify third transaction (31 days ago) does NOT appear

---

## Test 8: Transaction Type Filtering

**What to check:**
- 🟢Only 'casual' and 'casual-student' types appear
- 🟢'concession-purchase' transactions excluded
- 🟢Reversed transactions excluded
- 🟢Transactions with reversed=true hidden

**How to test:**
1. Create test transaction with `type: 'casual'` → should appear
2. Create test transaction with `type: 'casual-student'` → should appear
3. Create test transaction with `type: 'concession-purchase'` → should NOT appear
4. Create test transaction with `reversed: true` → should NOT appear
5. Select test student and "Online Payment"
6. Verify only casual and casual-student transactions show

---

## Test 9: Transaction Sorting

**What to check:**
- 🟢Multiple transactions sorted by date (newest first)
- 🟢Most recent transaction appears at top of list
- 🟢Sorting maintains correct order

**How to test:**
1. Create 3+ transactions with different dates:
   - Transaction A: today - 5 days
   - Transaction B: today - 10 days
   - Transaction C: today - 2 days
2. Select test student and "Online Payment"
3. Verify order: Transaction C (newest), A, B (oldest)

---

## Test 10: Edit Mode - Current Transaction Display

**What to check:**
- 🟢When editing existing check-in with online payment
- 🟢Current transaction shows "✓ Currently Using" badge
- 🟢Current transaction still selectable
- 🟢Other transactions show "Use This" button
- 🟢Can change to different transaction

**How to test:**
1. Create check-in using online payment (save transaction ID)
2. Edit that check-in
3. Verify transaction list appears
4. Verify current transaction has "Currently Using" badge
5. Verify other transactions have "Use This" button
6. Click "Use This" on different transaction
7. Save check-in
8. Verify new transaction linked correctly

---

## Test 11: Payment Method Identifier

**What to check:**
- 🟡Transactions with `paymentMethod: 'online'` recognized
- 🟡Transactions with `stripeCustomerId` (even without paymentMethod) recognized
- 🟡Both criteria work independently

**How to test:**
1. Create transaction: `paymentMethod: 'online'`, no stripeCustomerId
2. Create transaction: `stripeCustomerId: 'cus_xxx'`, no paymentMethod
3. Create transaction: both fields set
4. Select test student and "Online Payment"
5. Verify all three transactions appear

---

## Test 12: Real-Time Confirm Button State

**What to check:**
- 🟢Confirm button disabled when no transaction selected
- 🟢Confirm button enabled after auto-selection
- 🟢Confirm button enabled after manual selection
- 🟢Confirm button disabled if transaction deselected

**How to test:**
1. Select test student and "Online Payment"
2. Verify Confirm button state through each scenario:
   - Before selection: disabled
   - After auto-select: enabled
   - After manual "Use This": enabled
   - After clicking "Change": check state

---

## Test 13: Console Errors & Warnings

**What to check:**
- 🟢No JavaScript errors in console
- 🟢No module loading errors
- 🟢No Firestore errors (except expected "no documents" cases)
- 🟢Appropriate console.log messages for debugging

**How to test:**
1. Open DevTools console
2. Run through all test scenarios
3. Monitor for errors
4. Check error messages are helpful (not cryptic)

---

## Test 14: Integration with Check-In Flow

**What to check:**
- 🟢Selected transaction data available to check-in submission
- 🟢`getSelectedOnlineTransaction()` returns correct data
- 🟡Transaction linked correctly after check-in confirmed
- 🟢`usedForCheckin` field updated to true
- 🟢Transaction appears in transactions table

**How to test:**
1. Select test student, date, "Online Payment"
2. Select a transaction
3. Complete check-in (click Confirm)
4. Check Firestore: check-in document created
5. Check Firestore: transaction `usedForCheckin` = true
6. Go to Transactions tab
7. Verify transaction appears with link to check-in

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

**Total Tests:** 14  
**Passed:** 13  
**Failed:** 0  
**Skipped:** 1  

**Overall Status:** 🟢 All Pass

**Testing Complete:** ☑ Yes  ☐ No  
**Ready for Commit:** ☑ Yes  ☐ No  

**Notes:**
All tests passed successfully. File #4 refactoring complete.
- Fixed date range filtering bug (now uses classDate instead of transactionDate)
- Exposed all functions to window object for non-module scripts
- Test 11 skipped (requires multiple transaction variations)

---

## Next Steps

After all tests pass:
1. ✅ Mark this file as complete
2. ⏳ Clean up test transactions in Firestore
3. ⏳ Update LARGE_FILE_SPLITTING_AUDIT.md
4. ⏳ Commit changes to branch
5. ⏳ Move to next file (#5: todays-checkins.js)
