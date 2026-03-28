# Workshop Management System - Implementation Plan

## Overview

This document outlines the complete implementation plan for the Workshop Registration & Management System, including detailed technical specifications, component structure, and step-by-step implementation guide.

---

## Architecture

### File Structure

```
admin/workshops/
├── IMPLEMENTATION.md          # This file
├── index.html                 # Main workshop management page
├── workshop-manager.js        # Core business logic, Firestore operations
├── workshop-modals.js         # Modal handlers (create, edit, invite, videos)
├── workshop-display.js        # Render workshop list, registrations view
├── workshop-checkin-modal.js  # Workshop-specific check-in modal
└── workshops.css              # Workshop-specific styles
```

### Dependencies

**Reusable Components** (already exist):
- `BaseModal` from `/components/modals/modal-base.js`
- `ConfirmationModal` from `/components/modals/confirmation-modal.js`
- `LoadingSpinner` from `/components/loading-spinner/loading-spinner.js`
- `showSnackbar()` from `/components/snackbar/snackbar.js`

**Styles** (import from existing):
- `/styles/base/colors.css` - Color variables (DO NOT define new colors)
- `/styles/base/buttons.css` - Button styles
- `/styles/base/typography.css` - Font styles

**Firebase**:
- Firestore SDK (already loaded)
- Firebase Auth (already loaded)

---

## Firestore Data Model

### Workshop Document Structure

**Collection**: `workshops`  
**Document ID**: `workshop-{slug}-{shortId}` (e.g., `workshop-styling-fundamentals-abc123`)

```javascript
{
  // Basic Info
  name: string,                    // "Styling Fundamentals Workshop"
  date: Timestamp,                 // Workshop date/time
  description: string,             // Full workshop description
  topic: string,                   // Short topic summary
  cost: number,                    // Cost in dollars (e.g., 25)
  
  // Visibility & Status
  status: string,                  // "draft" | "published" | "completed"
  openToAll: boolean,              // true = visible to all students
  
  // Participants
  invitedStudents: string[],       // Array of studentIds (empty if openToAll=true)
  registeredStudents: [            // Array of registration objects
    {
      studentId: string,           // "john-doe-abc123"
      registeredAt: Timestamp,     // Registration timestamp
      paidOnline: boolean          // true if paid via Stripe, false if "Pay Later"
    }
  ],
  checkedInStudents: string[],     // Array of studentIds who actually attended (populated at checkin time)
  
  // Content
  videos: [                        // Array of video objects
    {
      title: string,               // "Drill 1: Connection"
      url: string,                 // YouTube URL
      addedAt: Timestamp           // When video was added
    }
  ],
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string                // Admin user ID
}
```

### Transaction Document (workshop-entry type)

**Collection**: `transactions`  
**Document ID**: Auto-generated

```javascript
{
  type: "workshop-entry",
  workshopId: string,              // Reference to workshop document
  workshopName: string,            // Workshop name (denormalized)
  studentId: string,
  studentName: string,
  amount: number,                  // Workshop cost
  paymentMethod: string,           // "online" | "cash" | "bank-transfer" | "eftpos"
  classDate: Timestamp,            // Workshop date (for consistency with other transactions)
  date: Timestamp,                 // Transaction creation date
  createdAt: Timestamp,
  createdBy: string,               // Admin UID (or studentId for online payments)
  reversed: boolean,               // For refunds
  refunded: null | "partial" | "full"
}
```

### Check-In Document (workshop-entry type)

**Collection**: `checkins`  
**Document ID**: `checkin-{workshopDate}-{firstName}-{lastName}`

```javascript
{
  studentId: string,
  studentName: string,
  checkinDate: Timestamp,          // Workshop date
  entryType: "workshop-entry",
  workshopId: string,              // Reference to workshop document
  workshopName: string,            // Workshop name (denormalized)
  
  // Payment info
  paymentMethod: string,           // "online" | "cash" | "bank-transfer" | "eftpos"
  amountPaid: number,              // Workshop cost (or 0 if paid online previously)
  onlineTransactionId: string,     // If paidOnline=true, link to transaction
  
  // Metadata
  notes: string | null,
  reversed: boolean,
  createdAt: Timestamp,
  createdBy: string                // Admin UID
}
```

---

## Firestore Security Rules

Add to `/config/firestore.rules`:

```javascript
// Workshop collection rules
match /workshops/{workshopId} {
  // Anyone authenticated can read their applicable workshops
  allow read: if request.auth != null && (
    // Open to all workshops
    resource.data.openToAll == true ||
    // Invited students
    resource.data.invitedStudents.hasAny([getStudentId()]) ||
    // Registered students
    resource.data.registeredStudents.hasAny([getStudentId()]) ||
    // Admins and front desk
    isAdminOrFrontDesk()
  );
  
  // Only admins can create/update/delete
  allow write: if isAdminOrFrontDesk();
}

// Helper function (add if not already present)
function getStudentId() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.studentId;
}
```

**Note on Video Access Control**: Firestore rules operate at the document level and cannot selectively hide the `videos` array field. Since the rules above allow invited students to read the workshop document, they technically have access to video URLs even before checking in. However, the **student portal UI** (Phase 6, not yet implemented) will be responsible for filtering videos and only displaying them if the student's `studentId` is in the `checkedInStudents` array. This is "security by UI" rather than "security by rules" - acceptable since video URLs are just YouTube links and the primary goal is UX (don't show videos to students who didn't attend) rather than hardcore security.

**Alternative Approach**: If stricter security is needed, videos could be stored in a sub-collection (`workshops/{workshopId}/videos/{videoId}`) with separate rules that check the `checkedInStudents` array. This would be implemented if videos contained sensitive content beyond YouTube URLs.

---

## Phase 1: Firestore Data Model & Security Rules ✅ COMPLETED

**Status**: Phase 1 implementation is complete. Security rules have been added to `/config/firestore.rules`.

### What Was Implemented

**File**: `/config/firestore.rules`

Added workshop collection security rules (lines 133-145):

```javascript
// Workshops
match /workshops/{workshopId} {
  // Admins and front-desk can read and write everything
  allow read, write: if isAdminOrFrontDesk();
  
  // Students can read workshops that are:
  // 1. Open to all (openToAll = true)
  // 2. They're invited to (their studentId is in invitedStudents array)
  // Note: Registered students remain in invitedStudents, so no separate check needed
  allow read: if isStudent() && (
    resource.data.openToAll == true ||
    getStudentId() in resource.data.invitedStudents
  );
}
```

**Security Model Note**: Students who register for a workshop remain in the `invitedStudents` array, so the rules don't need to separately check `registeredStudents`. This keeps the security rules simple and avoids Firestore rules limitations with nested object arrays.

**Note**: The `getStudentId()`, `isStudent()`, and `isAdminOrFrontDesk()` helper functions already exist in the rules file.

**Note about `determineTransactionType()`**: This function in `/functions/utils/transaction-utils.js` is only used for package purchases (concessions/casual rates). Workshop transactions are created directly by the `processWorkshopPayment` Cloud Function in Phase 2, so no changes to `determineTransactionType()` are needed.

### Deployment Instructions

Deploy the updated security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

**Expected output**:
```
✔  Deploy complete!
```

### Testing Instructions

You can test the security rules in multiple ways:

#### Option 1: Firebase Console Rules Playground

1. Go to Firebase Console → Firestore Database → Rules tab
2. Click "Rules Playground" button
3. Test these scenarios:

**Admin Access**:
- **Operation**: `get` on `/databases/(default)/documents/workshops/workshop-test-123`
- **Authentication**: Signed in as admin user
- **Expected**: ✅ Allow

**Student - Open Workshop**:
- **Operation**: `get` on `/databases/(default)/documents/workshops/workshop-test-123`
- **Simulated data**: `{ openToAll: true }`
- **Authentication**: Signed in as student user
- **Expected**: ✅ Allow

**Student - Invited Workshop**:
- **Operation**: `get` on `/databases/(default)/documents/workshops/workshop-test-123`
- **Simulated data**: `{ openToAll: false, invitedStudents: ["student-abc-123"] }`
- **Authentication**: Signed in as student with `studentId: "student-abc-123"`
- **Expected**: ✅ Allow

