# File Splitting - Testing Guide

**Purpose:** Test each file after refactoring during large file splitting (Item #10)  
**Branch:** `refactor-split-large-files`  
**Date Started:** December 22, 2025

**Status Legend:** 🟢 Pass | 🔴 Fail | ⏸️ Skip | ⏳ Pending

---

## File #1: `change-password.js` → 3 Modules

**Refactoring Complete:** ✅ December 22, 2025  
**Status:** ⏳ Ready for Testing

**What Changed:**
- Original: 1 file, 456 lines
- New: 3 modules (validation, API, UI)
- Files: Created 3, Modified 1 (index.html), Deleted 1

---

## 🧪 How to Test

### Quick Start
1. Open student portal profile page in browser
2. Open browser DevTools (F12) → Console tab
3. Follow tests below
4. Mark each test: ⏳ → 🟢 (pass) or 🔴 (fail)

---

## Test 1: Page Load & Structure

**What to check:**
- ⏳ Page loads without console errors
- ⏳ No 404 errors for JavaScript modules
- ⏳ "Change Password" button exists in Security section

**How to test:**
1. Load profile page
2. Check console for red errors (should be none)
3. Verify "Change Password" button visible

---

## Test 2: Modal Opens

**What to check:**
- 🟢 Click "Change Password" button
- 🟢Modal appears with title "Change Password"
- 🟢Three password fields visible
- 🟢Eye icons on all three fields
- 🟢"Forgot your current password?" link at bottom
- 🟢"Cancel" and "Change Password" buttons visible

**How to test:**
1. Click "Change Password" button
2. Verify all elements render correctly
3. Check console for errors (should be none)

---

## Test 3: Password Toggle Works

**What to check:**
- 🟢Click eye icon on "Current Password" → password becomes visible
- 🟢Click eye icon on "New Password" → password becomes visible  
- 🟢Click eye icon on "Confirm Password" → password becomes visible
- 🟢Eye icon changes to eye-slash when visible
- 🟢Clicking again hides password

**How to test:**
1. Type "test" in each field
2. Click each eye icon
3. Verify text becomes visible/hidden

---

## Test 4: Validation - Empty Fields

**What to check:**
- 🟢Leave all fields empty → click "Change Password" → error message
- 🟢Error message: "Please fill in all password fields."
- 🟢Error displays in red box

**How to test:**
1. Click "Change Password" button (don't fill fields)
2. Verify error message appears

---

## Test 5: Validation - Password Requirements

**What to check:**
- 🟢New password < 8 chars → error: "must be at least 8 characters"
- 🟢New password "alllower" (no uppercase) → error: "must contain uppercase"
- 🟢New password "ALLUPPER" (no lowercase) → error: "must contain lowercase"

**How to test:**
1. Current: "anything", New: "short", Confirm: "short" → submit
2. Current: "anything", New: "alllower", Confirm: "alllower" → submit
3. Current: "anything", New: "ALLUPPER", Confirm: "ALLUPPER" → submit
4. Verify appropriate error for each case

---

## Test 6: Validation - Passwords Don't Match

**What to check:**
- 🟢New password ≠ Confirm password → error: "New passwords do not match"

**How to test:**
1. Current: "anything"
2. New: "ValidPass123"
3. Confirm: "DifferentPass456"
4. Click "Change Password" → verify error

---

## Test 7: Validation - Same as Current

**What to check:**
- 🟢New password = Current password → error: "must be different from current"

**How to test:**
1. Current: "SamePass123"
2. New: "SamePass123"
3. Confirm: "SamePass123"
4. Click "Change Password" → verify error

---

## Test 8: Wrong Current Password

**What to check:**
- 🟢Enter wrong current password → error: "Current password is incorrect"
- 🟢Button re-enables after error
- 🟢Can retry with correct password

**How to test:**
1. Current: "WrongPassword123"
2. New: "ValidPass123"
3. Confirm: "ValidPass123"
4. Click "Change Password"
5. Verify error, button re-enables
6. Try again with correct password

---

## Test 9: Successful Password Change

**What to check:**
- 🟢Enter valid passwords → button shows loading spinner
- 🟢Modal closes automatically
- 🟢Green snackbar appears: "Password changed successfully!"
- 🟢Can log out and log back in with new password

**How to test:**
1. Current: (your actual password)
2. New: "NewValidPass123"
3. Confirm: "NewValidPass123"
4. Click "Change Password"
5. Verify success flow
6. Log out → log in with new password
7. **Change password back to original afterward!**

---

## Test 10: UI Interactions

**What to check:**
- 🟢Press Enter in form → submits (same as clicking button)
- 🟢Click "Cancel" → modal closes, no password change
- 🟢Close and reopen modal → form is reset (empty fields)
- 🟢Modal opens → cursor in "Current Password" field

**How to test:**
1. Open modal, type in fields, press Enter
2. Open modal, click "Cancel"
3. Open modal, fill fields, close, reopen → fields empty
4. Open modal → verify cursor in first field

---

## Test 11: Forgot Password Link

**What to check:**
- 🟢Click "Forgot your current password?" link
- 🟢Change password modal closes
- 🟢Password reset modal opens with email pre-filled

**How to test:**
1. Open change password modal
2. Click "Forgot your current password?" link
3. Verify password reset modal appears

---

## Test 12: Admin View (if applicable)

**What to check:**
- 🟢 Security section hidden when admin viewing student profile

**How to test:**
1. (Admin only) View a student's profile from admin panel
2. Verify "Change Password" section not visible

**Issues Found:**
- ✅ FIXED: Security section was visible to admins
- Resolution: Added `window.isViewingAsAdmin` exposure in profile.js and `studentLoaded` event dispatch

---

## Test 13: Console Global Function

**What to check:**
- 🟢Run `window.showChangePasswordModal()` in console → modal opens

**How to test:**
1. Open browser console
2. Type: `window.showChangePasswordModal()`
3. Press Enter → verify modal opens

---

## 📊 Test Summary

**Status:** 🟢 13/13 test groups completed - ALL TESTS PASSING

**Mark off each test group as you complete it:**
- Test 1: 🟢 Page Load & Structure
- Test 2: 🟢 Modal Opens
- Test 3: 🟢 Password Toggle Works
- Test 4: 🟢 Validation - Empty Fields
- Test 5: 🟢 Validation - Password Requirements
- Test 6: 🟢 Validation - Passwords Don't Match
- Test 7: 🟢 Validation - Same as Current
- Test 8: 🟢 Wrong Current Password
- Test 9: 🟢 Successful Password Change
- Test 10: 🟢 UI Interactions
- Test 11: 🟢 Forgot Password Link
- Test 12: 🟢 Admin View (FIXED - security section now properly hidden)
- Test 13: 🟢 Console Global Function

---

## 🐛 Issues Found

### Issue #1: Admin View Security ✅ FIXED
**Problem:** Security section (including Change Password button) was visible when admin viewed student profile

**Root Cause:** 
- `isViewingAsAdmin` variable in profile.js was not exposed to `window`
- password-ui.js checked for `window.isViewingAsAdmin` but it was undefined
- `studentLoaded` event was not being dispatched when student profile loaded

**Solution:**
- Added `window.isViewingAsAdmin = isViewingAsAdmin` in profile.js (2 locations)
- Added `studentLoaded` event dispatch when student profile loads
- Security section now properly hides for admin users

**Files Modified:**
- [profile.js](student-portal/profile/profile.js#L40) - Exposed isViewingAsAdmin to window
- [profile.js](student-portal/profile/profile.js#L120) - Added studentLoaded event dispatch

**Testing:** ✅ Verified security section hidden when admin views student profile

---

## ✅ Testing Complete

**Date Completed:** December 22, 2025  
**Result:** ✅ All 13 test groups passing  
**Issues Found:** 1 (fixed during testing)  
**Ready for:** Commit and move to next file

### Next Steps:
1. ✅ All tests verified working
2. ✅ Admin security issue fixed
3. ✅ Ready to commit changes
4. 🎯 Move to next file: `casual-rates-display.js`

---

**Last Updated:** December 22, 2025
