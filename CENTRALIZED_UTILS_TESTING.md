# Testing Plan: Centralized Utilities Library (Item #11)

**Created:** December 19, 2025  
**Updated:** December 20, 2025 (Added Test 2.8: Centralized Logout Handler)  
**Purpose:** Ensure the centralized utilities library refactoring doesn't break existing functionality  
**Estimated Testing Time:** 100-135 minutes (comprehensive test)

---

## 🎯 What Was Changed

The centralized utilities library consolidates **11+ duplicate functions** across **60+ instances**:
- `escapeHtml()` - XSS protection (10+ duplicates eliminated)
- `formatDate()` - Date formatting (7+ duplicates eliminated)
- `formatCurrency()` - Money display (3+ duplicates eliminated)
- `formatTimestamp()` - Firestore timestamps (4+ duplicates eliminated)
- `isValidEmail()` - Email validation (2+ duplicates eliminated)
- `showLoading()` - Loading states (8+ duplicates eliminated)
- `toTitleCase()` - Text capitalization (2+ duplicates eliminated)
- `handleLogout()` - Logout handler (12+ duplicates eliminated)
- Date utilities (isToday, getStartOfToday, etc.)

**What Happened:**
- ✅ Created `/js/utils/` directory with 6 specialized utility modules
- ✅ Migrated 17 files to import from centralized utilities
- ✅ Centralized handleLogout function across 12 additional files
- ✅ Deleted 5 old utils.js wrapper files
- ✅ Updated 7 HTML files to import from `/js/utils/index.js`
- ✅ All code now uses centralized utilities

**Risk Level:** LOW-MEDIUM - Most changes are internal, but testing critical paths is essential.

---

## 📋 Pre-Testing Setup

### Before You Start Testing

1. **Open Browser Developer Tools (F12)**
   - Keep the Console tab open throughout testing
   - Watch for any red error messages
   - Note any warnings about imports or undefined functions

2. **Have This Checklist Ready**
   - Mark off each test as you complete it
   - Note any issues you find with page name and description

3. **Test Environment**
   - Use your development/testing environment
   - If using LiveServer, ensure it's serving from the root directory
   - Test in your primary browser (Chrome/Firefox/Safari recommended)

4. **What to Look For**
   - ✅ Pages load without console errors
   - ✅ Dates display in consistent format (e.g., "19 Dec 2025")
   - ✅ Currency displays with $ sign and 2 decimals (e.g., "$25.50")
   - ✅ Loading spinners appear and disappear correctly
   - ✅ Success/error messages (snackbars) appear when expected
   - ✅ Special characters display safely (no script execution)
   - ✅ Form validation works (email validation, required fields)

---

---

# 🧪 START TESTING HERE

Test each section in order. Mark items as complete as you go through them.

---

## Part 1: Student Portal Testing (45-60 minutes)

### Test 1.1: Student Registration Page

**Navigate to:** `/student-portal/register.html`

**What to test:**

1. **Page loads without errors**
   - [✅] Check browser console - no red errors
   - [✅] Page displays correctly

2. **Email validation (uses `isValidEmail()`)**
   - [✅] Enter invalid email: `badformat` → Should show validation error
   - [✅] Enter invalid email: `test@` → Should show validation error
   - [✅] Enter valid email: `test@example.com` → Should accept it

3. **XSS protection (uses `escapeHtml()`)**
   - [✅] In the "First Name" field, enter: `<script>alert('xss')</script>`
   - [✅] In the "Last Name" field, enter: `Test & <User>`
   - [✅] Fill out remaining fields with valid data
   - [✅] Click "Register"
   - [✅] After registration, check that special characters display as text (not executed as code)
   - [✅] Verify no alert popup appeared

4. **Loading spinner (uses `showLoading()`)**
   - [✅] Click "Register" with valid data
   - [✅] Verify loading spinner appears while processing
   - [✅] Verify spinner disappears when complete

5. **Success message (uses `showSnackbar()` from centralized utils)**
   - [✅] After successful registration, verify green success message appears
   - [✅] Message should say something like "Registration successful"
   - [✅] Snackbar should have checkmark icon (fa-check-circle)
   - [✅] Snackbar should auto-hide after 3 seconds
   - [✅] Check console - no errors about showSnackbar being undefined

**Expected Results:**
- ✅ Email validation blocks invalid emails
- ✅ Special characters display safely (not executed)
- ✅ Loading spinner appears and disappears
- ✅ Success message displays

---

### Test 1.2: Student Portal Dashboard

**Navigate to:** `/student-portal/dashboard/`

**Login with:** The student account you just created (or existing test account)

**What to test:**

1. **Page loads correctly**
   - [✅] Check browser console - no red errors
   - [✅] Dashboard displays with your student data

2. **Date formatting (uses `formatDate()`)**
   - [N/A] Look at "Next Class" date → Should display as "DD MMM YYYY" (e.g., "25 Dec 2025")
   - [N/A] If you have prepaid classes listed, check those dates are also formatted consistently
   - [N/A] Verify NO dates show as "Invalid Date" or blank

3. **Currency formatting (uses `formatCurrency()`)**
   - [N/A] Look at "Account Balance" → Should display as "$XX.XX" (e.g., "$50.00")
   - [N/A] If you have credit/debit amounts, check they have $ sign and 2 decimal places
   - [N/A] Verify NO amounts show as "NaN" or missing the $ sign

4. **Loading spinner**
   - [✅] Refresh the page
   - [✅] Verify loading spinner appears while fetching data
   - [✅] Verify spinner disappears when data loads

**Expected Results:**
- ✅ All dates formatted as "DD MMM YYYY"
- ✅ All currency amounts show "$XX.XX" format
- ✅ No "Invalid Date" or "NaN" errors

---

### Test 1.3: Student Portal Profile Page

**Navigate to:** `/student-portal/profile/`

**What to test:**

1. **Page loads and displays data**
   - [✅] Check browser console - no red errors
   - [✅] Your profile information displays correctly

2. **Edit profile with special characters (uses `escapeHtml()`)**
   - [✅] Click "Edit Profile" or similar
   - [✅] Change first name to: `Test & Student`
   - [✅] Change last name to: `<Name>`
   - [✅] Click "Save Changes"
   - [✅] Verify loading spinner appears while saving

3. **Verify data saves safely**
   - [✅] After save completes, verify success message appears
   - [✅] Refresh the page
   - [✅] Check that special characters (&, <, >) display as text (not HTML)
   - [✅] Verify NO script execution or weird rendering

4. **Email validation (uses `isValidEmail()`)**
   - [✅] Click "Edit" again
   - [✅] Try changing email to invalid format: `bademail`
   - [✅] Try to save → Should show validation error
   - [✅] Change back to valid email and save successfully

**Expected Results:**
- ✅ Special characters save and display safely
- ✅ Email validation blocks invalid emails
- ✅ Loading spinner and success message work correctly

---

### Test 1.4: Student Portal Concessions Page

**Navigate to:** `/student-portal/concessions/`

**What to test:**

1. **Page loads concessions**
   - [✅] Check browser console - no red errors
   - [✅] Concession cards/list displays