**Student - Not Invited**:
- **Operation**: `get` on `/databases/(default)/documents/workshops/workshop-test-123`
- **Simulated data**: `{ openToAll: false, invitedStudents: ["student-other-456"] }`
- **Authentication**: Signed in as student with `studentId: "student-abc-123"`
- **Expected**: ❌ Deny

**Student Write Attempt**:
- **Operation**: `create` on `/databases/(default)/documents/workshops/workshop-test-456`
- **Authentication**: Signed in as student user
- **Expected**: ❌ Deny

#### Option 2: Manual Test with Real Documents

After deploying rules, create a test workshop document manually:

1. Go to Firestore Console
2. Create a new document in `workshops` collection:
   ```
   Document ID: workshop-test-2026
   Fields:
     name: "Test Workshop"
     openToAll: true
     status: "draft"
     invitedStudents: []
     registeredStudents: []
   ```

3. Try accessing it from the student portal while logged in as a student
4. Verify you can read it (should work since `openToAll: true`)
5. Try accessing a workshop with `openToAll: false` and empty `invitedStudents`
6. Verify access is denied

#### Option 3: Automated Testing (Advanced)

If you have Firebase Emulator setup, you can write automated tests:

```javascript
// test/security-rules.test.js
const { assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

// Test that students can read open workshops
await assertSucceeds(
  db.collection('workshops').doc('test').get()
);

// Test that students cannot write workshops
await assertFails(
  db.collection('workshops').doc('test').set({ name: 'Hack' })
);
```

---

## Phase 2: Cloud Functions & Backend ✅ COMPLETED

### What Was Implemented

**File**: `/functions/process-workshop-payment.js` (234 lines)

Created HTTP Cloud Function (onRequest v2) for processing workshop registration payments:

**Key Features**:
- CORS-enabled public endpoint for student portal
- Validates studentId, workshopId, and paymentMethodId
- Retrieves and validates student and workshop documents
- Checks workshop status (must be 'published')
- Prevents duplicate registrations
- Validates invitation requirements (openToAll or in invitedStudents[])
- Gets existing Stripe customer or creates new one
- Processes Stripe payment via existing `processPayment()` helper
- Creates transaction record with type 'workshop-entry'
- Updates workshop by adding to both registeredStudents[] AND invitedStudents[]
- Returns success with transactionId, paymentIntentId, receiptUrl

**File**: `/functions/index.js`

Added export for the new function:
```javascript
const { processWorkshopPayment } = require('./process-workshop-payment');
exports.processWorkshopPayment = processWorkshopPayment;
```

### Deployment Instructions

The function has been deployed to Firebase:

```bash
firebase deploy --only functions:processWorkshopPayment
```

**Function URL**: `https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processWorkshopPayment`

**⚠️ Important**: The IAM policy for public access needs to be set manually. Follow these steps:

#### Option 1: Using Firebase Console
1. Go to Firebase Console → Functions
2. Find `processWorkshopPayment` in the list
3. Click the three-dot menu → Permissions
4. Add principal: `allUsers`
5. Assign role: `Cloud Functions Invoker`

#### Option 2: Using gcloud CLI
```bash
gcloud functions add-invoker-policy-binding processWorkshopPayment \
  --region="us-central1" \
  --member="allUsers"
```

### Testing Instructions

#### Option 1: Postman/HTTP Client Testing

**Endpoint**: `https://us-central1-directed-curve-447204-j4.cloudfunctions.net/processWorkshopPayment`

**Method**: POST

**Headers**:
```
Content-Type: application/json
```

**Test Case 1: Successful Payment**
```json
{
  "studentId": "valid-student-id",
  "workshopId": "valid-workshop-id",
  "paymentMethodId": "pm_card_visa"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "transactionId": "transaction-doc-id",
  "paymentIntentId": "pi_...",
  "receiptUrl": "https://stripe.com/..."
}
```

**Test Case 2: Missing Parameters**
```json
{
  "studentId": "valid-student-id"
}
```

**Expected Response** (400):
```json
{
  "error": "Missing required parameters"
}
```

**Test Case 3: Workshop Not Found**
```json
{
  "studentId": "valid-student-id",
  "workshopId": "invalid-workshop-id",
  "paymentMethodId": "pm_card_visa"
}
```

**Expected Response** (404):
```json
{
  "error": "Workshop not found"
}
```

**Test Case 4: Already Registered**
```json
{
  "studentId": "already-registered-student-id",
  "workshopId": "workshop-they-registered-for",
  "paymentMethodId": "pm_card_visa"
}
```

**Expected Response** (409):
```json
{
  "error": "Student already registered for this workshop"
}
```

**Test Case 5: Not Invited (When openToAll = false)**
```json
{
  "studentId": "not-invited-student-id",
  "workshopId": "private-workshop-id",
  "paymentMethodId": "pm_card_visa"
}
```

**Expected Response** (403):
```json
{
  "error": "Student not invited to this workshop"
}
```

#### Option 2: Firebase Console Testing

1. Go to Firebase Console → Functions
2. Find `processWorkshopPayment` and click "View logs"
3. Trigger the function via the student portal UI (Phase 6)
4. Verify logs show successful execution

#### Option 3: Firestore Verification

After a successful payment:

1. **Check transactions collection**:
   - Document should exist with type: 'workshop-entry'
   - Should have workshopId, studentId, amount, stripePaymentIntentId
   - paymentMethod should be 'online'

2. **Check workshops collection**:
   - Workshop document should have student added to registeredStudents[]
   - Student should also be added to invitedStudents[]
   - registeredStudents entry should have: studentId, studentName, registeredAt, paidOnline: true, transactionId

3. **Check Stripe Dashboard**:
   - Payment Intent should exist
   - Status should be 'succeeded'
   - Metadata should contain studentId, workshopId, type

#### Option 4: UI Testing (Preferred)

Testing via the student portal UI (implemented in Phase 6) will provide the most realistic test coverage, as it will:
- Test the full user flow
- Validate Stripe Elements integration
- Test error message display
- Verify redirect/success states

**Note**: The function follows the same payment pattern as `processCasualPayment`, so much of the payment logic is already battle-tested in production.

---

## Phase 3: Admin Page Structure ✅ COMPLETED

### What Was Implemented

**File**: `/admin/workshops/index.html` (109 lines)

Created the main workshop management page with:

**HTML Structure**:
- Admin header container (injected by admin-header.js)
- Page header with title and "Create Workshop" button
- Filter section with search box and status filter buttons (All, Draft, Published, Completed)
- Workshops table container with three states:
  - Loading state (spinner)
  - Empty state (no workshops message with CTA button)
  - Table view (7 columns: Name, Date, Status, Visibility, Registrations, Videos, Actions)

**Script Dependencies**:
- Firebase SDK (App, Firestore, Auth)
- Firebase Config
- Reusable components (BaseModal, ConfirmationModal, LoadingSpinner, Snackbar)
- Admin Header
- Workshop-specific scripts (manager, modals, display, checkin-modal)

**File**: `/admin/workshops/workshops.css` (479 lines)

Created comprehensive workshop-specific styles:

**Key Style Sections**:
- Page layout and header (responsive container, flex header)
- Filter section (search box with icon, filter button states)
- Workshops table (purple header, hover states, rounded corners)
- Status badges (draft=yellow, published=green, completed=blue)
- Visibility badges (open-to-all=green, invite-only=purple)
- Count badges (registrations, videos)
- Action buttons (view, edit, delete with hover effects)
- Loading and empty states (centered with large icons)
- Workshop details expandable row (with tabs)
- Registration, invited, and video lists
- Modal form overrides (workshop forms, checkbox groups)
- Student search autocomplete (dropdown with hover)
- Responsive design (mobile breakpoints)

**Design Compliance**:
- Uses ONLY existing color variables from `/styles/base/colors.css`
- No new color definitions added (as required)
- Consistent spacing and border radius (8px, 6px)
- Smooth transitions (0.2s ease)

### Testing Instructions

Since the JavaScript files (Phases 4-7) haven't been created yet, the page will show errors. However, you can still test the static HTML/CSS structure:

#### Test 1: Page Load & Structure

