# File Splitting - Testing Guide

**Purpose:** Test casual rates display after refactoring during large file splitting (Item #10)  
**Branch:** `refactor-split-large-files`  
**Date Started:** December 22, 2025

**Status Legend:** 🟢 Pass | 🔴 Fail | ⏸️ Skip | ⏳ Pending

---

## File #2: `casual-rates-display.js` → 4 Modules

**Refactoring Complete:** ✅ December 22, 2025  
**Status:** ✅ Testing Complete - All Tests Passing

**What Changed:**
- Original: 1 file, 469 lines
- New: 4 modules (loader, display, actions, UI)
- Files: Created 4, Modified 1 (concession-types.html), Deleted 1

---

## 🧪 How to Test

### Quick Start
1. Open admin tools → Concession Types page (`/admin/admin-tools/concession-types.html`)
2. Scroll to "Casual Rates" section
3. Open browser DevTools (F12) → Console tab
4. Follow tests below
5. Mark each test: ⏳ → 🟢 (pass) or 🔴 (fail)

---

## Test 1: Page Load & Structure

**What to check:**
- 🟢 Page loads without console errors
- 🟢No 404 errors for JavaScript modules
- 🟢Casual rates section displays
- 🟢"Add Casual Rate" button visible

**How to test:**
1. Load concession-types.html page
2. Check console for red errors (should be none)
3. Scroll to "Casual Rates" section
4. Verify rates load or empty state shows

---

## Test 2: Display Rates List

**What to check:**
- 🟢Existing rates display as cards
- 🟢Each card shows: name, price, status toggle, drag handle
- 🟢Active/inactive badges display correctly
- 🟢Promo badges show for promo rates (if any)
- 🟢Edit and Delete buttons visible on each card

**How to test:**
1. View the rates list
2. Verify all rate information displays correctly
3. Check that status indicators (Active/Inactive) are accurate

---

## Test 3: Empty State

**What to check:**
- 🟡If no rates exist, empty state displays
- 🟡Empty state shows icon, message, and guidance
- 🟡"Add Casual Rate" prompt visible

**How to test:**
1. (If database has rates, temporarily delete all to test empty state)
2. Verify empty state UI displays properly
3. Restore rates after testing

---

## Test 4: Add New Rate

**What to check:**
- 🟢Click "Add Casual Rate" → modal opens
- 🟢Modal shows title "Add Casual Rate"
- 🟢Form fields visible: Name, Price, Description, Is Promo, Is Active
- 🟢All fields initially empty (except checkboxes)
- 🟢"Is Active" checkbox checked by default

**How to test:**
1. Click "Add Casual Rate" button
2. Verify modal opens with empty form
3. Don't submit yet

---

## Test 5: Add Rate Validation

**What to check:**
- 🟢Empty name → error: "Please fill in all required fields"
- 🟢Empty price → error: "Please fill in all required fields"
- 🟢Invalid price (negative) → error: "Please enter a valid price"
- 🟢Invalid price (text) → error: "Please enter a valid price"

**How to test:**
1. Try submitting with empty name
2. Try submitting with empty price
3. Try submitting with price = "-5"
4. Try submitting with price = "abc"
5. Verify appropriate errors for each case

---

## Test 6: Add Rate Successfully

**What to check:**
- 🟢Fill valid data → submit → success snackbar appears
- 🟢Modal closes automatically
- 🟢New rate appears in the list
- 🟢Rate has correct values displayed
- 🟢Document ID format: name-price (e.g., "casual-entry-15")

**How to test:**
1. Name: "Test Rate", Price: "25", Description: "Test description"
2. Check "Is Promo" and ensure "Is Active" is checked
3. Click Save/Submit
4. Verify success message and new rate appears
5. **Delete this test rate after testing!**

---

## Test 7: Edit Existing Rate

**What to check:**
- 🟢Click "Edit" on a rate → modal opens
- 🟢Modal title: "Edit Casual Rate"
- 🟢Form pre-filled with existing rate data
- 🟢Can modify fields
- 🟢Save updates the rate successfully

**How to test:**
1. Click "Edit" button on any rate
2. Verify all fields show current values
3. Change price from (e.g.) "25" to "30"
4. Save and verify update appears
5. **Change price back to original after testing!**

---

## Test 8: Rate Status Toggle

**What to check:**
- 🟢Click toggle switch → status changes
- 🟢Active → Inactive: card changes to inactive style
- 🟢Inactive → Active: card changes to active style
- 🟢Status label updates ("Active" / "Inactive")
- 🟢Success snackbar appears

**How to test:**
1. Find an active rate, toggle off
2. Verify UI updates immediately
3. Toggle back on
4. Verify UI updates back to active

---

## Test 9: Drag and Drop Reorder

**What to check:**
- 🟢Can drag rate card by grip handle
- 🟢Drop zone highlights when dragging over
- 🟢Rates reorder when dropped
- 🟢Display order saves to database
- 🟢Success snackbar: "Rate order updated"

**How to test:**
1. Drag a rate card by the grip icon (:::)
2. Drop it in a different position
3. Verify cards reorder
4. Refresh page → order persists

---

## Test 10: Delete Rate Confirmation

**What to check:**
- 🟢Click "Delete" → confirmation modal appears
- 🟢Modal shows: title, rate name, warning message
- 🟢"Delete Rate" and "Cancel" buttons visible
- 🟢Click "Cancel" → modal closes, no deletion
- 🟢Click "Delete Rate" → rate deleted, success message

**How to test:**
1. Click Delete on test rate created earlier
2. Verify confirmation modal with rate details
3. Click Cancel first time → nothing happens
4. Click Delete again, click "Delete Rate"
5. Verify rate disappears and success snackbar

---

## Test 11: Modal Close Interactions

**What to check:**
- 🟢Click X button → modal closes
- 🟢Click outside modal (background) → modal closes
- 🟢Reopen modal → form is reset

**How to test:**
1. Open add rate modal, fill some fields
2. Click X button → modal closes
3. Reopen → fields should be empty
4. Fill fields again, click outside modal
5. Reopen → fields should be empty

---

## Test 12: Console Global Functions

**What to check:**
- 🟢Run `window.loadCasualRates()` → rates reload
- 🟢Run `window.openRateModal()` → add modal opens
- 🟢Run `window.openRateModal('rate-id')` → edit modal opens (if valid ID)
- 🟢Run `window.closeRateModal()` → modal closes

**How to test:**
1. Open browser console
2. Type: `window.loadCasualRates()`
3. Verify rates reload with loading spinner
4. Try other global functions listed above

---

## Test 13: Multiple Rates Display

**What to check:**
- 🟢Create 3-5 test rates with different configurations
- 🟢Mix of active/inactive rates display correctly
- 🟢Mix of promo/non-promo rates display correctly
- 🟢All rates sortable by drag-drop
- 🟢All rates editable and deletable

**How to test:**
1. Create several test rates with variations
2. Verify all display correctly
3. Test reordering multiple rates
4. **Clean up all test rates after testing!**

---

## 📊 Test Summary

**Status:** 🟢 13/13 test groups completed - ALL TESTS PASSING

**Mark off each test group as you complete it:**
- Test 1: 🟢 Page Load & Structure
- Test 2: 🟢 Display Rates List
- Test 3: 🟡 Empty State (skipped - requires data deletion)
- Test 4: 🟢 Add New Rate
- Test 5: 🟢 Add Rate Validation
- Test 6: 🟢 Add Rate Successfully
- Test 7: 🟢 Edit Existing Rate
- Test 8: 🟢 Rate Status Toggle
- Test 9: 🟢 Drag and Drop Reorder
- Test 10: 🟢 Delete Rate Confirmation
- Test 11: 🟢 Modal Close Interactions
- Test 12: 🟢 Console Global Functions
- Test 13: 🟢 Multiple Rates Display

---

## 🐛 Issues Found

No issues found - all functionality working as expected.

---

## ✅ Testing Complete

**Date Completed:** December 22, 2025  
**Result:** ✅ All 13 test groups passing (1 skipped - empty state)  
**Issues Found:** 0  
**Ready for:** Commit and move to next file

### Next Steps:
1. ✅ All tests verified working
2. ✅ Test data cleaned up
3. ✅ Ready to commit changes
4. 🎯 Move to next file: `transactions.js`

---

**Last Updated:** December 22, 2025