2. **Date formatting (uses `formatDateDDMMYYYY()`)**
   - [✅] Look at concession expiry dates
   - [✅] Verify dates display as "DD/MM/YYYY" (e.g., "31/12/2025")
   - [✅] Check multiple concessions if you have them
   - [✅] Verify NO dates show as "Invalid Date"

3. **Currency formatting (uses `formatCurrency()`)**
   - [✅] Look at concession balance or price
   - [✅] Verify displays as "$XX.XX" (e.g., "$15.00")

4. **Loading spinner (uses `showLoading()`)**
   - [✅] Refresh the page
   - [✅] Verify spinner appears while loading
   - [✅] Verify spinner disappears when data loads

5. **Purchase concession (if available)**
   - [ ] Click "Purchase" or "Buy Concession" if option exists
   - [ ] Fill out the form
   - [ ] Click submit
   - [ ] Verify loading spinner appears during purchase
   - [ ] Verify success message appears after purchase
   - [ ] Check updated balance still formatted correctly

**Expected Results:**
- ✅ Expiry dates formatted as "DD/MM/YYYY"
- ✅ Currency formatted as "$XX.XX"
- ✅ Loading and success states work

---

### Test 1.5: Student Portal Transactions Page

**Navigate to:** `/student-portal/transactions/`

**What to test:**

1. **Transaction list loads**
   - [✅] Check browser console - no red errors
   - [✅] Transaction history displays

2. **Date formatting in transaction list (uses `formatDate()`)**
   - [✅] Scroll through your transaction history
   - [✅] Check that ALL transaction dates display as "DD MMM YYYY"
   - [✅] Verify dates are consistent across the entire list
   - [✅] Verify NO dates show as "Invalid Date", blank, or weird formats

3. **Currency formatting in amounts (uses `formatCurrency()`)**
   - [✅] Check the Amount column for each transaction
   - [✅] Verify ALL amounts display as "$XX.XX" (e.g., "$25.00", "$10.50")
   - [✅] Check for transactions with different amounts:
     - Small amounts (e.g., $5.00)
     - Large amounts (e.g., $150.00)
     - Zero amounts if any (should show "$0.00")
   - [✅] Verify NO amounts show as "NaN", missing $ sign, or wrong decimal places

4. **Transaction descriptions (uses `escapeHtml()`)**
   - [N/A] Look at transaction descriptions/notes
   - [N/A] Verify text displays normally (no weird HTML rendering)

5. **Date filtering (if available)**
   - [N/A] If there's a date filter, try selecting a date range
   - [N/A] Apply filter
   - [N/A] Verify filtered results still show dates formatted correctly

**Expected Results:**
- ✅ All transaction dates consistently formatted
- ✅ All amounts show proper currency format
- ✅ No "Invalid Date" or "NaN" errors anywhere
- ✅ Descriptions display safely

---

### Test 1.6: Student Portal Check-Ins Page

**Navigate to:** `/student-portal/check-ins/`

**What to test:**

1. **Page loads check-in history**
   - [✅] Check browser console - no red errors
   - [✅] Check-in history displays

2. **Date formatting in check-in list (uses `formatDate()`)**
   - [✅] Look at check-in dates in the list
   - [✅] Verify ALL dates display as "DD MMM YYYY" (e.g., "19 Dec 2025")
   - [✅] Check multiple check-ins if you have them
   - [✅] Verify NO dates show as "Invalid Date" or blank

3. **Time formatting (if shown, uses `formatTime()`)**
   - [✅] If check-in times are displayed, verify readable format (e.g., "7:30 PM")
   - [✅] Check multiple check-ins for consistency

4. **Loading spinner (uses `showLoading()`)**
   - [✅] Refresh the page
   - [✅] Verify loading spinner appears while fetching data
   - [✅] Verify spinner disappears when data loads

5. **Check-in details display (uses `escapeHtml()`)**
   - [✅] Look at class names or descriptions
   - [✅] Verify text displays normally (no weird HTML rendering)

**Expected Results:**
- ✅ All check-in dates consistently formatted
- ✅ Times displayed in readable format (if applicable)
- ✅ No "Invalid Date" errors
- ✅ Loading states work correctly

---

## Part 2: Admin Portal Testing (45-60 minutes)

### Test 2.1: Admin Check-In Page

**Navigate to:** `/admin/check-in/`

**Login with:** Your admin account

**What to test:**

1. **Page loads**
   - [✅] Check browser console - no red errors
   - [✅] Check-in interface displays

2. **Search for student**
   - [N/A] Use the search box to find a student
   - [N/A] Type student name
   - [N/A] Verify loading spinner appears during search
   - [N/A] Verify search results display

3. **Check-in a student (uses special `showLoading()`)**
   - [✅] Click "Check In" button for a student
   - [✅] **IMPORTANT:** Verify loading spinner appears AND the main content area dims/hides
   - [✅] This is the special check-in loading behavior - both spinner AND container hide
   - [✅] Verify success message appears after check-in
   - [✅] Verify main content area becomes visible again

4. **View check-in transaction (uses `formatDate()` and `formatCurrency()`)**
   - [✅] After checking in, find the transaction in the list
   - [✅] Check the date displays as "DD MMM YYYY"
   - [✅] Check the amount displays as "$XX.XX"

5. **Try checking in same student again**
   - [✅] Try to check in the same student twice
   - [✅] Verify error message appears (should prevent duplicate check-ins)

6. **Date filtering (uses date utilities)**
   - [✅] Look at the date filter/selector
   - [✅] Verify today's date is selected by default
   - [✅] Change to a different date
   - [✅] Change back to today
   - [✅] Verify check-ins filter by date correctly

**Expected Results:**
- ✅ Loading spinner + main container hiding works correctly (special behavior)
- ✅ Success/error messages appear appropriately
- ✅ Dates and currency formatted correctly
- ✅ Date filtering works

---

### Test 2.2: Admin Student Database

**Navigate to:** `/admin/student-database/`

**What to test:**

1. **Student list loads**
   - [✅] Check browser console - no red errors
   - [✅] Student list displays
   - [✅] Verify loading spinner appeared during load

2. **Search and select a student**
   - [✅] Use search to find a student
   - [✅] Click on student to view details
   - [✅] Student details panel opens

3. **View student data (uses `formatTimestamp()` and `escapeHtml()`)**
   - [✅] Look at "Created Date" or "Last Updated" timestamps
   - [✅] Verify timestamps display as readable dates (e.g., "19 Dec 2025")
   - [✅] Check student name displays correctly
   - [✅] Check any notes/comments display correctly

