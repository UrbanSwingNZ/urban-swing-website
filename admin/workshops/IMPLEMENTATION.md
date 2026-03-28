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

## Phase 5: Modal Handlers

### 5.1 Create workshop-modals.js

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

## Phase 6: Display & Rendering

### 6.1 Create workshop-display.js

**File**: `admin/workshops/workshop-display.js`

Renders workshop table, registration lists, etc.

**Key Functions**:

```javascript
function renderWorkshops() {
    const tbody = document.getElementById('workshops-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const tableContainer = document.getElementById('workshops-table-container');
    
    // Handle empty state
    if (filteredWorkshops.length === 0) {
        loadingState.style.display = 'none';
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    // Show table
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    
    // Render rows
    tbody.innerHTML = filteredWorkshops.map(workshop => renderWorkshopRow(workshop)).join('');
    
    // Attach event listeners
    attachWorkshopRowListeners();
}

function renderWorkshopRow(workshop) {
    const statusBadge = `<span class="status-badge ${workshop.status}">${workshop.status}</span>`;
    
    const visibilityBadge = workshop.openToAll
        ? `<span class="visibility-badge open-to-all"><i class="fas fa-globe"></i> Open to All</span>`
        : `<span class="visibility-badge invite-only"><i class="fas fa-lock"></i> Invite Only</span>`;
    
    const registrationCount = workshop.registeredStudents.length;
    const videoCount = workshop.videos.length;
    
    const formattedDate = formatDate(workshop.date);
    
    return `
        <tr data-workshop-id="${workshop.id}">
            <td>
                <strong>${workshop.name}</strong>
                <div style="font-size: 12px; color: var(--text-secondary);">${workshop.topic}</div>
            </td>
            <td>${formattedDate}</td>
            <td>${statusBadge}</td>
            <td>${visibilityBadge}</td>
            <td>
                <span class="count-badge">
                    <i class="fas fa-users"></i> ${registrationCount}
                </span>
            </td>
            <td>
                <span class="count-badge">
                    <i class="fas fa-video"></i> ${videoCount}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view" onclick="viewWorkshopDetails('${workshop.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="action-btn btn-edit" onclick="openEditWorkshopModal('${workshop.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${!workshop.openToAll ? `
                        <button class="action-btn" onclick="openManageInvitesModal('${workshop.id}')" style="background: var(--purple-primary); color: white;">
                            <i class="fas fa-user-plus"></i> Invites
                        </button>
                    ` : ''}
                    <button class="action-btn" onclick="openManageVideosModal('${workshop.id}')" style="background: var(--cyan); color: white;">
                        <i class="fas fa-video"></i> Videos
                    </button>
                    <button class="action-btn btn-delete" onclick="confirmDeleteWorkshop('${workshop.id}')" ${registrationCount > 0 ? 'disabled title="Cannot delete workshop with registrations"' : ''}>
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function formatDate(timestamp) {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-NZ', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
```

---

## Phase 7: Workshop Check-In

### 7.1 Create workshop-checkin-modal.js

**File**: `admin/workshops/workshop-checkin-modal.js`

Lightweight check-in modal for workshop attendees.

**Features**:
- Display registered students (sorted alphabetically)
- Show payment status (paid online vs pay later)
- Allow walk-in students to be checked in via search
- Walk-ins are automatically added to invitedStudents[] for portal access
- Handle check-in with appropriate payment method
- Create checkin document
- Create transaction document (if pay later or walk-in)

**Structure**:

```javascript
function openWorkshopCheckinModal(workshopId) {
    const workshop = workshops.find(w => w.id === workshopId);
    if (!workshop) return;
    
    const modal = new BaseModal({
        id: 'workshop-checkin-modal',
        title: `Check-In: ${workshop.name}`,
        content: generateCheckinContent(workshop),
        buttons: [
            {
                text: 'Close',
                class: 'btn-secondary',
                onClick: (modal) => modal.hide()
            }
        ]
    });
    
 

// Note: The attachCheckinListeners() function handles the walk-in student search,
// separating students into "Already Registered" and "Walk-Ins" sections,
// and allowing selection from both groups for check-in.   modal.show();
    attachCheckinListeners(workshop);
}

function generateCheckinContent(workshop) {
    const registeredStudents = workshop.registeredStudents || [];
    
    return `
        <div class="workshop-info">
            <div style="margin-bottom: 20px; padding: 12px; background: var(--info-light); border-radius: 6px;">
                <strong>Workshop Date:</strong> ${formatDate(workshop.date)}<br>
                <strong>Cost:</strong> $${workshop.cost}
            </div>
        </div>
        
        <!-- Registered Students Section -->
        ${registeredStudents.length > 0 ? `
            <div class="registered-students-section" style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px; color: var(--text-primary);">
                    <i class="fas fa-user-check"></i> Registered Students
                </h3>
                <div class="registrations-list">
                    ${registeredStudents.map(reg => renderCheckinStudent(reg, workshop, false)).join('')}
                </div>
            </div>
        ` : `
            <div style="margin-bottom: 30px; padding: 15px; background: var(--hover-background); border-radius: 6px; text-align: center;">
                <i class="fas fa-info-circle"></i> No pre-registered students yet
            </div>
        `}
        
        <!-- Walk-In Student Section -->
        <div class="walkin-students-section">
            <h3 style="margin-bottom: 15px; color: var(--text-primary);">
                <i class="fas fa-user-plus"></i> Check In Walk-In Student
            </h3>
            
            <div class="student-search" style="margin-bottom: 15px;">
                <label for="walkin-search" style="display: block; margin-bottom: 8px; font-weight: 600;">
                    Search for student:
                </label>
                <input type="text" 
                       id="walkin-search" 
                       placeholder="Type student name..."
                       style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px;">
                <div id="walkin-search-results" class="search-results" style="display: none;"></div>
            </div>
            
            <div id="walkin-selected-student" style="display: none;">
                <!-- Selected student will be rendered here -->
            </div>
        </div>
    `;
}

function renderCheckinStudent(registration, workshop, isWalkIn = false) {
    const paidBadge = registration.paidOnline
        ? `<span class="payment-indicator paid-online"><i class="fas fa-check-circle"></i> Paid Online</span>`
        : `<span class="payment-indicator pay-later"><i class="fas fa-clock"></i> Pay Later</span>`;
    
    const studentName = registration.studentName || `${registration.firstName} ${registration.lastName}` || registration.studentId;
    const registrationInfo = !isWalkIn ? `Registered: ${formatDate(registration.registeredAt)} | ${paidBadge}` : `<strong>Walk-In</strong> (requires payment)`;
    
    return `
        <div class="checkin-item" data-student-id="${registration.studentId}">
            <div class="student-info">
                <div class="student-name">${studentName}</div>
                <div class="registration-meta">
                    ${registrationInfo}
                </div>
            </div>
            
            ${!registration.paidOnline ? `
                <div class="payment-method-selector">
                    <select class="payment-method-select" data-student-id="${registration.studentId}">
                        <option value="">Select payment method</option>
                        <option value="cash">Cash</option>
                        <option value="eftpos">EFTPOS</option>
                        <option value="bank-transfer">Bank Transfer</option>
                    </select>
                </div>
            ` : ''}
            
            <button class="action-btn btn-checkin" 
                    data-student-id="${registration.studentId}" 
                    data-paid-online="${registration.paidOnline || false}"
                    onclick="handleWorkshopCheckin('${workshop.id}', '${registration.studentId}', ${registration.paidOnline || false}, ${isWalkIn})">
                <i class="fas fa-check"></i> Check In
            </button>
        </div>
    `;
}

function attachCheckinListeners(workshop) {
    const searchInput = document.getElementById('walkin-search');
    const searchResults = document.getElementById('walkin-search-results');
    const selectedContainer = document.getElementById('walkin-selected-student');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const students = await searchStudents(query);
            
            // Filter out students who are already registered
            const registeredIds = new Set((workshop.registeredStudents || []).map(r => r.studentId));
            
            // Separate into registered and non-registered
            const alreadyRegistered = students.filter(s => registeredIds.has(s.id));
            const notRegistered = students.filter(s => !registeredIds.has(s.id));
            
            // Sort alphabetically
            const sortByName = (a, b) => {
                const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                return nameA.localeCompare(nameB);
            };
            
            alreadyRegistered.sort(sortByName);
            notRegistered.sort(sortByName);
            
            // Render results
            if (alreadyRegistered.length === 0 && notRegistered.length === 0) {
                searchResults.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">No students found</div>';
            } else {
                let html = '';
                
                if (alreadyRegistered.length > 0) {
                    html += '<div style="padding: 8px 10px; background: var(--hover-background); font-weight: 600; font-size: 12px;">Already Registered</div>';
                    alreadyRegistered.forEach(student => {
                        html += `
                            <div class="search-result-item" data-student-id="${student.id}">
                                ${student.firstName} ${student.lastName}
                                <span style="color: var(--success); margin-left: 8px;">
                                    <i class="fas fa-check-circle"></i> Registered
                                </span>
                            </div>
                        `;
                    });
                }
                
                if (notRegistered.length > 0) {
                    html += '<div style="padding: 8px 10px; background: var(--hover-background); font-weight: 600; font-size: 12px; margin-top: 4px;">Walk-Ins</div>';
                    notRegistered.forEach(student => {
                        html += `
                            <div class="search-result-item" data-student-id="${student.id}">
                                ${student.firstName} ${student.lastName}
                            </div>
                        `;
                    });
                }
                
                searchResults.innerHTML = html;
            }
            
            searchResults.style.display = 'block';
            
            // Attach click listeners to results
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const studentId = item.dataset.studentId;
                    const student = students.find(s => s.id === studentId);
                    
                    // Check if already registered
                    const isRegistered = registeredIds.has(studentId);
                    
                    if (isRegistered) {
                        showSnackbar('This student is already registered. Check them in from the "Registered Students" section above.', 'info');
                        searchResults.style.display = 'none';
                        searchInput.value = '';
                        return;
                    }
                    
                    // Render selected walk-in student
                    selectedContainer.innerHTML = renderCheckinStudent({
                        studentId: student.id,
                        firstName: student.firstName,
                        lastName: student.lastName,
                        paidOnline: false
                    }, workshop, true);
                    
                    selectedContainer.style.display = 'block';
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                });
            });
        }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.student-search')) {
            searchResults.style.display = 'none';
        }
    });
}

