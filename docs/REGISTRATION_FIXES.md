# Student Registration Fixes

**Date:** October 31, 2025  
**Issues Fixed:**
1. Duplicate registrations (same student appearing twice)
2. Welcome email failures due to missing Firestore indexes

---

## Issue 1: Duplicate Registrations

### Problem
Students could register multiple times because the duplicate check only ran for admin users. This resulted in the same person appearing twice in the database.

### Solution
Added duplicate checking for **all users** (both public and admin) using a combination of **name AND email address**. This prevents the same person from registering twice while still allowing couples who share an email address to each register separately.

Now when someone tries to register with the same name and email combination that already exists, they'll see an error message:

> "A student with the name 'John Smith' and email 'john@example.com' is already registered. If you've already registered, you don't need to register again. Please contact us at dance@urbanswing.co.nz if you need assistance."

### Changes Made
- **File:** `js/register.js`
- **Function:** `handleFormSubmit()`
  - Added `checkForDuplicateStudent()` function that checks firstName + lastName + email combination
  - Blocks registration only if the exact same person (name + email) already exists
  - Allows multiple people with the same email (e.g., married couples)
  - Admin users still see the duplicate name warning modal for different emails (separate check)

---

## Issue 2: Welcome Email Failures

### Problem
The Cloud Function `sendNewStudentEmail` was failing with error:
```
7 PERMISSION_DENIED: Missing or insufficient permissions.
```

This error occurs when Firestore composite indexes are not deployed. The function queries:
- `casualRates` collection with `.where('isActive', '==', true).orderBy('displayOrder')`
- `concessionPackages` collection with `.where('isActive', '==', true).orderBy('numberOfClasses')`

These queries require composite indexes to run efficiently.

### Solution

#### Step 1: Deploy Firestore Indexes

The indexes are already defined in `config/firestore.indexes.json`. You need to deploy them to Firebase:

```bash
firebase deploy --only firestore:indexes
```

**Expected Output:**
```
✔ Deploy complete!

Indexes:
  casualRates (isActive, displayOrder)
  concessionPackages (isActive, numberOfClasses)
  concessionBlocks (studentId, remainingQuantity)
```

**Index Build Time:** 1-5 minutes (depending on data volume)

#### Step 2: Verify Indexes in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `directed-curve-447204-j4`
3. Navigate to: **Firestore Database** → **Indexes** tab
4. You should see these indexes with status "Enabled":
   - `casualRates` - isActive (ASC), displayOrder (ASC)
   - `concessionPackages` - isActive (ASC), numberOfClasses (ASC)
   - `concessionBlocks` - studentId (ASC), remainingQuantity (ASC)

#### Step 3: Verify Pricing Configuration

The welcome email requires these pricing items to be active in Firestore:

**Casual Rates (in `casualRates` collection):**
- "Casual Entry" - standard rate (e.g., $20)
- "Student Casual Entry" - student discount rate (e.g., $15)

**Concession Packages (in `concessionPackages` collection):**
- 5-class package
- 10-class package

**To check/fix:**
1. Go to: **Admin Panel** → **Admin Tools** → **Concession Types Manager**
2. Ensure all rates/packages have `isActive: true`
3. Click "Save" if you make any changes

### Additional Improvements Made

**Better Error Handling:**
- Added detailed logging to Cloud Function to track which rates/packages are found
- Improved error messages to guide admins to the specific missing configuration
- Admin notification email now sends even if welcome email fails
- Error notification email sent to admin with specific troubleshooting steps

**Enhanced Error Messages:**
- Clear indication of which pricing items are missing
- Direct links to fix the configuration
- Link to Firebase Functions logs for debugging

---

## Testing the Fixes

### Test 1: Duplicate Email Prevention

1. Register a new student (or use existing student's email)
2. Try to register again with the same email
3. **Expected:** Error message appears, registration blocked

### Test 2: Welcome Email Sending

**Prerequisites:**
- Firestore indexes deployed (see Step 1 above)
- Pricing configuration active (see Step 3 above)

**Steps:**
1. Register a new student with a unique email
2. Check email inbox for "Welcome to Urban Swing! 🎉"
3. Check admin inbox (dance@urbanswing.co.nz) for "New Student Registration"

**If welcome email still fails:**
- Check Firebase Functions logs: [View Logs](https://console.firebase.google.com/project/directed-curve-447204-j4/functions/logs)
- Look for error messages indicating missing rates/packages
- Verify indexes are "Enabled" in Firebase Console

---

## Deployment Checklist

- [x] Updated `js/register.js` with duplicate email checking
- [x] Updated `functions/index.js` with better error handling and logging
- [x] Indexes defined in `config/firestore.indexes.json`
- [ ] **ACTION REQUIRED:** Deploy indexes to Firebase
- [ ] **ACTION REQUIRED:** Verify pricing configuration in Admin Tools
- [ ] **ACTION REQUIRED:** Test duplicate prevention
- [ ] **ACTION REQUIRED:** Test welcome email sending

---

## Rollback Plan

If these changes cause issues:

1. **Revert duplicate checking:**
   - Edit `js/register.js`
   - Comment out the `checkForDuplicateEmail()` call in `handleFormSubmit()`

2. **Revert Cloud Function changes:**
   - Use `git` to restore previous version of `functions/index.js`
   - Redeploy: `firebase deploy --only functions`

---

## Future Improvements

1. **Admin Dashboard for Duplicate Management**
   - Add ability to merge duplicate student records
   - View all duplicates at a glance

2. **Email Queue System**
   - Retry failed welcome emails automatically
   - Track email delivery status

3. **Phone Number Validation**
   - Add duplicate checking for phone numbers
   - Format validation (NZ phone numbers)

4. **Better Welcome Email Customization**
   - Allow admins to customize welcome email template
   - Add personalized content based on student preferences

---

## Support

If you encounter issues with these fixes:

1. Check Firebase Functions logs for detailed error messages
2. Verify all indexes show "Enabled" status
3. Ensure pricing configuration is complete and active
4. Contact: [Your contact information]