4. **Edit student with special characters (uses `escapeHtml()`)**
   - [✅] Click "Edit" on student record
   - [✅] Change student name to: `Test & Student <Name> "Quotes"`
   - [✅] Click "Save"
   - [✅] Verify loading spinner appears while saving
   - [✅] Verify success message appears
   - [✅] Refresh the page and select the same student
   - [✅] Verify special characters (&, <, >, ") display as text (safely)
   - [✅] Verify NO script execution or weird HTML rendering

5. **View concession history (uses `formatDate()` and `formatCurrency()`)**
   - [✅] Look at the student's concession history
   - [✅] Check all dates are formatted as "DD MMM YYYY"
   - [✅] Check all amounts are formatted as "$XX.XX"

6. **View transaction history**
   - [✅] Look at student's transaction history
   - [✅] Verify dates formatted consistently
   - [✅] Verify currency amounts formatted correctly

**Expected Results:**
- ✅ Timestamps display as readable dates
- ✅ Special characters display safely (no code execution)
- ✅ All dates and currency formatted consistently
- ✅ Loading and success states work

---

### Test 2.3: Admin Tools - Transactions

**Navigate to:** `/admin/admin-tools/transactions/`

**What to test:**

1. **Transaction list loads**
   - [✅] Check browser console (no red errors)
   - [✅] Transaction list displays

2. **Check date formatting (uses `formatDate()`)**
   - [✅] Scroll through the transaction list
   - [✅] Verify ALL dates display as "DD MMM YYYY"
   - [✅] Check transactions from different days/months
   - [✅] Verify NO dates show as "Invalid Date"

3. **Check currency formatting (uses `formatCurrency()`)**
   - [✅] Look at the Amount column
   - [✅] Verify ALL amounts display as "$XX.XX"
   - [✅] Check various transaction amounts
   - [✅] Verify NO amounts show as "NaN" or missing $ sign

4. **Student name display (uses `escapeHtml()`)**
   - [✅] Check student names in the list
   - [✅] Verify names display correctly
   - [✅] If any student has special characters in name, verify they display safely

5. **Filter transactions (if available)**
   - [✅] Try date range filtering
   - [✅] Try student filtering
   - [✅] Apply filters
   - [✅] Verify filtered results still show proper formatting

6. **Logout function**
   - [N/A] Click logout button (if present)
   - [N/A] Verify it logs you out correctly
   - [N/A] Log back in to continue testing

**Expected Results:**
- ✅ All dates formatted consistently
- ✅ All currency formatted correctly
- ✅ Student names display safely
- ✅ Filtering works without breaking formatting

---

### Test 2.4: Admin Tools - Gift Concessions

**Navigate to:** `/admin/admin-tools/gift-concessions/`

**What to test:**

1. **Page loads**
   - [✅] Check browser console - no red errors
   - [✅] Gift concessions interface displays

2. **Search for student (uses `getStudentFullName()` and `escapeHtml()`)**
   - [✅] Search for a student by name
   - [✅] Verify search results display
   - [✅] Check student names display correctly (First Last format, title cased)
   - [✅] If student has special characters in name, verify they display safely

3. **Select student and gift concession**
   - [✅] Select a student from search results
   - [✅] Choose a concession type to gift
   - [✅] Fill in any required fields
   - [✅] Click "Gift Concession" or similar button

4. **Verify dates (uses `formatDate()`)**
   - [✅] Look at expiry date or grant date fields
   - [✅] Verify dates display as "DD MMM YYYY"

5. **Confirm gifting (uses `showSnackbar()` from centralized utils)**
   - [✅] Complete the gift concession process
   - [✅] Verify loading spinner appears
   - [✅] Verify success snackbar displays with green styling
   - [✅] Success snackbar should have checkmark icon
   - [✅] Snackbar auto-hides after 3 seconds
   - [✅] Check the concession was added (check student's account if possible)
   - [✅] Check console - no showSnackbar errors

**Expected Results:**
- ✅ Student names formatted properly (title case)
- ✅ Dates formatted correctly
- ✅ Special characters display safely
- ✅ Gifting process works correctly
- ✅ Success notifications display properly

---

### Test 2.5: Admin Tools - Closedown Nights

**Navigate to:** `/admin/admin-tools/closedown-nights/`

**What to test:**

1. **Scheduled closedowns load**
   - [✅] Check browser console - no red errors
   - [✅] List of closedown periods displays

2. **View existing closedowns (uses `formatDate()` and `formatTimestamp()`)**
   - [✅] Look at listed closedown periods
   - [✅] Check Start Date displays as "DD MMM YYYY"
   - [✅] Check End Date displays as "DD MMM YYYY"
   - [✅] If there's a "Created" or "Updated" timestamp, verify it's readable

3. **Add new closedown period (if permitted)**
   - [✅] Click "Add Closedown" or similar
   - [✅] Select start and end dates
   - [✅] Add description/reason
   - [✅] Click "Save" or "Add"
   - [✅] Verify loading state appears
   - [✅] Verify success message displays

4. **Verify new closedown displays correctly**
   - [✅] After adding, verify it appears in the list
   - [✅] Check dates are formatted correctly

**Expected Results:**
- ✅ All dates formatted as "DD MMM YYYY"
- ✅ Timestamps readable
- ✅ Adding closedowns works correctly

---

### Test 2.6: Admin Tools - Concession Types

**Navigate to:** `/admin/admin-tools/concession-types.html`

**What to test:**

1. **Page loads**
   - [✅] Check browser console - no red errors
   - [✅] Concession types list displays
   - [✅] Verify loading spinner appeared during initial load

2. **View concession types**
   - [✅] Scroll through the list of concession types
   - [✅] Verify all data displays correctly

3. **Edit concession type (if permitted)**
   - [✅] Click "Edit" on a concession type
   - [✅] Make a small change (e.g., description)
   - [✅] Save changes
   - [✅] Verify snackbar appears
   - [✅] Verify success confirmation

4. **Drag and drop (if available)**
   - [✅] If concession types can be reordered by dragging
   - [✅] Try dragging one to a new position
   - [✅] Verify status message appears during drag
   - [✅] Verify order saves correctly

5. **Toggle status (if available)**
   - [✅] If concessions can be enabled/disabled
   - [✅] Try toggling one on/off
   - [✅] Verify status updates
   - [✅] Verify status message appears

**Expected Results:**
- ✅ Loading spinner works
- ✅ Status messages display in drag-hint area
- ✅ Edit/drag/toggle operations work correctly

---

### Test 2.7: Admin Playlist Manager

**Navigate to:** `/admin/playlist-manager/`

**What to test:**

1. **Page loads**
   - [✅] Check browser console - no red errors
   - [✅] Spotify integration interface displays

2. **Spotify authentication (if not already connected)**
   - [✅] If not authenticated, try connecting to Spotify
   - [ ] Verify success/error snackbar displays with icon
   - [ ] Check console - no showSnackbar errors

3. **Load playlist**
   - [✅] Try loading a playlist
   - [✅] Verify loading spinner appears
   - [N/A] Verify success snackbar when playlist loads
   - [✅] Snackbar should have checkmark icon (fa-check-circle)
   - [✅] Snackbar should auto-hide after 3 seconds

4. **Playlist operations**
   - [✅] Try any available playlist operation (e.g., refresh, update)
   - [✅] Verify snackbars appear for success/error states
   - [✅] Check that snackbars have appropriate icons:
     - Success: green with fa-check-circle
     - Error: red with fa-exclamation-circle
     - Warning: orange with fa-exclamation-triangle

5. **Error handling**
   - [N/A] If possible, trigger an error (e.g., try operation while disconnected)
   - [N/A] Verify error snackbar displays correctly
   - [N/A] Check console for any showSnackbar-related errors

**Expected Results:**
- ✅ Success snackbars display with green styling and checkmark icon
- ✅ Error snackbars display with red styling and error icon
- ✅ Snackbars auto-hide after 3 seconds
- ✅ No console errors about showSnackbar being undefined
- ✅ Loading states work correctly

---

### Test 2.8: Centralized Logout Handler

**Navigate to:** Any admin page with the shared header (e.g., `/admin/check-in/`)

**What to test:**

**Important Note:** The logout button is in the shared admin header component, so you only need to test it once - it works the same on all admin pages.

1. **Verify logout button exists in header**
   - [✅] Find the logout button in the admin header (top right)
   - [✅] Button should be visible and clickable

2. **Test logout functionality**
   - [✅] Click the logout button
   - [✅] Verify you are logged out (Firebase Auth signOut called)
   - [✅] Verify redirect to home page (/)
   - [✅] Page should redirect within 1-2 seconds

3. **Verify authentication state**
   - [✅] After logout, verify you're on the home page or login page
   - [✅] Try to navigate back to an admin page (e.g., `/admin/check-in/`)
   - [✅] Should be redirected to login (not able to access without auth)

4. **Check for errors**
   - [✅] Open browser console before clicking logout
   - [✅] After logout completes, check console
   - [✅] Should see no red errors

**Console Test:**

5. **Test global handleLogout availability**
   - [✅] Open browser console on any admin page
   - [✅] Type: `typeof handleLogout`
   - [✅] Expected: Should return "function"
   - [✅] Type: `typeof window.handleLogout`
   - [✅] Expected: Should return "function"

**Expected Results:**
- ✅ Logout button works (only need to test once per header type)
- ✅ Logout redirects to home page (/)
- ✅ No "handleLogout is not defined" errors
- ✅ Firebase Auth signOut completes successfully
- ✅ Authentication state properly cleared
- ✅ No console errors related to logout
- ✅ handleLogout available globally as window.handleLogout

**Common Issues to Watch For:**
- ❌ "handleLogout is not defined" error
- ❌ Logout button does nothing when clicked
- ❌ Multiple redirects or infinite redirect loops
- ❌ Alert saying "Error logging out"
- ❌ Console error about Firebase Auth
- ❌ Remaining logged in after clicking logout

**Note:** Since the admin header is shared across all admin pages, testing logout once on any admin page is sufficient. You don't need to test it on every single admin page.

---

## Part 3: Edge Case & Security Testing (15-20 minutes)

### Test 3.1: XSS Attack Prevention

**Purpose:** Verify malicious scripts don't execute

**What to test:**

1. **In Student Registration**
   - [✅] Try registering with name: `<img src=x onerror=alert('XSS')>`
   - [✅] Verify NO alert appears
   - [✅] Verify text displays as-is (not executed)

2. **In Profile Edit**
   - [✅] Try changing name to: `"><script>alert(document.cookie)</script>`
   - [✅] Save and refresh
   - [✅] Verify NO alert appears
   - [✅] Verify text displays safely

3. **In Admin Student Database**
   - [✅] Edit student with name: `<svg onload=alert('hacked')>`
   - [✅] Save and view student
   - [✅] Verify NO alert appears
   - [✅] Verify SVG doesn't render, displays as text

**Expected Results:**
- ✅ NO script execution anywhere
- ✅ All special characters display as plain text
- ✅ No alerts, no code execution, no weird rendering

---

### Test 3.2: Null/Undefined Handling

**Purpose:** Verify app doesn't crash with missing data

**What to test:**

1. **Check browser console tests**
   - [✅] Open browser console on any page
   - [✅] Run: `formatDate(null)`
   - [✅] Expected: Should return "-" (not crash)
   - [✅] Run: `formatCurrency(undefined)`
   - [✅] Expected: Should return "$0.00" or handle gracefully (not crash)
   - [✅] Run: `escapeHtml(null)`
   - [✅] Expected: Should return "" (empty string, not crash)

2. **Look for any blank/null data in lists**
   - [✅] Go to transaction lists (student or admin)
   - [✅] Look for any transactions with missing data
   - [✅] Verify missing dates show "-" or similar (not "Invalid Date")
   - [✅] Verify missing amounts show "$0.00" or similar (not "NaN")

**Expected Results:**
- ✅ Functions handle null/undefined gracefully
- ✅ No crashes or "undefined" errors
- ✅ Missing data displays sensibly ("-", "$0.00", etc.)

---

### Test 3.3: Large Numbers & Edge Values

**Purpose:** Verify formatting works with unusual values

**What to test:**

1. **Large currency amounts**
   - [✅] If possible, find a transaction with large amount (or test in console)
   - [✅] Run in console: `formatCurrency(999999)`
   - [✅] Expected: "$999,999.00" (with commas)

2. **Small currency amounts**
   - [✅] Run in console: `formatCurrency(0.01)`
   - [✅] Expected: "$0.01" (correct decimal handling)

3. **Zero amounts**
   - [✅] Look for any $0.00 transactions
   - [✅] Verify displays as "$0.00" (not "$0", not blank)

4. **Negative amounts (refunds)**
   - [N/A] If there are refund transactions
   - [N/A] Verify displays as "-$XX.XX" (negative sign before dollar)

**Expected Results:**
- ✅ Large numbers formatted with commas
- ✅ Small decimals handled correctly
- ✅ Zero and negative values display properly

---

### Test 3.4: Console Error Check

**Purpose:** Final verification of no errors

**What to test:**

1. **Navigate through entire app**
   - [✅] Open browser Developer Tools Console
   - [✅] Clear any existing console messages
   - [✅] Navigate to each major section:
   - [✅] Student Portal home
   - [✅] Student Portal dashboard
   - [✅] Student Portal profile
   - [✅] Student Portal concessions
   - [✅] Student Portal transactions
   - [✅] Admin check-in
   - [✅] Admin student database
   - [✅] Admin tools - transactions
   - [✅] Admin tools - gift concessions
   - [✅] After visiting each page, check console

2. **Look for specific errors**
   - [✅] No "module not found" errors
   - [✅] No "undefined function" errors
   - [✅] No "cannot read property" errors
   - [✅] No import errors
   - [✅] No red error messages at all

**Expected Results:**
- ✅ NO red errors in console anywhere
- ✅ Warnings (if any) are minor and pre-existing
- ✅ All pages load successfully

---

# 📊 After Testing: Recording Results

## Test Results Summary

**Date Tested:** _______________  
**Tested By:** _______________  
**Browser Used:** _______________  
**Total Test Time:** _______________

### Results by Section

**Part 1: Student Portal**
- [✅] Test 1.1: Registration - PASS / FAIL
- [✅] Test 1.2: Dashboard - PASS / FAIL
- [✅] Test 1.3: Profile - PASS / FAIL
- [✅] Test 1.4: Concessions - PASS / FAIL
- [✅] Test 1.5: Transactions - PASS / FAIL

**Part 2: Admin Portal**
- [✅] Test 2.1: Check-In - PASS / FAIL
- [✅] Test 2.2: Student Database - PASS / FAIL
- [✅] Test 2.3: Transactions - PASS / FAIL
- [✅] Test 2.4: Gift Concessions - PASS / FAIL
- [✅] Test 2.5: Closedown Nights - PASS / FAIL
- [✅] Test 2.6: Concession Types - PASS / FAIL
- [✅] Test 2.7: Playlist Manager - PASS / FAIL
- [✅] Test 2.8: Logout Handler - PASS / FAIL

**Part 3: Edge Cases**
- [✅] Test 3.1: XSS Prevention - PASS / FAIL
- [✅] Test 3.2: Null Handling - PASS / FAIL
- [✅] Test 3.3: Large Numbers - PASS / FAIL
- [✅] Test 3.4: Console Errors - PASS / FAIL

### Issues Found

**Critical Issues (Breaks functionality):**
1. _____________________________________
2. _____________________________________

**Medium Issues (Affects some areas):**
1. _____________________________________
2. _____________________________________

**Minor Issues (Cosmetic/non-blocking):**
1. _____________________________________
2. _____________________________________

### Overall Assessment

- [ ] ✅ **PASS** - All tests passed, ready for production
- [ ] ⚠️ **PASS WITH NOTES** - Minor issues found but not blocking
- [ ] ❌ **FAIL** - Critical issues found, needs fixes before proceeding

### Notes

_____________________________________________
_____________________________________________
_____________________________________________

---

## Next Steps

### If All Tests Pass ✅

1. **Commit the changes:**
   ```bash
   git add .
   git commit -m "feat: Complete centralized utilities library (Item #11)
   
   - Created /js/utils/ with 6 utility modules
   - Migrated 13 files to use centralized utilities
   - Deleted 5 legacy utils.js wrapper files
   - Updated 7 HTML files to import from centralized location
   - Eliminated ~150 lines of duplicated code
   - Comprehensive testing: All critical paths passing"
   ```

2. **Push to repository:**
   ```bash
   git push origin refactor-centralised-utilities
   ```

3. **Mark Item #11 complete** in your refactoring tracking

4. **Celebrate!** You've successfully consolidated the utilities library! 🎉

### If Tests Fail ❌

1. **Document each issue:**
   - Page where issue occurred
   - Expected behavior
   - Actual behavior
   - Console error messages (take screenshots)
   - Steps to reproduce

2. **Report issues** for fixing:
   - List all issues found above
   - Mark severity (Critical/Medium/Minor)
   - Provide screenshots of console errors

3. **Wait for fixes**, then re-test failed areas

4. **Once fixed, re-run full test** to confirm

---

## Important Notes

**Console Warning vs Error:**
- **Red errors** = Bad, must be fixed
- **Yellow warnings** = Usually okay, note them but may be pre-existing
- **Blue info messages** = Fine, informational only

**What "PASS" means:**
- Page loads without console errors
- Data displays correctly formatted
- User actions work as expected
- No regressions from before refactoring

**Testing Tips:**
- Test methodically - don't skip steps
- Mark checkboxes as you go
- If something seems wrong, check console first
- Take screenshots of any errors
- Don't assume - actually test each item

---

**Document Version:** 2.0 (Page-by-page testing flow)  
**Last Updated:** December 20, 2025

Before testing full user flows, verify core functions work in browser console:

### ✅ escapeHtml() - XSS Protection

**Test Cases:**
1. Normal text: `escapeHtml("Hello World")` → "Hello World"
2. HTML tags: `escapeHtml("<script>alert('xss')</script>")` → "&lt;script&gt;alert('xss')&lt;/script&gt;"
3. Null/undefined: `escapeHtml(null)` → "" (empty string)
4. Special chars: `escapeHtml("A&B<C>D")` → "A&amp;B&lt;C&gt;D"

**Critical Pages:**
- Student registration (email display in modals)
- Gift concessions (student names)
- Transaction history (descriptions)

**Status:** ⏭️ Not tested yet

---

### ✅ formatCurrency() - Money Display

**Test Cases:**
1. Whole dollars: `formatCurrency(15)` → "$15.00"
2. Cents: `formatCurrency(15.50)` → "$15.50"
3. Large amounts: `formatCurrency(1250.75)` → "$1,250.75"
4. Zero: `formatCurrency(0)` → "$0.00"
5. Negative: `formatCurrency(-10.50)` → "-$10.50"

**Critical Pages:**
- Student portal: Purchase page, transaction history
- Admin: Check-in transactions, reports
- Anywhere prices are displayed

**Status:** ⏭️ Not tested yet

---

### ✅ formatDate() - Date Display

**Test Cases:**
1. Current date: `formatDate(new Date())` → "19 Dec 2025"
2. Timestamp: `formatDate(Date.now())` → "19 Dec 2025"
3. Null: `formatDate(null)` → "-"
4. Invalid: `formatDate("invalid")` → "-"

**Critical Pages:**
- Transaction history (dates)
- Concessions (expiry dates)
- Student database (dates)

**Status:** ⏭️ Not tested yet

---

### ✅ formatDateDDMMYYYY() - Date in DD/MM/YYYY

**Test Cases:**
1. Current date: `formatDateDDMMYYYY(new Date())` → "19/12/2025"
2. Single digit day/month: `formatDateDDMMYYYY(new Date(2025, 0, 5))` → "05/01/2025"

**Critical Pages:**
- Student portal concessions page

**Status:** ⏭️ Not tested yet

---

### ✅ formatTimestamp() - Firestore Timestamp

**Test Cases:**
1. Firestore timestamp object
2. Null timestamp → "Unknown"

**Critical Pages:**
- Transaction history
- Student database records
- Any Firestore data display

**Status:** ⏭️ Not tested yet

---

### ✅ isValidEmail() - Email Validation

**Test Cases:**
1. Valid: `isValidEmail("test@example.com")` → true
2. Invalid - no @: `isValidEmail("testexample.com")` → false
3. Invalid - no domain: `isValidEmail("test@")` → false
4. Invalid - no TLD: `isValidEmail("test@example")` → false
5. Empty: `isValidEmail("")` → false

**Critical Pages:**
- Student registration form
- Email change in profile

**Status:** ⏭️ Not tested yet

---

### ✅ showLoading() - Loading Spinner

**Test Cases:**
1. Show spinner: `showLoading(true)` → spinner visible
2. Hide spinner: `showLoading(false)` → spinner hidden
3. Check-in special behavior: Also hides/shows main-container

**Critical Pages:**
- All pages with loading states
- Especially check-in (has special behavior)

**Status:** ⏭️ Not tested yet

---

### ✅ Date Utilities

**Test Cases:**
1. `isToday(new Date())` → true
2. `isToday(yesterday)` → false
3. `getStartOfToday()` → today at 00:00:00
4. `getEndOfToday()` → today at 23:59:59

**Critical Pages:** Check-in page (date filtering), reports

**These are tested in detail in the area-by-area testing sections below.**

---

## 🗺️ Area-by-Area Testing Plan

### ✅ Minimum Viable Test (30 minutes) - START HERE

If you have limited time, test **only these critical paths**:

#### 1. Browser Console Tests (5 min)

Open any page and run in browser console:

```javascript
// Test imports work
import { escapeHtml, formatCurrency, formatDate } from '/js/utils/index.js';

// Test escapeHtml
console.log('escapeHtml test:', escapeHtml('<script>alert("xss")</script>'));
// Expected: &lt;script&gt;alert("xss")&lt;/script&gt;

// Test formatCurrency
console.log('formatCurrency test:', formatCurrency(1234.56));
// Expected: $1,234.56

// Test formatDate
console.log('formatDate test:', formatDate(new Date()));
// Expected: 19 Dec 2025 (or current date)

// Test null handling
console.log('Null handling:', escapeHtml(null), formatDate(null));
// Expected: '' (empty string), '-'
```

**Pass:** All functions work, no console errors

#### 2. Student Registration (5 min)

- [ ] Navigate to student portal registration
- [ ] Try invalid email: `bad.email` → Should show validation error
- [ ] Enter name with special chars: `Test & <User>` → Should be escaped
- [ ] Complete with valid data → Success message appears

**Pass:** Email validation works, XSS protection works, snackbars appear

#### 3. View Transaction History (5 min)

- [ ] Login to student portal
- [ ] Navigate to transactions page
- [ ] Verify all dates formatted consistently (e.g., "19 Dec 2025")
- [ ] Verify all amounts with $ and decimals (e.g., "$25.50")

**Pass:** All dates and currency formatted correctly

#### 4. Admin Check-in (5 min)

- [ ] Login to admin check-in
- [ ] Search for a student
- [ ] Check them in
- [ ] Verify loading spinner works (spinner + hide main container)
- [ ] Verify transaction appears with correct date/currency

**Pass:** Check-in works, loading behavior correct, formatting correct

#### 5. Admin Student Database XSS Test (5 min)

- [ ] Go to admin student database
- [ ] Edit student name to: `<script>alert('xss')</script>`
- [ ] Save
- [ ] Verify it displays as text, not executes

**Pass:** XSS protection working

#### 6. Console Error Check (5 min)

- [ ] Open DevTools Console
- [ ] Navigate through: dashboard, transactions, check-in, student database
- [ ] Look for any red errors or warnings

**Pass:** No import errors, no function undefined errors

**If all 6 minimum tests pass, refactoring is very likely successful.**

---

### 📱 Student Portal Testing (60 minutes)

#### 1. Registration (`/student-portal/register.html`) - 15 min

- [ ] **Load page** - No console errors
- [ ] **Enter valid data:**
  - Name: `John Smith`
  - Email: `john.smith@example.com`
  - Phone: `021 234 5678`
- [ ] **Click Register** - Success snackbar appears
- [ ] **Try invalid email:** `invalid.email` - Validation error shows
- [ ] **Try XSS in name:** `<script>alert('xss')</script>` - Should be escaped

**✅ Pass Criteria:**
- Registration succeeds with valid data
- Validation blocks invalid data
- Success snackbar appears
- No XSS vulnerability

---

#### 2. Dashboard (`/student-portal/dashboard/`) - 10 min

- [ ] **Login as student**
- [ ] **View dashboard** - Loading spinner appears, then data loads
- [ ] **Check prepaid classes** - Dates formatted correctly
- [ ] **Check account balance** - Currency formatted correctly (e.g., `$50.00`)
- [ ] **Check recent transactions** - Dates and amounts formatted correctly

**✅ Pass Criteria:**
- All dates in consistent format
- All currency amounts have $ and 2 decimals
- Loading spinner works

---

#### 3. Profile (`/student-portal/profile/`) - 10 min

- [ ] **Navigate to profile page**
- [ ] **Edit name** - Change to different value
- [ ] **Click Save** - Loading spinner appears
- [ ] **Verify success snackbar** - "Profile updated successfully"
- [ ] **Try special characters:** `Test & <Name>`
- [ ] **Verify escaping** - Should display safely, not execute

**✅ Pass Criteria:**
- Save operation works
- Snackbar appears on success
- Special characters escaped
- Loading states work

---

#### 4. Concessions (`/student-portal/concessions/`) - 10 min

- [ ] **View concessions page**
- [ ] **Check concession balance** - Currency formatted
- [ ] **Check expiry dates** - DD/MM/YYYY format
- [ ] **Purchase concession** - Submit form
- [ ] **Verify loading spinner** - Appears during purchase
- [ ] **Verify success snackbar** - Purchase confirmation
- [ ] **Check updated balance** - Currency still formatted correctly

**✅ Pass Criteria:**
- Currency formatting consistent
- Dates in DD/MM/YYYY format
- Loading and success states work
- Snackbars display correctly

---

#### 5. Transactions (`/student-portal/transactions/`) - 15 min

- [ ] **View transaction history**
- [ ] **Check date column** - All dates formatted consistently
- [ ] **Check amount column** - All amounts with $ and decimals
- [ ] **Filter by date range** - Results update correctly
- [ ] **Check edge cases:**
  - Zero amount: `$0.00`
  - Large amount: `$1,234.56`
  - Negative amount (if refund): `-$10.00`

**✅ Pass Criteria:**
- All dates consistent format
- All amounts properly formatted
- No "Invalid Date" or "NaN"

---

### 🔧 Admin Portal Testing (90 minutes)

#### 1. Check-In System (`/admin/check-in/`) - 20 min

- [ ] **Load check-in page** - No console errors
- [ ] **Search for student** - Loading spinner works
- [ ] **Check in student** - Success snackbar appears
- [ ] **Verify special loading behavior** - Spinner shows AND main-container hides
- [ ] **View check-in history** - Dates formatted correctly
- [ ] **Try checking in same student twice** - Error snackbar appears
- [ ] **Verify date filtering** - Today's date filters correctly
- [ ] **Check transaction displays** - Currency formatted

**✅ Pass Criteria:**
- Check-in succeeds
- Success/error snackbars work
- Special loading behavior preserved (hides main-container)
- Dates formatted consistently
- Currency formatted correctly

---

#### 2. Student Database (`/admin/student-database/`) - 25 min

- [ ] **Load student database** - Loading spinner while fetching
- [ ] **Search students** - Results appear
- [ ] **Click on student** - Details load correctly
- [ ] **Edit student info:**
  - Change name to: `Test & Student <Name>`
  - Click Save
- [ ] **Verify escaping** - Special characters display safely
- [ ] **View concession history:**
  - Dates formatted correctly
  - Amounts formatted correctly (e.g., `$15.00`)
- [ ] **Check created/updated timestamps** - Formatted correctly
- [ ] **Add note with special chars:** `Notes: <test> & "quotes"`
- [ ] **Verify XSS protection** - Should display as text

**✅ Pass Criteria:**
- All CRUD operations work
- Special characters escaped
- Dates and currency formatted
- Loading and snackbar states work
- Timestamps from Firestore display correctly

---

#### 3. Admin Tools - Transactions (`/admin/admin-tools/transactions/`) - 15 min

- [ ] **Load transaction list**
- [ ] **Verify columns:**
  - Date column: All dates formatted consistently
  - Amount column: All amounts with $ and decimals
  - Student column: Names displayed safely
- [ ] **Filter by date range:**
  - Select start date
  - Select end date
  - Apply filter
- [ ] **Verify filtered results** - Dates still formatted correctly
- [ ] **Check logout function** - Works correctly

**✅ Pass Criteria:**
- All dates in consistent format
- All amounts properly formatted
- Filtering works without breaking formatting

---

#### 4. Admin Tools - Gift Concessions - 10 min

- [ ] **Navigate to gift concessions tool**
- [ ] **Search for a student**
- [ ] **Gift a concession**
- [ ] **Verify student name displays correctly** - Uses getStudentFullName
- [ ] **Check dates formatted** - Consistent format
- [ ] **Verify success snackbar**

**✅ Pass Criteria:**
- Student names display correctly
- Dates formatted
- XSS protection works

---

#### 5. Admin Tools - Closedown Nights - 10 min

- [ ] **View scheduled closedown nights**
- [ ] **Check dates formatted** - Consistent format
- [ ] **Check timestamps** - Created/updated dates formatted
- [ ] **Add new closedown period**
- [ ] **Verify success message**

**✅ Pass Criteria:**
- Dates and timestamps formatted correctly
- Operations work correctly

---

#### 6. Admin Tools - Concession Types - 10 min

- [ ] **Load concession types page**
- [ ] **Verify loading spinner works**
- [ ] **Check status messages** - Uses showStatusMessage in drag-hint
- [ ] **Perform drag/drop operation** (if applicable)
- [ ] **Edit concession type**
- [ ] **Verify success/error display**

**✅ Pass Criteria:**
- Loading states work
- Custom status message display works (drag-hint element)
- No errors in console

---

## 4. Browser Console Testing

### Quick Manual Tests

Run these in browser console on any page that loads the centralized utils:

```javascript
// Test imports
import { escapeHtml, formatCurrency, formatDate, formatTimestamp, isValidEmail, toTitleCase } from '/js/utils/index.js';

// Test escapeHtml
console.log('escapeHtml test:');
console.log(escapeHtml('<script>alert("xss")</script>'));
// Expected: &lt;script&gt;alert("xss")&lt;/script&gt;

// Test formatCurrency
console.log('formatCurrency test:');
console.log(formatCurrency(1234.56));
// Expected: $1,234.56

// Test formatDate
console.log('formatDate test:');
console.log(formatDate(new Date()));
// Expected: 19 Dec 2025 (or current date)

// Test toTitleCase
console.log('toTitleCase test:');
console.log(toTitleCase('john doe'));
// Expected: John Doe

// Test isValidEmail
console.log('isValidEmail test:');
console.log(isValidEmail('test@example.com')); // true
console.log(isValidEmail('invalid')); // false

// Test null handling
console.log('Null handling:');
console.log(escapeHtml(null)); // Expected: ''
console.log(formatDate(null)); // Expected: '-'
```

**Status:** ⏭️ Not tested yet

---

## 5. Edge Cases & Regression Tests

### Critical Edge Cases

Test these specific scenarios that often break:

#### 1. Null/Undefined Handling

- [ ] **`formatDate(null)`** - Should return "-", not crash
- [ ] **`formatCurrency(undefined)`** - Should handle gracefully
- [ ] **`escapeHtml(null)`** - Should return ""
- [ ] **`isValidEmail('')`** - Should return false

#### 2. Special Characters (XSS Prevention)

Test with these strings in ALL text inputs:

- `<script>alert('xss')</script>`
- `<img src=x onerror=alert(1)>`
- `"><script>alert(1)</script>`
- `Hello & Goodbye`
- `"Double quotes" and 'single quotes'`

**Where to test:**
- Student names
- Transaction notes
- Concession names
- Any user-generated content

#### 3. Large Numbers

- [ ] **`formatCurrency(999999999)`** - Should format as `$999,999,999.00`
- [ ] **Very small:** `formatCurrency(0.01)` - Should be `$0.01`

#### 4. Date Edge Cases

- [ ] **Today's date** - Should format correctly
- [ ] **Year boundary:** `new Date('2024-12-31')` and `new Date('2025-01-01')`
- [ ] **Invalid date:** `new Date('invalid')` - Should handle gracefully

#### 5. Concurrent Snackbars

- [ ] **Trigger multiple snackbars rapidly** (e.g., spam a save button)
  - Should handle gracefully
  - Should not crash

#### 6. Loading State Cleanup

- [ ] **Trigger loading, then cause an error** - Spinner should still disappear
- [ ] **Navigate away during loading** - Spinner should clean up

---

## 6. Error Detection

### Check for Console Errors

**During Testing:**
1. Open browser developer tools console
2. Navigate through critical paths
3. Watch for:
   - Import errors (module not found)
   - Function undefined errors
   - Type errors
   - Any red error messages

**Common Issues to Watch For:**
- Module path incorrect (should be absolute: `/js/utils/index.js`)
- Function not exported
- CORS issues (if testing via file://)

**Status:** ⏭️ Not tested yet

### ✅ Student Registration

**Flow:**
1. Navigate to student portal registration
2. Enter invalid email → should show validation error
3. Enter valid email
4. Submit form
5. Check loading spinner appears
6. Verify success/error messages display correctly

**Functions Used:**
- `isValidEmail()` - validation
- `escapeHtml()` - display user input safely
- `showLoading()` - loading states

**Status:** ⏭️ Not tested yet

---

### ✅ Student Portal - View Concessions

**Flow:**
1. Login to student portal
2. Navigate to concessions page
3. Verify concession cards display correctly
4. Check dates are formatted as DD/MM/YYYY
5. Check loading spinner works

**Functions Used:**
- `formatDateDDMMYYYY()` - expiry dates
- `showLoading()` - page load

**Status:** ⏭️ Not tested yet

---

### ✅ Student Portal - View Transaction History

**Flow:**
1. Login to student portal
2. Navigate to transactions page
3. Verify transactions list loads
4. Check dates formatted correctly
5. Check amounts formatted with $ and cents

**Functions Used:**
- `formatDate()` - transaction dates
- `formatCurrency()` - amounts

**Status:** ⏭️ Not tested yet

---

### ✅ Admin - Check-in Student

**Flow:**
1. Login to admin check-in
2. Search for a student
3. Check-in the student
4. Verify loading behavior (spinner + hide main container)
5. Check transaction appears correctly
6. Verify dates and currency formatting

**Functions Used:**
- `showLoading()` - special check-in version
- `formatDate()` - transaction date
- `formatCurrency()` - class cost
- `escapeHtml()` - student names
- `isToday()` - date filtering

**Status:** ⏭️ Not tested yet

---

### ✅ Admin - Student Database

**Flow:**
1. Login to admin student database
2. Search for a student
3. View student details
4. Edit student record
5. Verify dates and data display correctly

**Functions Used:**
- `formatTimestamp()` - created/updated dates
- `escapeHtml()` - student data
- `getStudentFullName()` - display name

**Status:** ⏭️ Not tested yet

---

### ✅ Admin - Gift Concessions

**Flow:**
1. Navigate to gift concessions tool
2. Search for a student
3. Gift a concession
4. Verify student name displays correctly
5. Check dates formatted

**Functions Used:**
- `getStudentFullName()` - student names
- `formatDate()` - concession dates
- `escapeHtml()` - XSS protection

**Status:** ⏭️ Not tested yet

---

### ✅ Admin - View Transactions

**Flow:**
1. Navigate to transactions admin tool
2. View transaction list
3. Verify dates and currencies format correctly
4. Try filtering by date

**Functions Used:**
- `formatDate()` - transaction dates
- `formatCurrency()` - amounts
- `escapeHtml()` - descriptions

**Status:** ⏭️ Not tested yet

---

## 4. Browser Console Testing

### Quick Manual Tests

Run these in browser console on any page that loads the centralized utils:

```javascript
// Test imports
import { escapeHtml, formatCurrency, formatDate } from '/js/utils/index.js';

// Test escapeHtml
console.log('escapeHtml test:');
console.log(escapeHtml('<script>alert("xss")</script>'));
// Expected: &lt;script&gt;alert("xss")&lt;/script&gt;

// Test formatCurrency
console.log('formatCurrency test:');
console.log(formatCurrency(1234.56));
// Expected: $1,234.56

// Test formatDate
console.log('formatDate test:');
console.log(formatDate(new Date()));
// Expected: 19 Dec 2025 (or current date)

// Test null handling
console.log('Null handling:');
console.log(escapeHtml(null)); // Expected: ''
console.log(formatDate(null)); // Expected: '-'
```

**Status:** ⏭️ Not tested yet

---

## 5. Error Detection

### Check for Console Errors

**During Testing:**
1. Open browser developer tools console
2. Navigate through critical paths
3. Watch for:
   - Import errors (module not found)
   - Function undefined errors
   - Type errors
   - Any red error messages

**Common Issues to Watch For:**
- Module path incorrect (should be absolute: `/js/utils/index.js`)
- Function not exported
- Missing polyfills for older browsers
- CORS issues (if testing via file://)

**Status:** ⏭️ Not tested yet

---

## Testing Priority

**High Priority (Test First):**
1. ✅ Import verification - ensure modules load
2. ✅ Student registration flow - critical user journey
3. ✅ Check-in flow - critical admin journey
4. ✅ Transaction display - currency/date formatting
5. ✅ XSS protection - security critical

**Medium Priority:**
1. ✅ Gift concessions
2. ✅ Student database
3. ✅ Date utilities
4. ✅ Loading spinners

**Low Priority:**
1. ✅ Edge cases with unusual data
2. ✅ Browser compatibility (if needed)

---

---

## 📊 Test Results Template

Use this template to track your testing:

```markdown
## Test Results - [Date/Time]

**Tester:** [Your Name]  
**Branch:** refactor-centralised-utilities  
**Commit:** [Git commit hash]

### Student Portal (if doing full test)
- [ ] Registration - PASS/FAIL - Notes:
- [ ] Dashboard - PASS/FAIL - Notes:
- [ ] Profile - PASS/FAIL - Notes:
- [ ] Concessions - PASS/FAIL - Notes:
- [ ] Transactions - PASS/FAIL - Notes:

### Admin Portal (if doing full test)
- [ ] Check-In - PASS/FAIL - Notes:
- [ ] Student Database - PASS/FAIL - Notes:
- [ ] Transactions - PASS/FAIL - Notes:
- [ ] Gift Concessions - PASS/FAIL - Notes:
- [ ] Closedown Nights - PASS/FAIL - Notes:
- [ ] Concession Types - PASS/FAIL - Notes:
- [ ] Playlist Manager - PASS/FAIL - Notes:
- [ ] Logout Functionality - PASS/FAIL - Notes:

### Edge Cases
- [ ] Null/undefined handling - PASS/FAIL - Notes:
- [ ] XSS prevention - PASS/FAIL - Notes:
- [ ] Large numbers - PASS/FAIL - Notes:
- [ ] Date edge cases - PASS/FAIL - Notes:

### Bugs Found
1. [Description] - [Severity: Critical/High/Medium/Low]
2. [Description] - [Severity]

### Overall Result
- [ ] ✅ PASS - Ready to proceed to Phase 6 cleanup
- [ ] ❌ FAIL - Needs fixes
- [ ] ⚠️ PARTIAL - Minor issues, acceptable to proceed with notes
```

---

## Testing Priority

**High Priority (Test First):**
1. ✅ Minimum viable test (30 minutes) - DO THIS FIRST
2. ✅ Student registration flow - Critical user journey
3. ✅ Check-in flow - Critical admin journey
4. ✅ Transaction display - Currency/date formatting
5. ✅ XSS protection - Security critical

**Medium Priority:**
1. ✅ Gift concessions
2. ✅ Student database
3. ✅ Date utilities
4. ✅ Loading spinners

**Low Priority:**
1. ✅ Edge cases with unusual data
2. ✅ Concurrent operations

---

## Next Steps After Testing

### If Tests Pass ✅

1. **Mark testing complete in todo list**
2. **Proceed to Phase 6: Cleanup**
   - Delete 5 primary utils.js files
   - Update HTML files to import directly from `/js/utils/`
   - Search for any remaining references
   - Run final smoke test
3. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: Create centralized utilities library (Item #11)

   - Created /js/utils/ with 6 utility modules
   - Migrated 13 files to use centralized utilities
   - Eliminated ~150 lines of duplicated code
   - Added comprehensive JSDoc documentation
   - Maintained backward compatibility via re-exports
   - Tested: All critical paths passing"
   ```

### If Tests Fail ❌

1. **Document the issue** in test results
2. **Create bug report** with:
   - What you were testing
   - Expected result
   - Actual result
   - Console errors (screenshot)
   - Steps to reproduce
3. **Request fixes** before proceeding

### If Partial Pass ⚠️

1. **Document minor issues**
2. **Assess if blocking** for Phase 6 cleanup
3. **Create follow-up tasks** for minor issues
4. **Proceed if critical paths working**

---

## 📝 Notes

- **Browser Compatibility:** Test in your primary browser (Chrome/Firefox/Safari)
- **Mobile Testing:** Test responsive mode if time permits
- **Performance:** Watch for any performance degradation
- **Console Warnings:** Note any new warnings even if functionality works

---

## ✅ Sign-Off

Once all tests pass:

- [ ] Minimum viable tests passed
- [ ] Critical user flows tested
- [ ] No console errors
- [ ] No regression bugs found
- [ ] Ready for Phase 6 cleanup

**Tested by:** _______________  
**Date:** _______________  
**Status:** PASS / FAIL / PARTIAL

---

**Document Status:** Ready for testing  
**Last Updated:** December 19, 2025