async function handleWorkshopCheckin(workshopId, studentId, paidOnline, isWalkIn = false) {
    try {
        LoadingSpinner.showGlobal('Checking in student...');
        
        const workshop = workshops.find(w => w.id === workshopId);
        
        // Get student details
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = studentDoc.data();
        const studentName = `${student.firstName} ${student.lastName}`;
        
        let paymentMethod = 'online';
        let transactionId = null;
        
        // If pay later (or walk-in, which is always pay later), create transaction first
        if (!paidOnline) {
            const paymentMethodSelect = document.querySelector(`.payment-method-select[data-student-id="${studentId}"]`);
            paymentMethod = paymentMethodSelect.value;
            
            if (!paymentMethod) {
                showSnackbar('Please select a payment method', 'warning');
                LoadingSpinner.hideGlobal();
                return;
            }
            
            // Create transaction
            const transactionRef = await db.collection('transactions').add({
                type: 'workshop-entry',
                workshopId: workshopId,
                workshopName: workshop.name,
                studentId: studentId,
                studentName: studentName,
                amount: workshop.cost,
                paymentMethod: paymentMethod,
                classDate: workshop.date,
                date: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid,
                reversed: false,
                refunded: null
            });
            
            transactionId = transactionRef.id;
        } else {
            // Find existing transaction for this student/workshop
            const transactionSnapshot = await db.collection('transactions')
                .where('workshopId', '==', workshopId)
                .where('studentId', '==', studentId)
                .where('type', '==', 'workshop-entry')
                .limit(1)
                .get();
            
            if (!transactionSnapshot.empty) {
                transactionId = transactionSnapshot.docs[0].id;
            }
        }
        
        // Create checkin document
        const checkinDate = workshop.date.toDate();
        const dateStr = checkinDate.toISOString().split('T')[0];
        const checkinId = `checkin-${dateStr}-${student.firstName.toLowerCase()}-${student.lastName.toLowerCase()}`;
        
        await db.collection('checkins').doc(checkinId).set({
            studentId: studentId,
            studentName: studentName,
            checkinDate: workshop.date,
            entryType: 'workshop-entry',
            workshopId: workshopId,
            workshopName: workshop.name,
            paymentMethod: paymentMethod,
            amountPaid: paidOnline ? 0 : workshop.cost,
            onlineTransactionId: transactionId,
            notes: null,
            reversed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        // Add student to checkedInStudents array (for video access control)
        await db.collection('workshops').doc(workshopId).update({
        // Also add walk-ins to invitedStudents array so they can access workshop in portal
        const updates = {
            checkedInStudents: firebase.firestore.FieldValue.arrayUnion(studentId)
        };
        
        if (isWalkIn) {
            updates.invitedStudents = firebase.firestore.FieldValue.arrayUnion(studentId);
        }
        
        await db.collection('workshops').doc(workshopId).update(updates);
        showSnackbar(`${studentName} checked in successfully`, 'success');
        LoadingSpinner.hideGlobal();
        
        // Refresh the modal
        document.querySelector(`[data-student-id="${studentId}"]`).style.opacity = '0.5';
        document.querySelector(`button[data-student-id="${studentId}"]`).disabled = true;
        document.querySelector(`button[data-student-id="${studentId}"]`).innerHTML = '<i class="fas fa-check-circle"></i> Checked In';
        
    } catch (error) {
        console.error('Check-in error:', error);
        showSnackbar('Failed to check in student', 'error');
        LoadingSpinner.hideGlobal();
    }
}
```

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

### 8.2 Defensive Updates for Existing Admin Pages

These updates ensure existing admin pages gracefully handle workshop transactions when they appear in global transaction lists.

**File**: `styles/components/badges.css`

Add workshop badge styling (after the existing `.type-badge.casual-student` rule):

```css
.type-badge.workshop {
    background: var(--bg-orange-light);
    color: var(--orange-dark);
}
```

**File**: `admin/check-in/js/transactions/transaction-display.js`

Update `createCheckinTransactionRow()` function to handle workshop-entry type (around line 51-63):

```javascript
// Add this case before the else clause:
} else if (transaction.type === 'workshop-entry') {
    typeBadgeClass = 'workshop';
```

**File**: `admin/admin-tools/transactions/transactions.js`

Update `handleEditTransaction()` function to prevent editing workshop transactions (around line 288-295):

```javascript
// Add this case after concession-gift:
if (transaction.type === 'concession-gift') {
    showSnackbar('Gifted concessions cannot be edited. Please reverse and create a new gift if needed.', 'info');
    return;
} else if (transaction.type === 'workshop-entry') {
    showSnackbar('Workshop transactions cannot be edited here. Please edit from the Workshop page.', 'info');
    return;
} else if (transaction.type === 'casual' || transaction.type === 'casual-student') {
```

**File**: `admin/check-in/js/history-display.js`

Update `displayHistory()` function to handle workshop-entry type labels (around line 29-31):

```javascript
// Update the typeLabel logic:
const typeLabel = item.entryType === 'concession' ? 'Concession' : 
                 item.entryType === 'casual' ? 'Casual Entry' : 
                 item.entryType === 'casual-student' ? 'Casual Student' : 
                 item.entryType === 'workshop-entry' ? 'Workshop' : 'Free Entry';
```

**File**: `admin/check-in/check-in.css`

Add workshop check-in styling (after the existing `.checkin-type.crew` rule, around line 722):

```css
.checkin-type.workshop-entry {
    background: var(--bg-orange-light);
    color: var(--orange-dark);
}
```

**Why These Changes Matter:**

- **Badge Styling**: Without this, workshop transactions display with generic gray "other" badge
- **Transaction Display**: Ensures workshop transactions have proper visual distinction in admin transaction lists
- **Edit Prevention**: Clicking "Edit" on workshop transaction would silently fail; now shows helpful message directing admin to correct page
- **Check-in History**: Workshop check-ins will appear on regular check-in page with correct "Workshop" label instead of "Free Entry"
- **Check-in Styling**: Ensures workshop check-ins have distinct visual appearance matching workshop theme

---for "Pay Later" registrations AND walk-ins (who always pay on arrival)
- Students who paid online have read-only "Online Payment" indicator
- **Walk-In Students**: Students who didn't pre-register can be checked in via the search function. They are added to both `invitedStudents[]` (for portal access) and `checkedInStudents[]` (for video access) at check-in time. Walk-ins always require payment at check-in.
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
