# Membership Expiry Date Update Feature

## Overview
Implemented functionality to allow admins to update membership expiry dates directly from the Improvers Membership Status report. This is useful when classes need to be cancelled and memberships need to be extended to compensate students.

## Implementation Details

### 1. Cloud Function: `updateMembershipExpiry`
**File:** `functions/update-membership-expiry.js`

**Purpose:** Handles the backend logic for updating membership expiry dates

**Features:**
- Admin-only access (verified via `verifyAdmin`)
- Updates both locations where expiry is stored:
  - `memberships.currentPeriodEnd` (source of truth)
  - `students.membershipExpiryDate` (denormalized field)
- Validation:
  - Membership must exist
  - Student must exist
  - Can only update active memberships
  - Cannot set expiry date in the past
- Sets expiry time to end of day (23:59:59.999)
- Audit trail: Stores update history in `expiryUpdateHistory` array with:
  - `updatedAt`: Timestamp
  - `updatedBy`: Admin user ID
  - `previousExpiryDate`: Old expiry date
  - `newExpiryDate`: New expiry date
  - `updateReason`: Optional reason for the change

**Parameters:**
```javascript
{
  membershipId: string,      // Required
  newExpiryDate: string,     // Required (ISO 8601 format)
  reason: string            // Optional (for audit trail)
}
```

**Returns:**
```javascript
{
  success: true,
  membershipId: string,
  studentId: string,
  newExpiryDate: string,
  message: string
}
```

### 2. Frontend UI: Update Expiry Modal
**Files:**
- `admin/admin-tools/reports/index.html` - Modal HTML
- `admin/admin-tools/reports/reports.js` - Modal logic
- `admin/admin-tools/reports/reports.css` - Modal styles

**Features:**
- **Clickable Expiry Dates:** In the Improvers Membership Status report, expiry dates for active memberships are now clickable (with a pencil icon indicator)
- **Modal Fields:**
  - Student name and email (read-only)
  - Current expiry date (read-only)
  - New expiry date (date picker)
  - Quick extend buttons: +1 Week, +2 Weeks, +1 Month
  - Optional reason text area
- **Date Picker:**
  - Uses existing DatePicker component
  - Disables past dates
  - Allows selecting any future date
- **Validation:**
  - Update button disabled until a new date is selected
  - Shows confirmation modal on success
  - Shows error modal on failure
  - Automatically refreshes the report after successful update

### 3. UI Integration
**Modified Files:**
- `admin/admin-tools/reports/reports.js`:
  - Added `activeMembershipId` to improver data structure
  - Made expiry dates clickable in both table and mobile card views
  - Added modal functions: `openUpdateExpiryModal()`, `closeUpdateExpiryModal()`, `quickExtendExpiry()`, `confirmUpdateExpiry()`
  - Added DatePicker initialization

- `admin/admin-tools/reports/reports.css`:
  - Added `.expiry-date-link` styles for clickable dates
  - Added `.quick-extend-buttons` styles
  - Added `.student-info-card` styles for modal
  - Mobile responsive styles for quick extend buttons

- `admin/admin-tools/reports/index.html`:
  - Added modal HTML structure
  - Added DatePicker CSS import
  - Added DatePicker JavaScript import

- `functions/index.js`:
  - Exported `updateMembershipExpiry` function

## User Workflow

### Scenario: Class Cancelled - Need to Extend All Memberships

1. **Navigate to Reports:**
   - Go to Admin Tools → Reports
   - Click "Generate Report" on Improvers Membership Status section

2. **Update Individual Memberships:**
   - Click on any expiry date in the Expiry Date column
   - Modal opens showing student details and current expiry
   - Choose one of:
     - Click a quick extend button (+1 Week, +2 Weeks, +1 Month)
     - OR manually select a new date using the date picker
   - Optionally add a reason (e.g., "Class cancelled due to weather")
   - Click "Update Expiry"
   - Confirmation modal shows success
   - Report automatically refreshes to show updated date

3. **Repeat for Other Students:**
   - Process continues for each student who needs extension

### Visual Indicators
- **Active memberships:** Expiry date shows with pencil icon on hover
- **Inactive/expired memberships:** Expiry date not clickable
- **Mobile:** Same functionality available in mobile card view

## Data Consistency
The system maintains data consistency by:
1. Updating the source of truth: `memberships.currentPeriodEnd`
2. Updating the denormalized field: `students.membershipExpiryDate`
3. Both updates happen in the same transaction via Cloud Function
4. Audit history preserved in `expiryUpdateHistory` array

## Security
- Function requires admin authentication
- Uses `verifyAdmin()` to check user role
- Only allows updating active memberships
- Prevents setting dates in the past
- Logs all updates to console

## Future Enhancements (Not Implemented)
Potential additions for future consideration:
1. **Bulk Update:** Add "Select All" checkbox and "Bulk Extend" button to update multiple students at once
2. **Undo Functionality:** Allow reverting an expiry update using the audit history
3. **Email Notifications:** Notify students when their membership is extended
4. **Report Filter:** Filter report to show only students with memberships expiring in next X days

## Testing Checklist
- [ ] Cloud Function deploys without errors
- [ ] Admin can open modal by clicking expiry date
- [ ] Date picker works correctly
- [ ] Quick extend buttons calculate correct dates
- [ ] Validation prevents past dates
- [ ] Update successfully updates both Firestore locations
- [ ] Report refreshes after update
- [ ] Modal closes properly
- [ ] Mobile view works correctly
- [ ] Non-admin users cannot call the function
- [ ] Audit trail is recorded properly