1. Navigate to `http://localhost:5000/admin/workshops/` (or your Firebase hosting URL)
2. **Expected Behavior**:
   - ✅ Page loads with admin header
   - ✅ "Workshop Management" title visible with icon
   - ✅ "Create Workshop" button in top-right
   - ✅ Filter section with search box and 4 filter buttons
   - ✅ Loading spinner visible initially
   - ❌ Console errors about missing JS files (expected at this stage)

#### Test 2: CSS Styling Verification

**Check Filter Section**:
1. Inspect the filter section
2. **Expected**:
   - ✅ Light background card
   - ✅ Search box has magnifying glass icon on left
   - ✅ "All" button is purple (active state)
   - ✅ Other buttons are white with border

**Check Color Variables**:
1. Open DevTools → Elements tab
2. Inspect any colored element (status badge, button, etc.)
3. **Expected**:
   - ✅ All colors use `var(--color-name)` format
   - ✅ No hardcoded color values like `#RRGGBB`

#### Test 3: Responsive Design

1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Set viewport to mobile (375px width)
3. **Expected**:
   - ✅ Page header stacks vertically
   - ✅ Filter section stacks vertically
   - ✅ Search box takes full width
   - ✅ Filter buttons remain visible

#### Test 4: Browser Compatibility

Test in multiple browsers:
- Chrome/Edge: Should work perfectly
- Firefox: Check filter button hover states
- Safari (if available): Check border-radius rendering

#### Test 5: Icon Loading

1. Check if Font Awesome icons load
2. **Expected**:
   - ✅ Chalkboard icon next to title
   - ✅ Plus icon in "Create Workshop" button
   - ✅ Search icon in search box

### Known Issues (Expected at this stage)

