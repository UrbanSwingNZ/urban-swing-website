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

---

## Phase 1: Firestore Data Model & Security Rules

**CRITICAL: This phase must be completed first before any UI development.**

### 1.1 Add Firestore Security Rules

**File**: `/config/firestore.rules`

Add the following rules to enable workshop collection access:

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
```

**Note**: The `getStudentId()` helper function should already exist in your firestore.rules file. If not, add it:

```javascript
function getStudentId() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.studentId;
}
```

### 1.2 Deploy Firestore Rules

Deploy the updated security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

### 1.3 Test Security Rules (Optional)

Use Firebase Console's Rules Playground to test:
- Admin can read/write any workshop
- Student can read workshop where openToAll=true
- Student can read workshop where they're in invitedStudents[]
- Student cannot read workshop where they're not invited
- Student cannot write to any workshop

---

## Phase 2: Cloud Functions & Backend

### 2.1 Update transaction-utils.js

**File**: `/functions/utils/transaction-utils.js`

Add workshop-entry type recognition to `determineTransactionType()`:

```javascript
// Add this case to the determineTransactionType function
function determineTransactionType(transactionData) {
  // Existing cases...
  
  // Workshop entry
  if (transactionData.workshopId) {
    return 'workshop-entry';
  }
  
  // ... rest of function
}
```

### 2.2 Create process-workshop-payment.js

**File**: `/functions/process-workshop-payment.js`

Create new Cloud Function for processing workshop Stripe payments:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { processStripePayment } = require('./stripe/stripe-payment');

exports.processWorkshopPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { studentId, workshopId, paymentMethodId } = data;

    // Validate inputs
    if (!studentId || !workshopId || !paymentMethodId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    const db = admin.firestore();

    // Get workshop details
    const workshopDoc = await db.collection('workshops').doc(workshopId).get();
    if (!workshopDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Workshop not found');
    }

    const workshop = workshopDoc.data();

    // Get student details
    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Student not found');
    }

    const student = studentDoc.data();
    const studentName = `${student.firstName} ${student.lastName}`;

    // Process Stripe payment
    const paymentResult = await processStripePayment({
      amount: workshop.cost,
      currency: 'nzd',
      customerId: student.stripeCustomerId,
      paymentMethodId: paymentMethodId,
      description: `Workshop: ${workshop.name}`,
      metadata: {
        studentId: studentId,
        workshopId: workshopId,
        type: 'workshop-entry'
      }
    });

    // Create transaction record
    const transactionRef = await db.collection('transactions').add({
      type: 'workshop-entry',
      workshopId: workshopId,
      workshopName: workshop.name,
      studentId: studentId,
      studentName: studentName,
      amount: workshop.cost,
      paymentMethod: 'online',
      classDate: workshop.date,
      date: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
      reversed: false,
      refunded: null,
      stripePaymentIntentId: paymentResult.paymentIntentId
    });

    // Add student to registeredStudents array
    await db.collection('workshops').doc(workshopId).update({
      registeredStudents: admin.firestore.FieldValue.arrayUnion({
        studentId: studentId,
        studentName: studentName,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        paidOnline: true
      })
    });

    return {
      success: true,
      transactionId: transactionRef.id,
      paymentIntentId: paymentResult.paymentIntentId
    };

  } catch (error) {
    console.error('Workshop payment error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

### 2.3 Export Cloud Function

**File**: `/functions/index.js`

Add the new function to exports:

```javascript
const { processWorkshopPayment } = require('./process-workshop-payment');

