# Locked Concessions Display Analysis

## Executive Summary

There are inconsistencies in how concession balances are displayed when a student has active concession blocks that have been locked. The root cause is that locked blocks are not consistently filtered out across different parts of the application.

## Root Causes Identified

### 1. Student Balance Calculation (`updateStudentBalance` function)
**File:** `admin/check-in/js/concession-blocks-balance.js`

**Issue:** The `updateStudentBalance()` function calculates the denormalized `concessionBalance` field on student documents but **does NOT filter out locked blocks**. It includes all blocks with `remainingQuantity > 0` regardless of lock status.

```javascript
// Current code (lines 10-40)
async function updateStudentBalance(studentId) {
    const snapshot = await firebase.firestore()
        .collection('concessionBlocks')
        .where('studentId', '==', studentId)
        .where('remainingQuantity', '>', 0)
        .get();
    
    let totalBalance = 0;
    let expiredBalance = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        // ⚠️ No check for isLocked here
        totalBalance += data.remainingQuantity;
        if (data.status === 'expired') {
            expiredBalance += data.remainingQuantity;
        }
    });
    // ...
}
```

**Impact:** The `student.concessionBalance` field includes locked concessions, affecting any display that uses this denormalized field.

### 2. Concession Stats Calculation (`calculateConcessionStats` function)
**File:** `admin/student-database/js/concessions/concessions-data.js`

**Current Behavior:** The function **partially** handles locked blocks correctly:
- ✅ Excludes locked blocks from counts (activeCount, expiredCount, depletedCount)
- ❌ Still includes locked blocks in the arrays (activeBlocks, expiredBlocks, depletedBlocks)

```javascript
// Lines 60, 68, 76 - correctly excludes from counts
if (!isLocked) {
    depletedCount += remaining;
}
```

**Impact:** The counts are correct (0 for locked blocks), but the blocks still appear in the display arrays.

### 3. Membership Status Check
**Files:** 
- `admin/student-database/js/table.js` (line 280)
- `admin/student-database/js/concessions/concessions-display.js` (line 52)

**Issue:** The code checks for `hasActiveMembership` by simply verifying if `activeMembershipId` and `membershipExpiryDate` fields exist, **without validating if the membership has expired**.

```javascript
const hasActiveMembership = student && student.activeMembershipId && student.membershipExpiryDate;
```

**Impact:** If a student's membership has expired but the fields haven't been cleared yet, the Purchase button gets disabled with the message "Concessions not needed with active membership".

**Note:** The `checkStudentMembership()` function in check-in DOES validate expiry and clears the fields, but this is only called during check-in, not in the student database view.

## Issues Found

### ✅ Issue 0: Check-In (WORKING CORRECTLY)
**File:** `admin/check-in/js/checkin-concession-display.js`

The check-in modal correctly filters out locked blocks in the `getConcessionData()` function (lines 353-355):

```javascript
if (data.isLocked === true) {
    return;  // Skip locked blocks
}
```

This is the **correct behavior** that should be replicated elsewhere.

---

### ❌ Issue 1: Student Database - Purchase Button Disabled

**File:** `admin/student-database/js/concessions/concessions-display.js`

**Current Behavior:**
- When a student has only locked concessions, `stats.totalCount` is 0 (correct)
- Purchase button is displayed (correct)
- BUT the button is disabled if the code detects `hasActiveMembership = true`

**Root Cause:**
The `hasActiveMembership` check doesn't validate if the membership has expired. For the affected students:
1. They had active memberships that have now expired
2. The `activeMembershipId` and `membershipExpiryDate` fields still exist on the student document
3. The code treats this as an active membership and disables the button

**Fix Required:**
- Validate expiry date when checking `hasActiveMembership`, OR
- Ensure expired membership fields are cleared from student documents (possibly via a background job)

---

### ❌ Issue 2: Student Details Modal - Shows Locked Balance

**File:** `admin/student-database/js/concessions/concessions-detail-modal.js`

**Current Behavior:**
The modal displays locked concession blocks in the accordion sections (active/expired/depleted) with their remaining quantities visible.

**Expected Behavior:**
The section headers show the correct count (0), but individual locked blocks still appear in the list.

**Considerations:**
- The locked blocks ARE shown with a "LOCKED" badge, so users can see them
- The counts in the section headers are correct (they exclude locked blocks)
- This might actually be **intentional** so admins can see what's locked
- The inconsistency is that the header says "0" but then shows blocks with remaining quantities

**Question for User:** Should locked blocks be hidden entirely, or is it acceptable to show them with the LOCKED badge as long as the count is 0?

---

### ❌ Issue 3: Gift Concessions - Student Search Shows Locked Balance

**File:** `admin/admin-tools/gift-concessions/student-search.js` (line 85)

**Current Behavior:**
```javascript
const balance = student.concessionBalance || 0;
return `
    <div class="search-result-item" onclick="selectStudent('${student.id}')">
        <h4>${escapeHtml(fullName)} <span class="balance-badge">${balance} classes</span></h4>
        ...
    </div>