1. **Console Errors**: `workshop-manager.js`, `workshop-modals.js`, `workshop-display.js`, and `workshop-checkin-modal.js` are not found (they'll be created in Phases 4-7)
2. **Loading State**: Page will show spinner indefinitely since JavaScript isn't implemented
3. **Button Clicks**: Buttons won't respond since event listeners aren't attached yet
4. **Empty State**: Won't display since JavaScript logic isn't implemented

### Next Steps

After verifying the HTML/CSS structure:
- Phase 4: Implement `workshop-manager.js` (core business logic)
- Phase 5: Implement `workshop-modals.js` (modal handlers)
- Phase 6: Implement `workshop-display.js` (rendering logic)
- Phase 7: Implement `workshop-checkin-modal.js` (check-in functionality)

---

## Phase 4: Core Business Logic ✅ COMPLETED

### What Was Implemented

**File**: `/admin/workshops/workshop-manager.js` (544 lines)

Created the core business logic module for workshop management:

**Key Features**:
- State management (currentUser, workshops, filteredWorkshops, selectedWorkshop)
- Authentication checking with role validation (admin/front-desk only)
- Complete CRUD operations for workshops (create, read, update, delete)
- Invited students management (add/remove from invitedStudents array)
- Video management (add/remove workshop videos)
- Student search functionality for invite/check-in modals
- Search and filter event handlers (by workshop name, topic, description, status)
- Helper functions for date formatting and data retrieval

**Functions Implemented**:
- `initWorkshopManager()` - Initializes page, checks auth, loads workshops
- `checkAuth()` - Firebase auth state listener with role fetching
- `isAdminOrFrontDesk()` - Authorization check helper
- `loadWorkshops()` - Fetches all workshops ordered by date
- `createWorkshop(workshopData)` - Creates new workshop with validation
- `updateWorkshop(workshopId, updates)` - Updates existing workshop
- `deleteWorkshop(workshopId)` - Deletes workshop from Firestore
- `updateWorkshopStatus(workshopId, newStatus)` - Shortcut for status updates
- `addInvitedStudent(workshopId, studentId)` - Adds student to invitedStudents[]
- `removeInvitedStudent(workshopId, studentId)` - Removes from invitedStudents[]
- `addVideo(workshopId, videoData)` - Adds video object to videos[]
- `removeVideo(workshopId, videoUrl)` - Removes video from videos[]
- `searchStudents(query)` - Searches students collection with client-side filtering
- `setupEventListeners()` - Attaches event listeners to UI elements
- `handleSearch(e)` - Filters workshops by search query
- `handleFilter(e)` - Filters workshops by status
- `getWorkshopById(workshopId)` - Retrieves workshop from state
- `formatDate(timestamp)` - Formats Firestore Timestamp to NZ locale
- `formatCost(cost)` - Formats number to currency string

**Design Patterns**:
- Async/await for all Firestore operations
- LoadingSpinner for all async operations
- showSnackbar for success/error feedback
- firebase.firestore.FieldValue.serverTimestamp() for timestamps
- firebase.firestore.FieldValue.arrayUnion/arrayRemove for array updates
- Proper error handling with try/catch blocks

### Testing Notes

Phase 4 implements the data layer without UI components. Testing will occur naturally in subsequent phases:
- **Phase 5** (modals): Test create/update/delete operations through modal forms
- **Phase 6** (display): Test loadWorkshops, filtering, and search through table rendering
- **Phase 7** (check-in): Test student search and array updates through check-in flow

Console verification available:
- Check script loads without errors
- Verify functions are defined: `typeof createWorkshop`, `typeof loadWorkshops`
- State inspection: `console.log(workshops)` (after page load)

---

## Phase 5: Modal Handlers ✅ COMPLETED

### What Was Implemented

**File**: `/admin/workshops/workshop-modals.js` (670 lines)

Created comprehensive modal handlers for all workshop management interactions:

**Modals Implemented**:

1. **Create Workshop Modal** (`openCreateWorkshopModal()`):
   - Form fields: name, date/time, topic, description, cost, openToAll checkbox
   - Form validation with HTML5 required attributes
   - Calls `createWorkshop()` from workshop-manager.js
   - Auto-closes on success

2. **Edit Workshop Modal** (`openEditWorkshopModal(workshopId)`):
   - Pre-populates all fields with current workshop data
   - Includes status dropdown (draft/published/completed)
   - Date formatting for datetime-local input
   - Calls `updateWorkshop()` from workshop-manager.js
   - Handles Firestore Timestamp to Date conversion

3. **Manage Invites Modal** (`openManageInvitesModal(workshopId)`):
   - Only available for invite-only workshops (disabled if openToAll=true)
   - Student search with debounced autocomplete
   - Displays invited students count
   - Shows registration status badge for registered students
   - Add student: searches and filters out already invited students
   - Remove student: confirmation dialog, disabled for registered students
   - Calls `addInvitedStudent()` and `removeInvitedStudent()`
   - Real-time name loading from students collection

4. **Manage Videos Modal** (`openManageVideosModal(workshopId)`):
   - Add video form: title and YouTube URL inputs
   - URL validation (must contain youtube.com or youtu.be)
   - Video list with title, URL, and added date
   - Remove video with confirmation dialog
   - External link to open video in new tab
   - Calls `addVideo()` and `removeVideo()`
   - Modal content refreshes after add/remove

5. **Delete Confirmation Modal** (`confirmDeleteWorkshop(workshopId)`):
   - Uses ConfirmationModal component
   - Prevents deletion if workshop has registrations
   - Shows workshop name in confirmation message
   - Calls `deleteWorkshop()` on confirmation

**Key Features**:
- All modals use BaseModal/ConfirmationModal components
- Proper form validation before submission
- Modal content auto-refreshes after operations
- Debounced search (300ms) for performance
- Error handling delegated to manager functions
- Consistent styling with existing admin design
- Accessibility: proper labels, placeholders, and disabled states

**Helper Functions**:
- `generateInvitesContent(workshop)` - Renders invite management UI
- `renderInvitedStudent(studentId, workshop)` - Renders individual invited student
- `attachInviteListeners(workshop, modal)` - Sets up invite search/add/remove
- `loadInvitedStudentNames(workshop)` - Async loads student names
- `handleRemoveInvite(workshopId, studentId)` - Handles invite removal
- `generateVideosContent(workshop)` - Renders video management UI
- `renderVideoItem(video, workshop)` - Renders individual video item
- `attachVideoListeners(workshop, modal)` - Sets up video add form
- `handleRemoveVideo(workshopId, videoUrl)` - Handles video removal

### Testing Instructions

Phase 5 provides the UI layer for testing Phase 4 functionality. You can now test the full create/edit/delete workflow.

#### Test 1: Create Workshop

1. Navigate to `/admin/workshops/`
2. Click "Create Workshop" button
3. **Expected**: Modal opens with empty form
4. Fill in all required fields:
   - Name: "Test Workshop"
   - Date/Time: Select a future date
   - Topic: "Test topic"
   - Cost: 25
   - Check "Open Workshop"
5. Click "Create Workshop"
6. **Expected**: 
   - Loading spinner appears
   - Success snackbar: "Workshop created successfully"
   - Modal closes
   - Workshop appears in table with "draft" status
   - Filter updates to show 1 workshop

#### Test 2: Form Validation

1. Click "Create Workshop"
2. Leave all fields empty and click "Create Workshop"
3. **Expected**: Browser validation messages appear
4. Fill in only name and date, leave cost empty
5. Click "Create Workshop"
6. **Expected**: Cost field shows validation error

#### Test 3: Edit Workshop

1. Click "Edit" button on a workshop
2. **Expected**: Modal opens with pre-filled form
3. Change the name to "Updated Workshop"
4. Change status to "Published"
5. Click "Save Changes"
6. **Expected**:
   - Success snackbar appears
   - Modal closes
   - Workshop name updates in table
   - Status badge changes to green "published"

#### Test 4: Manage Invites (Invite-Only Workshop)

1. Create an invite-only workshop (uncheck "Open Workshop")
2. Click "Invites" button on the workshop
3. **Expected**: Modal opens with search box and empty invited list
4. Type a student name in search box
5. **Expected**: Dropdown appears with matching students
6. Click a student
7. **Expected**:
   - Success snackbar: "Student added to invited list"
   - Student appears in invited list
   - Search box clears
8. Click "Remove" on the student
9. **Expected**: Confirmation dialog appears
10. Click "Remove"
11. **Expected**: Student removed from list

#### Test 5: Manage Invites Button Visibility

1. Click "Invites" button on an open workshop (openToAll=true)
2. **Expected**: Snackbar message: "This is an open workshop. All students can see it."
3. Check table: Invite-only workshops show "Invites" button, open workshops don't

#### Test 6: Manage Videos

1. Click "Videos" button on any workshop
2. **Expected**: Modal opens with add video form and empty list
3. Fill in:
   - Title: "Drill 1: Connection"
   - URL: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
4. Click "Add Video"
5. **Expected**:
   - Success snackbar appears
   - Video appears in list with title, URL link, and date
   - Form clears
6. Try invalid URL (e.g., "https://example.com")
7. **Expected**: Warning snackbar: "Please enter a valid YouTube URL"
8. Click "Remove" on a video
9. **Expected**: Confirmation dialog → video removed

#### Test 7: Delete Workshop

1. Click "Delete" on a workshop with NO registrations
2. **Expected**: Confirmation dialog appears with workshop name
3. Click "Delete Workshop"
4. **Expected**:
   - Success snackbar: "Workshop deleted successfully"
   - Workshop disappears from table
5. Click "Delete" on workshop WITH registrations
6. **Expected**: Button is disabled with tooltip "Cannot delete workshop with registrations"

#### Test 8: Search and Filter Integration

1. Create multiple workshops with different statuses
2. Test search box while modal is open → should not interfere
3. Close modal, use search box on main page
4. **Expected**: Filtering still works properly
5. Create workshop → verify it appears in current filter view

#### Test 9: Error Handling

1. Open browser console
2. Disable network (DevTools → Network → Offline)
3. Try to create a workshop
4. **Expected**: Error snackbar appears (from workshop-manager.js)
5. Re-enable network
6. Try again → should work

### Integration Notes

Phase 5 completes the basic CRUD UI. With Phases 4 and 5 implemented:
- ✅ Workshops can be created, edited, deleted via UI
- ✅ Status can be changed (draft → published → completed)
- ✅ Invited students can be managed for invite-only workshops
- ✅ Videos can be added/removed
- ⏳ Workshop display still shows loading spinner (Phase 6 needed)
- ⏳ Check-in functionality not yet available (Phase 7 needed)

**Phase 6 Next**: Implement workshop-display.js to render the table and replace loading spinner with actual workshop list.

### Original Specification

**File**: `admin/workshops/workshop-modals.js`

Contains modal handlers for:
1. Create Workshop Modal
2. Edit Workshop Modal
3. Manage Invites Modal
4. Manage Videos Modal
5. Delete Confirmation Modal

**Example - Create Workshop Modal**:

```javascript
function openCreateWorkshopModal() {
    const modal = new BaseModal({
        id: 'create-workshop-modal',
        title: 'Create New Workshop',
        content: `
            <form id="create-workshop-form" class="workshop-form">
                <div class="form-group">
                    <label for="workshop-name">Workshop Name *</label>
                    <input type="text" id="workshop-name" required>
                </div>
                
                <div class="form-group">
                    <label for="workshop-date">Date & Time *</label>
                    <input type="datetime-local" id="workshop-date" required>
                </div>
                
                <div class="form-group">
                    <label for="workshop-topic">Topic (Short Summary) *</label>
                    <input type="text" id="workshop-topic" required>
                </div>
                
                <div class="form-group">
                    <label for="workshop-description">Full Description</label>
                    <textarea id="workshop-description"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="workshop-cost">Cost ($) *</label>
                    <input type="number" id="workshop-cost" min="0" step="0.01" required>
                </div>
                
                <div class="checkbox-group">
                    <input type="checkbox" id="workshop-open-to-all">
                    <label for="workshop-open-to-all">Open Workshop (visible to all students)</label>
                </div>
            </form>
        `,
        buttons: [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onClick: (modal) => modal.hide()
            },
            {
                text: 'Create Workshop',
                class: 'btn-primary',
                onClick: async (modal) => {
                    const form = document.getElementById('create-workshop-form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                    
                    const workshopData = {
                        name: document.getElementById('workshop-name').value,
                        date: new Date(document.getElementById('workshop-date').value),
                        topic: document.getElementById('workshop-topic').value,
                        description: document.getElementById('workshop-description').value,
                        cost: document.getElementById('workshop-cost').value,
                        openToAll: document.getElementById('workshop-open-to-all').checked
                    };
                    
                    try {
                        await createWorkshop(workshopData);
                        modal.hide();
                    } catch (error) {
                        // Error handling in createWorkshop()
                    }
                }
            }
        ]
    });
    
    modal.show();
}

// Similar patterns for:
// - openEditWorkshopModal(workshopId)
// - openManageInvitesModal(workshopId)
// - openManageVideosModal(workshopId)
// - confirmDeleteWorkshop(workshopId)
```

---

## Phase 6: Display & Rendering ✅ COMPLETED

### What Was Implemented

**File**: `/admin/workshops/workshop-display.js` (124 lines)

Created the workshop display and rendering module:

**Key Features**:
- Main rendering function that handles three states: loading, empty, and table display
- Workshop row rendering with all columns: Name, Date, Visibility, Registrations, Videos, Actions
- Badge rendering for visibility status (Open to All / Invite Only)
- Count badges for registrations and videos with icons
- Action buttons: Edit, Manage Invites (conditional), Manage Videos, Delete
- Delete button disabled state for workshops with registrations
- Proper formatting of workshop dates (DD/MM/YYYY HH:MMam/pm format)
- Exports renderWorkshops() to window for manager.js to call

**Functions Implemented**:
- `renderWorkshops()` - Main rendering function, handles empty/loading/table states
- `renderWorkshopRow(workshop)` - Generates HTML for individual table row
- `getVisibilityBadge(openToAll)` - Returns visibility badge HTML (Open to All / Invite Only)

**Design Changes from Original Spec**:
- Status column and badges removed (workshop state determined by date only)
- Date format changed to DD/MM/YYYY HH:MMam/pm (e.g., "12/04/2026 10:00am")
- Table reduced from 7 columns to 6 columns (removed Status)
- Invite button only shows for invite-only workshops
- All buttons use icon-based styling with proper tooltips

### Testing Instructions

Phase 6 completes the core workshop management UI. These tests verify the full integration of Phases 3-6 (HTML/CSS structure, business logic, modals, and display).

#### Test 1: Initial Page Load & Empty State

1. Navigate to `/admin/workshops/` (ensure you're logged in as admin)
2. If no workshops exist:
   - **Expected**: 
     - ✅ Empty state displays with large icon
     - ✅ "No workshops yet" message
     - ✅ "Create Your First Workshop" button visible
3. Click "Create Your First Workshop" button
4. **Expected**: Create Workshop modal opens

#### Test 2: Create Workshop & Table Display

1. Click "Create Workshop" button
2. Fill in form:
   - **Name**: "Styling Fundamentals Workshop"
   - **Date**: Select "12 April 2026"
   - **Time**: Enter "10:00"
   - **Topic**: "Introduction to styling basics"
   - **Cost**: 25
   - **Description**: "Learn the fundamentals of partner styling"
   - **Open to All**: Check this checkbox
3. Click "Create Workshop"
4. **Expected**:
   - ✅ Success snackbar: "Workshop created successfully"
   - ✅ Modal closes
   - ✅ Loading spinner disappears
   - ✅ Workshop table displays
   - ✅ One row visible with:
     - Name: "Styling Fundamentals Workshop"
     - Topic shown below name in smaller text
     - Date: "12/04/2026 10:00am"
     - Visibility: "Open to All" badge (green icon)
     - Registrations: "0" with user icon
     - Videos: "0" with video icon
     - Actions: Edit, Videos, Delete buttons (NO Invites button)

#### Test 3: Create Invite-Only Workshop

1. Click "Create Workshop"
2. Fill in form:
   - **Name**: "Advanced Musicality"
   - **Date**: Select "20 April 2026"
   - **Time**: Enter "14:00"
   - **Topic**: "Advanced musicality concepts"
   - **Cost**: 30
   - **Open to All**: Leave UNCHECKED
3. Click "Create Workshop"
4. **Expected**:
   - ✅ Second row appears in table
   - ✅ Visibility: "Invite Only" badge (purple lock icon)
   - ✅ Action buttons include: Edit, Invites, Videos, Delete

#### Test 4: Table Sorting & Display

1. Verify both workshops are visible
2. **Expected**:
   - ✅ Workshops ordered by date (earliest first)
   - ✅ Hover over table rows shows light background
   - ✅ Table header has purple gradient
   - ✅ All columns aligned properly

#### Test 5: Search Functionality

1. Type "styling" in search box
2. **Expected**:
   - ✅ "Advanced Musicality" disappears
   - ✅ "Styling Fundamentals" remains visible
3. Clear search box
4. **Expected**:
   - ✅ Both workshops reappear

#### Test 6: Edit Workshop & Date Format

1. Click "Edit" button on "Styling Fundamentals Workshop"
2. **Expected**:
   - ✅ Modal opens with all fields pre-populated
   - ✅ Date field shows: "Sat, 12 Apr 2026" (or "12/04/2026" if already changed)
   - ✅ Time field shows: "10:00"
3. Change name to "Styling Basics Workshop"
4. Click "Save Changes"
5. **Expected**:
   - ✅ Success snackbar appears
   - ✅ Modal closes
   - ✅ Table updates with new name immediately
   - ✅ Date format remains: "12/04/2026 10:00am"

#### Test 7: Manage Invites (Invite-Only Workshops)

1. Click "Invites" button on "Advanced Musicality"
2. **Expected**: Manage Invites modal opens with:
   - ✅ Workshop name in title
   - ✅ Student search input
   - ✅ Empty invited list (or existing students if any)
3. Type a student name in search
4. **Expected**: Dropdown appears with matching students
5. Click a student
6. **Expected**:
   - ✅ Success snackbar: "Student added to invited list"
   - ✅ Student appears in invited list (alphabetically sorted)
   - ✅ Student has "Remove" button (trash icon, right-aligned)
7. Add 2-3 more students
8. **Expected**:
   - ✅ All students listed alphabetically by full name
   - ✅ Vertical spacing: 8px between names
   - ✅ If > 10 students, scrollbar appears (max-height: 300px)
9. Close and reopen modal
10. **Expected**: Students remain in list (persisted)

#### Test 8: Manage Videos

1. Click "Videos" button on any workshop
2. **Expected**: Manage Videos modal opens with:
   - ✅ "Add Video" section with Title and URL fields
   - ✅ Add Video button aligned right
   - ✅ Empty video list (or existing videos if any)
3. Fill in:
   - **Title**: "Drill 1: Connection"
   - **URL**: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
4. Click "Add Video"
5. **Expected**:
   - ✅ Success snackbar appears
   - ✅ Video appears in list with:
     - Title as clickable external link
     - Date added
     - Delete button
6. Click the video title link
7. **Expected**: YouTube opens in new tab
8. Add another video with invalid URL (e.g., "https://example.com")
9. **Expected**: Warning snackbar: "Please enter a valid YouTube URL"
10. Click "Delete" on first video
11. **Expected**: Confirmation dialog → video removed

#### Test 9: Delete Workshop

1. Click "Delete" button on workshop with NO registrations
2. **Expected**: Confirmation dialog with workshop name
3. Click "Cancel"
4. **Expected**: Nothing happens, workshop remains
5. Click "Delete" again → Confirm
6. **Expected**:
   - ✅ Success snackbar: "Workshop deleted successfully"
   - ✅ Workshop disappears from table
   - ✅ If no workshops remain, empty state reappears

#### Test 10: Delete Prevention

1. Create a new workshop
2. Manually add a registration to it via Firestore Console:
   ```json
   registeredStudents: [{
     studentId: "test-student",
     studentName: "Test Student",
     registeredAt: <Timestamp>,
     paidOnline: true
   }]
   ```
3. Refresh the page
4. **Expected**:
   - ✅ Registrations count shows "1"
   - ✅ Delete button is DISABLED (grayed out)
   - ✅ Hover shows tooltip: "Cannot delete workshop with registrations"

#### Test 11: Responsive Design

1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Set viewport to mobile (375px width)
3. **Expected**:
   - ✅ Create Workshop button stacks on its own line
   - ✅ Search box takes full width
   - ✅ Table is horizontally scrollable
   - ✅ Action buttons stack vertically in cells
4. Test modal responsiveness:
   - Open any modal
   - **Expected**: Modal adapts to mobile width properly

#### Test 12: Data Persistence

1. Create 2-3 workshops with different states:
   - One with invited students
   - One with videos
   - One open to all
2. Refresh the page (F5)
3. **Expected**:
   - ✅ All workshops reload from Firestore
   - ✅ All data intact (names, dates, videos, invited students)
   - ✅ Counts accurate (registrations, videos)
4. Open browser in incognito/private mode
5. Navigate to `/admin/workshops/`
6. **Expected**: Redirected to login (auth check works)

#### Test 13: Error Handling

1. Open browser console
2. Disable network (DevTools → Network → Offline)
3. Try to create a workshop
4. **Expected**: Error snackbar with appropriate message
5. Re-enable network
6. Try again
7. **Expected**: Works normally

#### Test 14: Multi-Workshop Workflow

1. Create 5+ workshops with varying dates
2. **Expected**: Listed in date order (earliest first)
3. Edit multiple workshops in sequence
4. **Expected**: All edits save correctly, no state conflicts
5. Search for partial matches (e.g., "work")
6. **Expected**: All workshops with "work" in name/topic/description appear
7. Clear search
8. **Expected**: All workshops reappear

### Integration Status

With Phase 6 complete, the workshop management system is now fully functional for admin operations:

✅ **Phases 1-6 Complete**:
- Firestore data model and security rules
- Cloud Functions for online payments
- Full admin UI with HTML/CSS
- Core business logic (CRUD operations)
- Modal handlers for all operations
- Table display and rendering

⏳ **Still Pending**:
- Phase 7: Workshop check-in modal
- Phase 8.1: Admin navigation integration (header/dashboard)
- Phase 8.2: Defensive updates for existing admin pages
- Phase 9: Student portal workshop display (future)

**Next Priority**: Phase 7 - Implement workshop check-in functionality for tracking attendance and managing walk-ins.

---

## Phase 7: Workshop Check-In ✅ COMPLETED

### What Was Implemented

**File**: `/admin/workshops/workshop-checkin-modal.js` (448 lines)

Created comprehensive check-in modal for workshop attendance tracking:

**Key Features**:
- Displays registered students with payment status indicators (Paid Online / Pay Later)
- Separates students into "Not Checked In" and "Already Checked In" sections
- Walk-in student search with autocomplete (filters out already-registered students)
- Payment method selection for pay-later and walk-in students (Cash, EFTPOS, Bank Transfer)
- Creates check-in documents with workshop reference
- Creates transaction documents for pay-later and walk-in payments
- Updates workshop document with checkedInStudents array
- Adds walk-ins to both invitedStudents (portal access) and registeredStudents arrays
- Real-time modal content refresh after check-in
- Check-in button integrated into workshop table and mobile cards

**Functions Implemented**:
- `openWorkshopCheckinModal(workshopId)` - Opens check-in modal
- `generateCheckinContent(workshop)` - Generates modal HTML with student lists
- `renderCheckinStudent(registration, workshop, isWalkIn)` - Renders individual student row
- `renderCheckedInStudent(registration)` - Renders already-checked-in student (read-only)
- `attachCheckinListeners(workshop, modal)` - Attaches event listeners for search and check-in
- `selectWalkInStudent(student, workshop, container)` - Displays selected walk-in for check-in
- `handleWorkshopCheckin(workshopId, studentId, paidOnline, isWalkIn, modal)` - Core check-in logic

**Updated Files**:
- `/admin/workshops/workshops.css` - Added check-in modal styles (200+ lines)
- `/styles/base/buttons.css` - Added `.btn-icon.btn-success` variant for check-in button
- `/admin/workshops/workshop-display.js` - Added check-in button to table row and mobile card

**Design Features**:
- Green check-in button with clipboard-check icon
- Payment indicators with color coding (green for paid, yellow for pay-later)
- Student search dropdown with hover states
- Disabled state for already-checked-in students
- Responsive design for mobile check-in

### Testing Instructions

Phase 7 completes the admin check-in workflow. These tests verify the full check-in process for both registered and walk-in students.

#### Test 1: Check-In Button Visibility

1. Navigate to `/admin/workshops/`
2. **Expected**: Check-in button visible on every workshop row
3. Check desktop table view:
   - ✅ Green clipboard-check icon button between Invites and Videos
   - ✅ Tooltip: "Check-In Students"
4. Check mobile view (< 768px):
   - ✅ Check-in button appears in mobile cards
   - ✅ Same green styling as desktop

#### Test 2: Open Check-In Modal (Workshop with Registrations)

1. Create a workshop with at least 2 registered students (one paid online, one pay later)
2. Click the check-in button
3. **Expected**: Check-in modal opens with:
   - ✅ Modal title: "Check-In: [Workshop Name]"
   - ✅ Workshop info box (date, cost)
   - ✅ "Registered Students" section with student count
   - ✅ Student list shows both students
   - ✅ "Paid Online" badge (green) for online payment
   - ✅ "Pay Later" badge (yellow) for pay-later registration
   - ✅ Payment method dropdown for pay-later student
   - ✅ No payment dropdown for paid-online student
   - ✅ Green "Check In" button for each student
   - ✅ "Check In Walk-In Student" section at bottom

#### Test 3: Check In Paid-Online Student

1. Open check-in modal for workshop with online-paid registration
2. Click "Check In" button for student who paid online
3. **Expected**:
   - ✅ Loading spinner appears
   - ✅ Success snackbar: "[Student Name] checked in successfully"
   - ✅ Modal content refreshes
   - ✅ Student moves to "Already Checked In" section
   - ✅ Green check-circle icon shown
   - ✅ No action buttons (read-only)
4. Check Firestore:
   - ✅ New document in `checkins` collection with:
     - `entryType: 'workshop-entry'`
     - `workshopId`, `workshopName`, `studentId`, `studentName`
     - `paymentMethod: 'online'`
     - `amountPaid: 0` (already paid online)
     - `onlineTransactionId` pointing to original transaction
   - ✅ Workshop document updated:
     - `checkedInStudents` array contains studentId

#### Test 4: Check In Pay-Later Student

1. Open check-in modal for workshop with pay-later registration
2. Select payment method: "Cash"
3. Click "Check In" button
4. **Expected**:
   - ✅ Loading spinner
   - ✅ Success snackbar
   - ✅ Student moves to "Already Checked In" section
5. Check Firestore:
   - ✅ New document in `transactions` collection:
     - `type: 'workshop-entry'`
     - `paymentMethod: 'cash'`
     - `amount: [workshop cost]`
     - `workshopId`, `studentId`, `studentName`, `workshopName`
   - ✅ New document in `checkins` collection:
     - `paymentMethod: 'cash'`
     - `amountPaid: [workshop cost]`
     - `onlineTransactionId: null`
   - ✅ Workshop `checkedInStudents` array updated

#### Test 5: Walk-In Student Search

1. Open check-in modal
2. Scroll to "Check In Walk-In Student" section
3. Type "john" in search box
4. **Expected**:
   - ✅ Dropdown appears after 300ms debounce
   - ✅ Shows matching students
   - ✅ Does NOT show already-registered students
5. Click a student from dropdown
6. **Expected**:
   - ✅ Search box clears
   - ✅ Dropdown disappears
   - ✅ Selected student appears below search
   - ✅ Shows "Walk-In (requires payment)" label (orange)
   - ✅ Payment method dropdown visible
   - ✅ Check-in button available

#### Test 6: Check In Walk-In Student

1. Search for and select a walk-in student
2. Select payment method: "EFTPOS"
3. Click "Check In" button
4. **Expected**:
   - ✅ Loading spinner
   - ✅ Success snackbar
   - ✅ Modal refreshes
   - ✅ Walk-in student appears in "Already Checked In" section
5. Check Firestore:
   - ✅ New `transaction` document created:
     - `type: 'workshop-entry'`
     - `paymentMethod: 'eftpos'`
     - `amount: [workshop cost]`
   - ✅ New `checkin` document created:
     - `notes: 'Walk-in registration'`
     - `paymentMethod: 'eftpos'`
     - `amountPaid: [workshop cost]`
   - ✅ Workshop document updated:
     - `checkedInStudents` contains walk-in studentId
     - `invitedStudents` contains walk-in studentId (for portal access)
     - `registeredStudents` contains new registration object:
       ```json
       {
         "studentId": "...",
         "studentName": "...",
         "registeredAt": <Timestamp>,
         "paidOnline": false,
         "transactionId": "..."
       }
       ```

#### Test 7: Modal State Management

1. Check in all registered students
2. **Expected**:
   - ✅ "Registered Students" section disappears
   - ✅ "Already Checked In" section shows all students
3. Close modal and reopen
4. **Expected**:
   - ✅ State persists correctly
   - ✅ All checked-in students in "Already Checked In" section
5. Search for new walk-in
6. **Expected**:
   - ✅ Search still works
   - ✅ Already-checked-in students filtered out of search

#### Test 8: Payment Method Validation

1. Check in pay-later student with different payment methods:
   - Cash
   - EFTPOS
   - Bank Transfer
2. **Expected**:
   - ✅ Each creates transaction with correct `paymentMethod`
   - ✅ Check-in document records correct method
3. Check transactions in admin tools:
   - ✅ All appear with type: "workshop-entry"
   - ✅ Correct payment methods displayed

#### Test 9: Walk-In Not in Database

1. Open check-in modal
2. Search for non-existent student name (e.g., "ZZZZZ")
3. **Expected**:
   - ✅ Message: "No matching students found"
   - ✅ No students in dropdown

#### Test 10: Responsive Mobile Check-In

1. Open DevTools, set mobile viewport (375px)
2. Click check-in button (in mobile card)
3. **Expected**:
   - ✅ Modal opens and fills screen appropriately
   - ✅ Students stack vertically
   - ✅ Payment dropdowns full width
   - ✅ Check-in buttons full width
   - ✅ Search box full width
4. Perform check-in on mobile
5. **Expected**: Same functionality as desktop

#### Test 11: Multiple Rapid Check-Ins

1. Open check-in modal with 5+ registered students
2. Quickly check in multiple students in sequence
3. **Expected**:
   - ✅ Each check-in completes before next starts (loading spinner)
   - ✅ All students successfully checked in
   - ✅ No race conditions or duplicate transactions
   - ✅ Modal refreshes correctly after each check-in

#### Test 12: Workshop Table Integration

1. Check in students for a workshop
2. Close modal
3. **Expected**:
   - ✅ Workshop registration count remains same (walk-ins increase it)
   - ✅ Table displays updated data
4. If walk-in added:
   - ✅ Registration count increases by 1
5. Refresh page
6. **Expected**:
   - ✅ All check-ins persist
   - ✅ Counts accurate

### Integration Status

With Phase 7 complete, the admin workshop management system is fully functional:

✅ **Phases 1-7 Complete**:
- Firestore data model and security rules
- Cloud Functions for online payments
- Full admin UI (HTML/CSS/JS)
- CRUD operations for workshops
- Invite management
- Video management
- Check-in tracking with walk-ins

⏳ **Still Pending**:
- Phase 8: Admin navigation integration (header/dashboard)
- Phase 9: Student portal integration (nav button, workshop display, videos)

**Next Priority**: Phase 8 - Integrate workshop management into admin header and dashboard navigation.

---

## Phase 8: Admin Navigation Integration

### 8.1 Update admin header ✅ COMPLETED

**What Was Implemented:**

1. **Header Config** (`admin/js/header-config.js`):
   - Added `/admin/workshops/` configuration entry
   - Set `activePage: 'workshops'` for proper highlighting
   - Configured back button and navigation section

2. **Admin Navigation Bar** (`admin/components/admin-header.html`):
   - Added Workshops link between Class Plan and Student Portal
   - Icon: `fas fa-chalkboard-teacher`
   - Link points to `/admin/workshops/`
   - Mobile drawer automatically includes this link

3. **Admin Dashboard Tile** (`admin/index.html`):
   - Added Workshops tile between Class Plan and Student Portal
   - Tile description: "Manage workshop registrations, invitations, and video access"
   - Link points to `workshops/index.html`

**Testing Phase 8.1:**

1. Navigate to `/admin/` (Admin Dashboard)
2. Verify Workshops tile appears between Class Plan and Student Portal
3. Click Workshops tile - should navigate to workshops page
4. Check navigation bar - Workshops button should appear and be highlighted
5. Test mobile view (< 768px width):
   - Open mobile drawer (hamburger menu)
   - Verify Workshops appears in mobile menu between Class Plan and Student Portal
6. Navigate to other admin pages - Workshops button should remain in navigation bar

---

### 8.2 Defensive Updates for Existing Admin Pages ✅ COMPLETED

### What Was Implemented

All 5 files updated to gracefully handle `workshop-entry` transaction/check-in type:

1. **`styles/components/badges.css`** — Added `.type-badge.workshop` with orange styling
2. **`admin/check-in/js/transactions/transaction-display.js`** — Added `workshop-entry` → `'workshop'` badge class mapping
3. **`admin/admin-tools/transactions/transactions.js`** — Added guard to block editing workshop transactions with a helpful redirect message
4. **`admin/check-in/js/history-display.js`** — Added `workshop-entry` → `'Workshop'` label
5. **`admin/check-in/check-in.css`** — Added `.checkin-type.workshop-entry` with orange styling

**Note**: The spec referenced `--bg-orange-light` and `--orange-dark` which don't exist in the color system. Used `--warning-lighter` / `--text-orange-dark` as equivalents (consistent with the existing `.checkin-type.crew` pattern).

---

## Phase 9: Student Portal Integration

### Overview

Phase 9 implements the student-facing workshop features, allowing students to:
- View workshops they're invited to or open to all students
- Register and pay for workshops online via Stripe
- Access workshop videos after checking in
- View their workshop registration history

### 9.1 Student Portal Navigation

**File**: `student-portal/components/student-nav.html` (or equivalent)

Add Workshops navigation button to student portal header.

**Implementation**:
1. Add navigation link between existing nav items (after Classes, before Prepay)
2. Icon: `fas fa-chalkboard` or `fas fa-chalkboard-teacher`
3. Link points to `/student-portal/workshops/`
4. Mobile drawer should include this link automatically

**File**: `student-portal/js/header-config.js` (if exists)

Add configuration:
```javascript
{
  activePage: 'workshops',
  backButton: null, // No back button, top-level page
  title: 'Workshops'
}
```

**Testing**:
1. Navigate to student portal as logged-in student
2. Verify Workshops button appears in navigation bar
3. Click button - should navigate to workshops page (even if it shows 404 for now)
4. Test mobile view - Workshops appears in mobile drawer

---

### 9.2 Student Workshop List Page

**File**: `student-portal/workshops/index.html`

Create student workshop listing page showing:
- Open workshops (openToAll = true)
- Private workshops student is invited to
- Workshops student has registered for

**Features**:
- Filter by upcoming vs past workshops
- Show registration status (Not Registered / Registered / Attended)
- Display workshop name, date, topic, description, cost
- "Register" button for workshops not yet registered
- "View Details" to see more info and videos (if checked in)

**Structure**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workshops - Urban Swing Dance Company</title>
    
    <!-- Firebase SDK -->
    <!-- Student portal styles -->
    <!-- Workshop-specific styles -->
</head>
<body>
    <div id="student-nav-container"></div>
    
    <div class="container">
        <div class="page-header">
            <h1><i class="fas fa-chalkboard-teacher"></i> Workshops</h1>
        </div>
        
        <div class="filter-section">
            <button class="filter-btn active" data-filter="upcoming">Upcoming</button>
            <button class="filter-btn" data-filter="past">Past</button>
            <button class="filter-btn" data-filter="registered">My Registrations</button>
        </div>
        
        <div id="loading-state">
            <!-- Loading spinner -->
        </div>
        
        <div id="empty-state" style="display: none;">
            <!-- No workshops message -->
        </div>
        
        <div id="workshops-list">
            <!-- Workshop cards populated by JavaScript -->
        </div>
    </div>
    
    <!-- Modals container -->
    <div id="modals-container"></div>
    
    <script src="workshops.js"></script>
</body>
</html>
```

---

### 9.3 Student Workshop JavaScript

**File**: `student-portal/workshops/workshops.js`

Core logic for loading and displaying workshops to students.

**Key Functions**:

```javascript
// Load workshops for current student
async function loadStudentWorkshops() {
    // Query workshops where:
    // - openToAll = true, OR
    // - currentStudent.studentId in invitedStudents array
    
    // Order by date, separate into upcoming/past
}

// Render workshop card
function renderWorkshopCard(workshop, studentStatus) {
    // Show workshop info: name, date, topic, description, cost
    // Show registration status badge (Not Registered / Registered / Attended)
    // Show "Register" button if not registered
    // Show "View Details" button if registered or checked in
    // Show video count if checked in
}

// Open workshop details modal
function openWorkshopDetailsModal(workshopId) {
    // Show full workshop info
    // If student is in checkedInStudents[], show videos
    // If not checked in yet, show message about video access
}

// Open registration modal (Stripe payment)
function openWorkshopRegistrationModal(workshopId) {
    // Show workshop cost
    // Stripe Elements for payment
    // "Pay Now" button calls Cloud Function
    // "Pay Later" option (adds to registeredStudents with paidOnline: false)
}
```

**Firestore Queries**:
```javascript
// Load workshops for student
const studentId = currentUser.studentId;

// Open workshops
const openWorkshopsQuery = db.collection('workshops')
    .where('openToAll', '==', true)
    .where('status', '==', 'published');

// Invited workshops
const invitedWorkshopsQuery = db.collection('workshops')
    .where('invitedStudents', 'array-contains', studentId)
    .where('status', '==', 'published');

// Combine results and deduplicate
```

---

### 9.4 Workshop Registration Modal (Student)

**File**: `student-portal/workshops/workshop-registration-modal.js`

Handles student registration and payment for workshops.

**Features**:
- Display workshop details and cost
- Stripe Elements integration (similar to casual rates)
- "Pay Now" button → calls `processWorkshopPayment` Cloud Function
- "Pay Later" option (optional) → adds registration without payment
- Success: Redirect to workshop details or confirmation page

**Structure**:
```javascript
function openWorkshopRegistrationModal(workshop) {
    const modal = new BaseModal({
        id: 'workshop-registration-modal',
        title: 'Register for Workshop',
        content: generateRegistrationContent(workshop),
        buttons: [] // Custom payment buttons in content
    });
    
    modal.show();
    initializeStripeElements();
}

async function handleWorkshopRegistration(workshopId, paymentMethodId) {
    // Call Cloud Function
    const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: currentUser.studentId,
            workshopId: workshopId,
            paymentMethodId: paymentMethodId
        })
    });
    
    if (response.ok) {
        showSnackbar('Registration successful!', 'success');
        // Refresh workshop list
        // Close modal
    }
}
```

---

### 9.5 Workshop Details Modal (Student)

**File**: `student-portal/workshops/workshop-details-modal.js`

Shows full workshop information and videos (if student checked in).

**Features**:
- Display workshop name, date, topic, full description
- Show registration status
- **Video Access Control**: Only show videos if `currentUser.studentId` is in the workshop's `checkedInStudents` array
- If not checked in: Show message "Videos will be available after attending the workshop"
- If checked in: Display video list with YouTube embeds or links

**Structure**:
```javascript
function openWorkshopDetailsModal(worksheet) {
    const isCheckedIn = workshop.checkedInStudents?.includes(currentUser.studentId);
    
    const modal = new BaseModal({
        id: 'workshop-details-modal',
        title: workshop.name,
        size: 'large',
        content: generateDetailsContent(workshop, isCheckedIn),
        buttons: [
            {
                text: 'Close',
                variant: 'secondary',
                onClick: (modal) => modal.hide()
            }
        ]
    });
    
    modal.show();
}