exports.processWorkshopPayment = processWorkshopPayment;
```

### 2.4 Deploy Cloud Functions

```bash
firebase deploy --only functions:processWorkshopPayment
```

---

## Phase 3: Admin Page Structure

### 3.1 Create index.html

**File**: `admin/workshops/index.html`

**Structure**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workshop Management | Urban Swing</title>
    
    <!-- Global Styles -->
    <link rel="stylesheet" href="/styles/base/colors.css">
    <link rel="stylesheet" href="/styles/base/buttons.css">
    <link rel="stylesheet" href="/styles/base/typography.css">
    <link rel="stylesheet" href="/admin/admin.css">
    
    <!-- Workshop-specific Styles -->
    <link rel="stylesheet" href="workshops.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Header will be injected by admin-header.js -->
    <div id="admin-header-container"></div>

    <div class="admin-container">
        <div class="page-header">
            <h1><i class="fas fa-chalkboard-teacher"></i> Workshop Management</h1>
            <button id="create-workshop-btn" class="btn btn-primary">
                <i class="fas fa-plus"></i> Create Workshop
            </button>
        </div>

        <!-- Filter/Search Section -->
        <div class="filter-section">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="workshop-search" placeholder="Search workshops...">
            </div>
            <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="draft">Draft</button>
                <button class="filter-btn" data-filter="published">Published</button>
                <button class="filter-btn" data-filter="completed">Completed</button>
            </div>
        </div>

        <!-- Workshops Table -->
        <div class="workshops-container">
            <div id="loading-state" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i> Loading workshops...
            </div>
            
            <div id="empty-state" class="empty-state" style="display: none;">
                <i class="fas fa-chalkboard-teacher"></i>
                <p>No workshops yet</p>
                <button class="btn btn-primary" onclick="document.getElementById('create-workshop-btn').click()">
                    Create Your First Workshop
                </button>
            </div>
            
            <div id="workshops-table-container" style="display: none;">
                <table class="workshops-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Visibility</th>
                            <th>Registrations</th>
                            <th>Videos</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="workshops-tbody">
                        <!-- Rows populated by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Firebase -->
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    
    <!-- Firebase Config -->
    <script src="/config/firebase-config.js"></script>
    
    <!-- Components -->
    <script src="/components/modals/modal-base.js"></script>
    <script src="/components/modals/confirmation-modal.js"></script>
    <script src="/components/loading-spinner/loading-spinner.js"></script>
    <script src="/components/snackbar/snackbar.js"></script>
    
    <!-- Admin Header -->
    <script src="/admin/admin-header.js"></script>
    
    <!-- Workshop Scripts -->
    <script src="workshop-manager.js"></script>
    <script src="workshop-modals.js"></script>
    <script src="workshop-display.js"></script>
    <script src="workshop-checkin-modal.js"></script>
</body>
</html>
```

---

### 1.2 Create workshops.css

**File**: `admin/workshops/workshops.css`

**Design Tokens** (use existing colors only):