`;
```

The search results display `student.concessionBalance`, which includes locked concessions.

**Fix Required:**
- Fetch and calculate real-time stats using `calculateConcessionStats()` (which excludes locked blocks from counts)
- OR ensure `student.concessionBalance` is updated to exclude locked blocks

---

## Other Potential Issues to Check

### 1. Student Portal Concessions Display
**File:** `student-portal/concessions/concessions.js`

Uses `calculateConcessionStats()` which correctly excludes locked blocks from counts. Should verify this displays correctly.

### 2. Reports - Active/Expired Concessions
**File:** `admin/admin-tools/reports/reports.js`

Reports query concessionBlocks directly. Should verify they filter out locked blocks appropriately or indicate lock status.

### 3. Any Display Using `student.concessionBalance`
Any other code that displays the denormalized `student.concessionBalance` field will show incorrect values until the root cause (Issue #1) is fixed.

## Recommended Changes

### Priority 1: Fix `updateStudentBalance` Function
**File:** `admin/check-in/js/concession-blocks-balance.js`

Add filtering for locked blocks:

```javascript
async function updateStudentBalance(studentId) {
    const snapshot = await firebase.firestore()
        .collection('concessionBlocks')
        .where('studentId', '==', studentId)
        .where('remainingQuantity', '>', 0)
        .get();
    
    let totalBalance = 0;
    let expiredBalance = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        
        // ✅ Skip locked blocks
        if (data.isLocked === true) {
            return;
        }
        
        totalBalance += data.remainingQuantity;
        if (data.status === 'expired') {
            expiredBalance += data.remainingQuantity;
        }
    });
    
    await firebase.firestore()
        .collection('students')
        .doc(studentId)
        .update({
            concessionBalance: totalBalance,
            expiredConcessions: expiredBalance
        });
}
```

**Impact:** Fixes the denormalized balance field, which will fix Issue #3 (Gift Concessions) automatically.

### Priority 2: Fix Membership Validation in Student Database
**File:** `admin/student-database/js/concessions/concessions-display.js` or `admin/student-database/js/table.js`

Add expiry date validation:

```javascript
// Current code (line 52 in concessions-display.js, line 280 in table.js)
const hasActiveMembership = student && student.activeMembershipId && student.membershipExpiryDate;

// Should be:
const hasActiveMembership = student && 
    student.activeMembershipId && 
    student.membershipExpiryDate &&
    student.membershipExpiryDate.toDate() >= new Date();
```

**Impact:** Fixes Issue #1 (disabled Purchase button).

**Alternative:** Create a utility function `hasValidMembership(student)` that can be reused across the codebase.

### Priority 3: Clarify Student Details Modal Behavior
**File:** `admin/student-database/js/concessions/concessions-detail-modal.js`

**Option A:** Hide locked blocks entirely from the lists
- Filter locked blocks out of the arrays before building sections
- Locked blocks would only be visible in Transaction History tab

**Option B:** Keep current behavior but improve clarity
- Keep showing locked blocks in the list
- Make the "LOCKED" badge more prominent
- Add explanatory text: "Locked concessions are not available for use"

### Priority 4: Consistency Check for Other Displays
Audit all other places that display concession balances:
- Check-in search results (`admin/check-in/js/search.js` line 65)
- Student portal dashboard
- Email notifications
- Reports

## Testing Plan

After implementing fixes:

1. **Test with affected students** (the two with 8 locked concessions):
   - ✅ Check-in: Should show 0 concessions (already working)
   - ✅ Student Database: Purchase button should be enabled
   - ✅ Student Details modal: Should show 0 in count
   - ✅ Gift Concessions search: Should show 0 classes badge

2. **Test with student with mixed concessions** (some locked, some active):
   - Should show only unlocked balance counts
   - Locked blocks visible in detail view with badge

3. **Test with student with only active unlocked concessions**:
   - Should show normal balance (no regression)

4. **Test balance updates**:
   - Lock a concession block → balance should decrease
   - Unlock a concession block → balance should increase
   - Use a concession at check-in → balance should decrease
   - Gift concessions → balance should increase

## Additional Recommendations

### Create Utility Function for Concession Balance
Create a centralized function that always filters locked blocks:

```javascript
/**
 * Get usable concession balance for a student (excludes locked blocks)
 * @param {string} studentId - Student document ID
 * @returns {Promise<Object>} Balance info
 */
async function getUsableConcessionBalance(studentId) {
    const blocks = await getStudentConcessionBlocks(studentId);
    const stats = calculateConcessionStats(blocks);
    return {
        total: stats.activeCount + stats.expiredCount,
        active: stats.activeCount,
        expired: stats.expiredCount
    };
}
```

### Background Job to Clear Expired Memberships
Consider implementing a scheduled function to periodically clear expired membership fields from student documents. This would prevent the stale `hasActiveMembership` issue.

### Documentation
Update `CONCESSION_TRACKING.md` to document:
- Locked blocks should be excluded from balance calculations
- The `isLocked` field and its behavior
- Where balance filtering should occur