function generateDetailsContent(workshop, isCheckedIn) {
    return `
        <div class="workshop-details">
            <div class="workshop-info">
                <strong>Date:</strong> ${formatDate(workshop.date)}<br>
                <strong>Topic:</strong> ${workshop.topic}<br>
                <strong>Cost:</strong> $${workshop.cost}
            </div>
            
            <div class="workshop-description">
                <h3>Description</h3>
                <p>${workshop.description}</p>
            </div>
            
            <div class="workshop-videos">
                <h3>Workshop Videos</h3>
                ${isCheckedIn ? renderVideos(workshop.videos) : `
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        Videos will be available after you attend the workshop
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderVideos(videos) {
    if (!videos || videos.length === 0) {
        return '<p>No videos available yet.</p>';
    }
    
    return videos.map(video => `
        <div class="video-item">
            <a href="${video.url}" target="_blank" rel="noopener">
                <i class="fas fa-play-circle"></i> ${video.title}
            </a>
            <span class="video-date">Added: ${formatDate(video.addedAt)}</span>
        </div>
    `).join('');
}
```

---

### 9.6 Student Workshop Styles

**File**: `student-portal/workshops/workshops.css`

Styles for student workshop pages and modals.

**Key Styles**:
- Workshop cards with hover effects
- Registration status badges (not-registered, registered, attended)
- Video list styling with play icons
- Responsive design for mobile
- Payment form styling for Stripe Elements

**Badge Colors**:
```css
.status-badge.not-registered {
    background: var(--warning-light);
    color: var(--warning-dark);
}

.status-badge.registered {
    background: var(--info-light);
    color: var(--info-dark);
}

.status-badge.attended {
    background: var(--success-light);
    color: var(--success-dark);
}
```

---

### 9.7 Testing Student Portal Features

#### Test 1: Navigate to Workshops

1. Log in as student
2. Verify Workshops button in navigation
3. Click Workshops button
4. **Expected**: Navigate to workshops page

#### Test 2: View Open Workshops

1. Create workshop with `openToAll: true`
2. As student, navigate to workshops page
3. **Expected**:
   - ✅ Workshop appears in list
   - ✅ Shows name, date, topic, cost
   - ✅ Shows "Not Registered" status
   - ✅ "Register" button visible

#### Test 3: View Invited Workshop

1. Create workshop with `openToAll: false`
2. Add student's studentId to `invitedStudents` array
3. As that student, view workshops page
4. **Expected**:
   - ✅ Private workshop appears
   - ✅ "Register" button visible

#### Test 4: Hidden Workshop

1. Create workshop with `openToAll: false`
2. Do NOT add student to `invitedStudents`
3. As that student, view workshops page
4. **Expected**:
   - ✅ Workshop does NOT appear in list

#### Test 5: Register for Workshop (Stripe Payment)

1. Click "Register" on a workshop
2. Fill in Stripe payment details (test card: 4242424242424242)
3. Click "Pay Now"
4. **Expected**:
   - ✅ Loading spinner
   - ✅ Success message
   - ✅ Workshop status changes to "Registered"
   - ✅ "Register" button replaced with "View Details"
5. Check Firestore:
   - ✅ Transaction created with `type: 'workshop-entry'`, `paymentMethod: 'online'`
   - ✅ Workshop's `registeredStudents` includes student with `paidOnline: true`

#### Test 6: View Workshop Details (Not Checked In)

1. Register for a workshop
2. Click "View Details"
3. **Expected**:
   - ✅ Modal shows workshop info
   - ✅ Videos section shows message: "Videos will be available after you attend the workshop"
   - ✅ No video links visible

#### Test 7: View Workshop Videos (Checked In)

1. Register for workshop
2. As admin, check in the student
3. As student, click "View Details"
4. **Expected**:
   - ✅ Modal shows workshop info
   - ✅ Videos section shows video list
   - ✅ Each video has clickable link to YouTube
   - ✅ Date added displayed

#### Test 8: Filter Workshops

1. Create multiple workshops (past and future dates)
2. Register for some workshops
3. Test filters:
   - Click "Upcoming" → shows only future workshops
   - Click "Past" → shows only past workshops
   - Click "My Registrations" → shows only workshops student registered for

#### Test 9: Mobile Responsive

1. Open student portal on mobile (< 768px)
2. Navigate to Workshops
3. **Expected**:
   - ✅ Workshop cards stack vertically
   - ✅ "Register" buttons full width
   - ✅ Details modal responsive
   - ✅ Video links tappable

#### Test 10: Empty States

1. As student with no available workshops:
2. **Expected**:
   - ✅ "No upcoming workshops" message
3. Filter by "My Registrations" with no registrations:
4. **Expected**:
   - ✅ "You haven't registered for any workshops yet"

---

### Integration Checklist

**Admin Side (Phases 1-8)**: ✅ Complete
- Workshop CRUD operations
- Invite management
- Video management
- Check-in tracking
- Transaction handling

**Student Side (Phase 9)**: ⏳ Pending
- [ ] Navigation button added to student portal
- [ ] Workshop list page created
- [ ] Workshop cards render correctly
- [ ] Registration modal with Stripe payment
- [ ] Workshop details modal with video access control
- [ ] Firestore security rules allow student read access (already done in Phase 1)
- [ ] Cloud Function `processWorkshopPayment` accessible to students (already done in Phase 2)
- [ ] Mobile responsive design

**End-to-End Test**:
1. Admin creates workshop
2. Admin invites students (or opens to all)
3. Student registers and pays
4. Admin checks in student on workshop day
5. Student accesses videos in portal
6. Verify videos NOT accessible before check-in

---

## Implementation Notes

- All styles use existing color variables from `/styles/base/colors.css`
- All modals extend `BaseModal` or `ConfirmationModal`
- All async operations show `LoadingSpinner`
- **Video Access Control**: Students can only see workshop videos if their `studentId` is in the `checkedInStudents` array (populated when admin checks them in). The student portal UI (Phase 6) must check this before displaying videos. Firestore rules allow read access to invited students, but videos should be filtered client-side.
- **Checkin Flow**: Registration (online payment) → Check-in (admin clicks "Check In" button on workshop day) → Update `checkedInStudents` array → Videos become visible in student portal
- All success/error states use `showSnackbar()`
- Workshop dates use NZ timezone formatting
- "Open Workshop" checkbox disables invite management
- Check-in creates transaction ONLY for "Pay Later" registrations
- Students who paid online have read-only "Online Payment" indicator

---

## Related Documentation

- Main Plan: `/memories/session/plan.md`
- Modal System: `/components/modals/README.md`
- Admin Tools Architecture: `/admin/admin-tools/concession-types/ARCHITECTURE.md`
- Firestore Rules: `/config/firestore.rules`
- Check-In System Docs: `/docs/CHECKIN_SYSTEM.md`