```css
@import url('../../styles/base/colors.css');

/* Page Layout */
.admin-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.page-header h1 {
    font-size: 28px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Filter Section */
.filter-section {
    background: var(--card-background);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
}

.search-box {
    position: relative;
    flex: 1;
    min-width: 250px;
}

.search-box i {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
}

.search-box input {
    width: 100%;
    padding: 10px 10px 10px 40px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
}

.filter-buttons {
    display: flex;
    gap: 8px;
}

.filter-btn {
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.filter-btn:hover {
    background: var(--hover-background);
}

.filter-btn.active {
    background: var(--purple-primary);
    color: white;
    border-color: var(--purple-primary);
}

/* Workshops Table */
.workshops-table {
    width: 100%;
    background: var(--card-background);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.workshops-table thead {
    background: var(--purple-primary);
    color: white;
}

.workshops-table th {
    padding: 16px;
    text-align: left;
    font-weight: 600;
    font-size: 14px;
}

.workshops-table td {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
}

.workshops-table tbody tr:hover {
    background: var(--hover-background);
}

.workshops-table tbody tr:last-child td {
    border-bottom: none;
}

/* Status Badges */
.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.status-badge.draft {
    background: var(--warning-light);
    color: var(--warning-darker);
}

.status-badge.published {
    background: var(--success-light);
    color: var(--success-dark);
}

.status-badge.completed {
    background: var(--info-light);
    color: var(--info);
}

/* Visibility Badge */
.visibility-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
}

.visibility-badge i {
    font-size: 14px;
}

.visibility-badge.open-to-all {
    color: var(--success);
}

.visibility-badge.invite-only {
    color: var(--purple-primary);
}

/* Count Badges */
.count-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--hover-background);
    border-radius: 6px;
    font-size: 13px;
}

/* Action Buttons */
.action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.action-btn {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
}

.action-btn.btn-view {
    background: var(--info-light);
    color: var(--info);
}

.action-btn.btn-edit {
    background: var(--warning-light);
    color: var(--warning-darker);
}

.action-btn.btn-delete {
    background: var(--error-light);
    color: var(--error);
}

.action-btn:hover {
    opacity: 0.8;
    transform: translateY(-1px);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
}

.loading-state i,
.empty-state i {
    font-size: 48px;
    margin-bottom: 20px;
    color: var(--purple-primary);
}

.empty-state p {
    font-size: 18px;
    margin-bottom: 20px;
}

/* Workshop Details Expandable Row */
.workshop-details-row {
    background: var(--hover-background);
}

.workshop-details-content {
    padding: 20px;
}

.workshop-tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--border-color);
}

.tab-btn {
    padding: 10px 20px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.2s ease;
}

.tab-btn:hover {
    color: var(--purple-primary);
}

.tab-btn.active {
    color: var(--purple-primary);
    border-bottom-color: var(--purple-primary);
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

/* Registrations List */
.registrations-list {
    display: grid;
    gap: 12px;
}

.registration-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: white;
    border-radius: 6px;
    border: 1px solid var(--border-color);
}

.student-info {
    flex: 1;
}

.student-name {
    font-weight: 600;
    color: var(--text-primary);
}

.registration-meta {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
}

.payment-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
}

.payment-indicator.paid-online {
    background: var(--success-light);
    color: var(--success-dark);
}

.payment-indicator.pay-later {
    background: var(--warning-light);
    color: var(--warning-darker);
}

/* Invited Students List */
.invited-list {
    display: grid;
    gap: 8px;
}

.invited-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: white;
    border-radius: 6px;
    border: 1px solid var(--border-color);
}

/* Videos List */
.videos-list {
    display: grid;
    gap: 12px;
}

.video-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: white;
    border-radius: 6px;
    border: 1px solid var(--border-color);
}

.video-info {
    flex: 1;
}

.video-title {
    font-weight: 600;
    color: var(--text-primary);
}

.video-url {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
}

/* Modal Overrides for Workshop Forms */
.workshop-form {
    display: grid;
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-group label {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
}

.form-group textarea {
    min-height: 100px;
    resize: vertical;
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.checkbox-group input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.checkbox-group label {
    cursor: pointer;
    font-weight: 500;
}

/* Student Search Autocomplete */
.student-search {
    position: relative;
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--border-color);
    border-top: none;
    border-radius: 0 0 6px 6px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.search-result-item {
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid var(--border-color);
}

.search-result-item:hover {
    background: var(--hover-background);
}

.search-result-item:last-child {
    border-bottom: none;
}

/* Responsive Design */
@media (max-width: 768px) {
    .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
    }
    
    .filter-section {
        flex-direction: column;
    }
    
    .workshops-table {
        display: block;
        overflow-x: auto;
    }
    
    .action-buttons {
        flex-direction: column;
    }
}
```

---

## Phase 4: Core Business Logic

### 4.1 Create workshop-manager.js

**File**: `admin/workshops/workshop-manager.js`

**Responsibilities**:
- Firestore CRUD operations
- Workshop data transformation
- State management
- API calls to Cloud Functions

**Key Functions**:

```javascript
// State
let currentUser = null;
let workshops = [];
let filteredWorkshops = [];
let selectedWorkshop = null;

// Initialize
async function initWorkshopManager() {
    try {
        LoadingSpinner.showGlobal('Loading workshops...');
        
        // Check auth
        currentUser = await checkAuth();
        if (!currentUser || !isAdminOrFrontDesk()) {
            window.location.href = '/';
            return;
        }
        
        // Load workshops
        await loadWorkshops();
        
        // Setup listeners
        setupEventListeners();
        
        LoadingSpinner.hideGlobal();
    } catch (error) {
        console.error('Initialization error:', error);
        showSnackbar('Failed to load workshops', 'error');
        LoadingSpinner.hideGlobal();
    }
}

// Load all workshops
async function loadWorkshops() {
    const snapshot = await db.collection('workshops')
        .orderBy('date', 'desc')
        .get();
    
    workshops = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    filteredWorkshops = [...workshops];
    renderWorkshops();
}

// Create workshop
async function createWorkshop(workshopData) {
    try {
        LoadingSpinner.showGlobal('Creating workshop...');
        
        const docRef = await db.collection('workshops').add({
            name: workshopData.name,
            date: workshopData.date,
            description: workshopData.description,
            topic: workshopData.topic,
            cost: parseFloat(workshopData.cost),
            status: 'draft',
            openToAll: workshopData.openToAll || false,
            invitedStudents: [],
            registeredStudents: [],
            videos: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        showSnackbar('Workshop created successfully', 'success');
        await loadWorkshops();
        LoadingSpinner.hideGlobal();
        return docRef.id;
    } catch (error) {
        console.error('Create workshop error:', error);
        showSnackbar('Failed to create workshop', 'error');
        LoadingSpinner.hideGlobal();
        throw error;
    }
}

// Update workshop
async function updateWorkshop(workshopId, updates) {
    try {
        LoadingSpinner.showGlobal('Updating workshop...');
        
        await db.collection('workshops').doc(workshopId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSnackbar('Workshop updated successfully', 'success');
        await loadWorkshops();
        LoadingSpinner.hideGlobal();
    } catch (error) {
        console.error('Update workshop error:', error);
        showSnackbar('Failed to update workshop', 'error');
        LoadingSpinner.hideGlobal();
        throw error;
    }
}

// Delete workshop
async function deleteWorkshop(workshopId) {
    try {
        LoadingSpinner.showGlobal('Deleting workshop...');
        
        await db.collection('workshops').doc(workshopId).delete();
        
        showSnackbar('Workshop deleted successfully', 'success');
        await loadWorkshops();
        LoadingSpinner.hideGlobal();
    } catch (error) {
        console.error('Delete workshop error:', error);
        showSnackbar('Failed to delete workshop', 'error');
        LoadingSpinner.hideGlobal();
        throw error;
    }
}

// Add invited student
async function addInvitedStudent(workshopId, studentId) {
    await db.collection('workshops').doc(workshopId).update({
        invitedStudents: firebase.firestore.FieldValue.arrayUnion(studentId)
    });
}

// Remove invited student
async function removeInvitedStudent(workshopId, studentId) {
    await db.collection('workshops').doc(workshopId).update({
        invitedStudents: firebase.firestore.FieldValue.arrayRemove(studentId)
    });
}

// Add video
async function addVideo(workshopId, videoData) {
    const video = {
        title: videoData.title,
        url: videoData.url,
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('workshops').doc(workshopId).update({
        videos: firebase.firestore.FieldValue.arrayUnion(video)
    });
}

// Remove video
async function removeVideo(workshopId, videoUrl) {
    const workshop = workshops.find(w => w.id === workshopId);
    const updatedVideos = workshop.videos.filter(v => v.url !== videoUrl);
    
    await db.collection('workshops').doc(workshopId).update({
        videos: updatedVideos
    });
}

// Update workshop status
async function updateWorkshopStatus(workshopId, newStatus) {
    await updateWorkshop(workshopId, { status: newStatus });
}

// Search students (for invite modal)
async function searchStudents(query) {
    const snapshot = await db.collection('students')
        .orderBy('firstName')
        .limit(20)
        .get();
    
    const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    // Client-side filtering (Firestore doesn't support LIKE queries)
    return students.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        return fullName.includes(query.toLowerCase());
    });
}

// Helpers
function isAdminOrFrontDesk() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'front-desk');
}

// Event listeners
function setupEventListeners() {
    // Search
    document.getElementById('workshop-search').addEventListener('input', handleSearch);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
    
    // Create button
    document.getElementById('create-workshop-btn').addEventListener('click', () => {
        openCreateWorkshopModal();
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    filteredWorkshops = workshops.filter(workshop => 
        workshop.name.toLowerCase().includes(query) ||
        workshop.topic.toLowerCase().includes(query)
    );
    renderWorkshops();
}

function handleFilter(e) {
    const filter = e.target.dataset.filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Filter workshops
    if (filter === 'all') {
        filteredWorkshops = [...workshops];
    } else {
        filteredWorkshops = workshops.filter(w => w.status === filter);
    }
    
    renderWorkshops();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initWorkshopManager);
```

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
- Display registered students
- Show payment status (paid online vs pay later)
- Handle check-in with appropriate payment method
- Create checkin document
- Create transaction document (if pay later)

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
    
    modal.show();
    attachCheckinListeners(workshop);
}

function generateCheckinContent(workshop) {
    const registeredStudents = workshop.registeredStudents || [];
    
    if (registeredStudents.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-user-slash"></i>
                <p>No students registered yet</p>
            </div>
        `;
    }
    
    return `
        <div class="workshop-info">
            <div style="margin-bottom: 20px; padding: 12px; background: var(--info-light); border-radius: 6px;">
                <strong>Workshop Date:</strong> ${formatDate(workshop.date)}<br>
                <strong>Cost:</strong> $${workshop.cost}
            </div>
        </div>
        
        <div class="registrations-list">
            ${registeredStudents.map(reg => renderCheckinStudent(reg, workshop)).join('')}
        </div>
    `;
}

function renderCheckinStudent(registration, workshop) {
    const paidBadge = registration.paidOnline
        ? `<span class="payment-indicator paid-online"><i class="fas fa-check-circle"></i> Paid Online</span>`
        : `<span class="payment-indicator pay-later"><i class="fas fa-clock"></i> Pay Later</span>`;
    
    return `
        <div class="checkin-item" data-student-id="${registration.studentId}">
            <div class="student-info">
                <div class="student-name">${registration.studentName || registration.studentId}</div>
                <div class="registration-meta">
                    Registered: ${formatDate(registration.registeredAt)} | ${paidBadge}
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
                    data-paid-online="${registration.paidOnline}"
                    onclick="handleWorkshopCheckin('${workshop.id}', '${registration.studentId}', ${registration.paidOnline})">
                <i class="fas fa-check"></i> Check In
            </button>
        </div>
    `;
}

async function handleWorkshopCheckin(workshopId, studentId, paidOnline) {
    try {
        LoadingSpinner.showGlobal('Checking in student...');
        
        const workshop = workshops.find(w => w.id === workshopId);
        const registration = workshop.registeredStudents.find(r => r.studentId === studentId);
        
        // Get student details
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = studentDoc.data();
        const studentName = `${student.firstName} ${student.lastName}`;
        
        let paymentMethod = 'online';
        let transactionId = null;
        
        // If pay later, create transaction first
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

### 8.1 Update admin header

**File**: `admin/components/admin-header.html`

Add workshops link to main navigation:

```html
<li>
    <a href="/admin/workshops/" data-page="workshops">
        <i class="fas fa-chalkboard-teacher"></i> Workshops
    </a>
</li>
```

**File**: `admin/js/header-config.js`

Add configuration:

```javascript
'/admin/workshops/': {
    title: 'Workshop Management',
    activePage: 'workshops',
    navSection: 'main-admin',
    showBackButton: false,
    showLogout: true
}
```

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

---

## Implementation Notes

- All styles use existing color variables from `/styles/base/colors.css`
- All modals extend `BaseModal` or `ConfirmationModal`
- All async operations show `LoadingSpinner`
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
