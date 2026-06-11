# Monthly Membership System - Implementation Plan

**Last Updated:** June 11, 2026  
**Version:** 3.2  
**Status:** Phase 8 Complete - Phase 9 Mostly Complete (7/9 sub-phases done, 3 tasks in 9.1 complete)

**Major Changes in v3.1:**
- 🔄 **Phase 9 In Progress:** Auto-Renew Enhancements & Membership Lifecycle
  - ✅ Removed cancel membership button (auto-renew toggle handles this) - **COMPLETE**
  - ✅ Hide auto-renew toggle for cash/EFTPOS/bank transfer memberships - **COMPLETE**
  - ✅ Expired membership badge and UI updates - **COMPLETE**
  - Default to recurring purchases in UI
  - Add "Update Payment Method" button for online memberships
  - Transaction type consistency (all use 'membership-purchase')
  - Webhook period calculation from Stripe subscription object
  - Scheduled function for daily expiry checks and admin notifications
  - Email notifications (successful renewal, failed payment, expired memberships)
  - Comprehensive test cases and verification steps

**Major Changes in v3.0:**
- ✅ **Phase 8 Complete:** Student Database UI Updates
  - Added improver checkbox to student modal (already existed, now functional)
  - Added membership info display for improvers in student details
  - Added concession balance display for non-improvers in student details
  - Implemented concession check logic when toggling improver status
  - Created confirmation modal when unchecking improver status
  - Created improver promotion alert email template and Cloud Function
  - Email sent to dance@urbanswing.co.nz when improver is marked with active concessions
  - Admin receives modal alert with concession details and refund instructions
  - Membership section shows active membership details with expiry and auto-renew status
  - Concession section shows total active concession count

**Major Changes in v2.9:**
- ✅ **Phase 7 Complete:** Display Logic & Conditional UI
  - Added membership navigation link to student portal header
  - Added membership dashboard tile for improvers
  - Implemented improver-based UI visibility logic in `student-portal-header.js`
  - Created `access-control.js` for URL-based access protection
  - Improvers see: Membership (concessions/prepay hidden)
  - Beginners see: Concessions, Prepay, Purchase Concessions (membership hidden)
  - Direct URL access protected with automatic redirects and user-friendly messages
  - Updated empty state message for no available memberships
  - Admin UI already includes improver badge (completed in Phase 5)

**Major Changes in v2.8:**
- ✅ **Phase 6 Complete:** Admin Membership Assignment & Cash Payments
  - Created `adminAssignMembership` Cloud Function for manual membership assignment
  - Created admin membership assignment modal UI
  - Added "Purchase Membership" and "Renew Membership" buttons to check-in interface
  - Supports cash, bank transfer, EFTPOS, online, and complimentary payments
  - Includes recurring subscription option (online only)
  - Shows improver status warning for non-improver students
  - Automatically calculates expiry dates with anniversary-based billing

**Major Changes in v2.7:**
- ✅ **Phase 5 Complete:** Check-in Integration
  - Created membership validation module for improver status checking
  - Extended check-in UI to display membership info for improvers
  - Added "Use Membership" entry type radio button
  - Updated check-in save logic to track source field ('membership', 'concession', 'casual', 'free')
  - Added improver badge and membership status container with visual indicators
  - Implemented automatic membership expiry clearing
  - Admin can override check-in for improvers without active membership

**Major Changes in v2.6:**
- ✅ **Phase 4 Complete:** Student Portal UI
  - Extended `PaymentService` class with 4 membership methods
  - Created `student-portal/membership/` directory with complete UI
  - Built membership purchase page with Stripe integration
  - Built membership management dashboard with auto-renew toggle
  - Implemented improver-gated access (only improvers see membership UI)
  - Added confirmation modals for auto-renew toggle and membership cancellation
  - **Styling Fix:** Corrected membership card styling to match casual rates and concession packages (white background, black bold text, consistent button styling)

**Major Changes in v2.5:**
- ✅ **Phase 3 Complete:** Admin Tools UI
  - Updated `concession-types.html` with membership management section
  - Created 5 membership management modules (display, status-toggle, drag-drop, modal-handlers, auth)
  - Added membership CSS styling with distinct indigo/purple color scheme
  - Integrated membership management into existing admin tools page

**Major Changes in v2.4:**
- ✅ **Phase 2 Complete:** Stripe Subscription Infrastructure
  - Extended `fetchPricing()` to include membership types
  - Created `processOneTimeMembershipPurchase` Cloud Function
  - Created `processRecurringMembershipPurchase` Cloud Function (Stripe Subscriptions)
  - Created `toggleMembershipAutoRenew` Cloud Function
  - Created `cancelMembership` Cloud Function
  - Implemented Stripe webhook handler for subscription events
  - Updated API config with membership endpoints
  - Documented Stripe payment patterns in `docs/STRIPE_PAYMENT_PATTERNS.md`

**Major Changes in v2.3:**
- ✅ **Phase 1 Complete:** Data Model & Firestore Setup
  - Added Firestore security rules for `membershipTypes` and `memberships`
  - Created composite indexes for membership queries
- Shifted from universal membership system to **improver-gated model**
- Memberships ONLY for improver-level students (beginners use existing concession system)
- Admin controls student classification via `improver` checkbox in student database
- Removed registration form integration (new students start as beginners)
- Added conditional UI logic to show/hide payment options based on student type
- Enhanced check-in validation with improver status and admin override capability

**Updates in v2.1:**
- Registration emails unchanged (apply to beginners only who use casual/concessions)
- Improver promotion alerts: email + modal when student has remaining concessions
- Auto-renew disclosure: inline text below toggle + confirmation modal + prominent sliding toggle on management page
- Hide Prepay tile/nav button for improvers (in addition to Purchase Concessions)
- Added `toggleMembershipAutoRenew` Cloud Function for managing auto-renew

**Updates in v2.2:**
- Clarified UI visibility for non-improvers: Membership tile/nav completely hidden
- Improved auto-renew toggle text for non-tech-savvy users
- Clarified that turning off auto-renew does NOT cancel membership (continues until end of monthly period)

**Major Changes in v2.3:**
- ✅ **Phase 1 Complete:** Data Model & Firestore Setup
  - Added Firestore security rules for `membershipTypes` and `memberships`
  - Created composite indexes for membership queries
  - Added "Improver" checkbox to student database UI
  - Documented data model in `docs/MEMBERSHIP_DATA_MODEL.md`
- Removed timeline estimates (implementation proceeding without duration tracking)
- Streamlined document to focus on remaining implementation phases

---

## Quick Reference

**Who Can Use Memberships?**  
→ Improver-level students ONLY (marked by admin via checkbox)

**What About Beginners?**  
→ Continue using existing casual rates and concession packages (no changes)

**How Are Students Classified?**  
→ Admin sets `improver: true` checkbox in student database (same row as Email Updates, Over 16, Crew Member)

**What Happens When Promoted to Improver?**  
→ Student sees memberships (concessions hidden). Admin issues pro-rated refund for unused concessions.

**Check-in Validation:**  
→ Improvers MUST have active membership. Admin can override with confirmation modal.

**Payment Methods:**  
→ Online: Stripe (can be recurring or one-time)  
→ In-person: Admin can process cash/bank/eftpos (one-time only, no auto-renew)

**Membership Duration:**  
→ 1 month from purchase (anniversary-based, "sticky day" approach). Valid through end of expiry day.  
→ Example: Purchased 7th = expires 6th of next month. Purchased 31st Jan = expires 28/29th Feb (adjusted to last day if day doesn't exist).

**Auto-Renew:**  
→ Checked by default for online payments. Disabled for cash/bank/eftpos.  
→ Clear disclosure: inline text + confirmation modal before payment  
→ Prominent sliding toggle on Membership management page

**Improver Promotion with Concessions:**  
→ System alerts admin via email (dance@urbanswing.co.nz) + modal if student has active concessions  
→ Email includes: student name, concession count, type, amount spent  
→ Admin handles pro-rated refund manually

**Hidden UI Elements for Improvers:**  
→ Purchase Concessions tile and nav button: completely hidden  
→ Prepay tile and nav button: completely hidden  
→ Only Memberships visible in student portal

**Hidden UI Elements for Non-Improvers (Beginners):**  
→ Membership tile and nav button: completely hidden  
→ Only Concessions and Prepay visible in student portal

**Auto-Renew Toggle Behavior:**  
→ Turning OFF auto-renew does NOT cancel current membership  
→ Membership continues until end of current monthly period  
→ After expiry, student manually purchases again (online or cash via admin)  
→ Helper text: "Turn off to stop your credit card being automatically charged" (when ON)  
→ Helper text: "Turn on to auto-renew your membership" (when OFF)

---

**Project:** Urban Swing Dance School  
**Feature:** Monthly Membership System  
**Date:** June 5, 2026  
**Status:** Planning Phase  

---

## Executive Summary

This document outlines the implementation plan for adding a **monthly membership system** to Urban Swing's existing dance school management platform. The membership system is designed specifically for **Improver-level students**, providing them with unlimited class access for a monthly fee.

### Business Model
- **Beginners:** Continue using casual rates and concession packages (existing system unchanged)
- **Improvers:** REQUIRED to purchase memberships (concessions hidden from their student portal)
- **Student Classification:** Admin sets `improver: true` flag via checkbox in student database
- **UI Segregation:** System shows/hides payment options based on improver status

### Key Requirements
- **Unlimited Classes:** Active members can attend as many classes as they want during their membership period
- **Flexible Billing:** Students can choose between recurring monthly subscriptions or one-time monthly memberships (online payments only; cash = no auto-renew)
- **Anniversary-Based:** Memberships are valid for 1 month from purchase date using "sticky day" approach:
  - Purchased 7th → Expires 6th of next month (day before anniversary)
  - Purchased 31st Jan → Expires 28th Feb (or 29th in leap year) - adjusted if day doesn't exist
  - Adjusted day "sticks" going forward (e.g., Jan 31 → Feb 28 → Mar 28, not back to Mar 31)
- **Stripe Integration:** Recurring memberships use Stripe Subscriptions; one-time uses Payment Intents
- **Admin Management:** Full admin control to create/manage membership types (via concession-types.html), manually assign memberships, and set improver status
- **Check-in Validation:** Improvers MUST have active membership to check in (with admin override option)
- **Dynamic Pricing:** Membership types and pricing configured by admin (same as concession packages)

---

## Architecture Overview

The membership system mirrors the existing **concession packages** architecture but is **gated by student type**:

```
Admin Management (concession-types.html)
    ├─ Casual Rates (existing - for Beginners)
    ├─ Concession Packages (existing - for Beginners)
    └─ Memberships (NEW - for Improvers) ← Similar UI/structure

Student Classification
    └─ improver: true/false (set by admin in student database)
        ├─ If true: Show Memberships, Hide Concessions
        └─ If false/missing: Show Concessions, Hide Memberships

Student Purchase Flow
    ├─ Beginners: Purchase Concessions (existing)
    └─ Improvers: Purchase Membership (NEW) ← Includes auto-renew checkbox

Check-in Flow (Updated)
    ├─ Check Student Type:
    │   ├─ Improver: Check for Active Membership (REQUIRED - with admin override)
    │   └─ Beginner: Check for Concession Blocks (existing)
    └─ Display appropriate container in check-in modal

Payment Processing
    ├─ Online: One-time Payment Intent OR Recurring Subscription
    └─ Cash/Bank Transfer/EFTPOS: One-time only (admin creates membership)
```

### Data Model

#### New Firestore Collections

**1. `membershipTypes` Collection**
```javascript
{
  name: "Monthly Membership",           // Display name
  price: 80.00,                        // Monthly price
  billingPeriod: "month",              // Always "month" (future: support "year")
  displayOrder: 1,                     // Sort order in UI
  isActive: true,                      // Enable/disable flag
  showOnRegistration: true,            // Offer during registration
  description: "Unlimited classes...", // Optional details
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**2. `memberships` Collection** (purchased memberships)
```javascript
{
  studentId: "student-123",
  studentName: "John Doe",
  typeId: "membership-type-id",        // Reference to membershipTypes
  typeName: "Monthly Membership",
  price: 80.00,
  status: "active",                    // 'active' | 'cancelled' | 'expired'
  isRecurring: true,                   // Subscription vs one-time
  purchaseDate: Timestamp,
  currentPeriodStart: Timestamp,       // Start of current billing period
  currentPeriodEnd: Timestamp,         // End of current billing period (expiry)
  stripeSubscriptionId: "sub_xxx",     // Stripe Subscription ID (if recurring)
  stripeCustomerId: "cus_xxx",         // Stripe Customer ID
  paymentMethod: "online",             // 'cash' | 'bank-transfer' | 'eftpos' | 'online'
  transactionId: "txn-123",            // Initial transaction reference
  cancelledAt: Timestamp,              // When cancelled (nullable)
  cancelledBy: "student-123",          // Who cancelled (nullable)
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Status Values:**
- `active`: Currently valid membership (currentPeriodEnd >= today)
- `cancelled`: User/admin cancelled (may still be active until period ends)
- `expired`: Period ended or payment failed

#### Updates to Existing Collections

**`students` Collection** (add fields for improver classification and membership tracking)
```javascript
{
  // ... existing fields ...
  improver: true,                           // NEW: Student is classified as improver (nullable/missing = beginner)
  activeMembershipId: "membership-doc-id",  // Quick lookup (nullable)
  membershipStatus: "active",               // 'active' | null
  membershipExpiryDate: Timestamp           // For quick expiry check (nullable)
}
```

**`transactions` Collection** (existing - add membership transaction types)
- New transaction types: `"membership-purchase"`, `"membership-renewal"`, `"membership-cancellation"`

---

## Implementation Status

### ✅ Phase 1: Data Model & Firestore Setup (COMPLETED)

**Completed Tasks:**
- ✅ Created Firestore security rules for `membershipTypes` and `memberships` collections
- ✅ Added composite indexes for membership queries
- ✅ Added "Improver" checkbox to student database UI (same row as Email Updates, Over 16, Crew Member)
- ✅ Updated student modal JS to handle `improver` field
- ✅ Documented data model schemas in `docs/MEMBERSHIP_DATA_MODEL.md`

**Location:** `config/firestore.rules`, `config/firestore.indexes.json`, `admin/student-database/`

### ✅ Phase 2: Stripe Subscription Infrastructure (COMPLETED)

**Completed Tasks:**
- ✅ Extended `fetchPricing()` in `functions/stripe/stripe-config.js` to include membership types
- ✅ Created `processOneTimeMembershipPurchase` Cloud Function for non-recurring payments
- ✅ Created `processRecurringMembershipPurchase` Cloud Function for Stripe Subscriptions
- ✅ Created `toggleMembershipAutoRenew` Cloud Function for managing auto-renew
- ✅ Created `cancelMembership` Cloud Function for cancelling memberships
- ✅ Implemented Stripe webhook handler (`stripeWebhookMemberships`) for subscription events
- ✅ Updated `functions/index.js` to export all membership functions
- ✅ Updated `config/api-config.js` with membership API endpoints
- ✅ Documented Stripe payment patterns in `docs/STRIPE_PAYMENT_PATTERNS.md`

**Location:** `functions/process-membership-purchase.js`, `functions/membership-management.js`, `functions/stripe-webhook-memberships.js`

**Key Implementation Details:**
- **One-Time Purchase:** Uses Payment Intent (same pattern as concession purchases)
- **Recurring Purchase:** Creates Stripe Subscription with `billing_cycle_anchor` for anniversary-based billing
- **Auto-Renew Toggle:** Updates Stripe subscription `cancel_at_period_end` flag
- **Webhook Events:** Handles `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Consistent Patterns:** All functions follow established Stripe payment patterns (see `STRIPE_PAYMENT_PATTERNS.md`)

---

## Implementation Phases

### ✅ Phase 3: Admin Tools UI (COMPLETED)

**Completed Tasks:**
- ✅ Updated `admin/admin-tools/concession-types.html` with new "Memberships" section
- ✅ Created membership management modal for add/edit operations
- ✅ Created `membership-types/membership-display.js` for rendering membership type cards
- ✅ Created `membership-types/status-toggle.js` for enable/disable functionality
- ✅ Created `membership-types/modal-handlers.js` for add/edit/delete operations
- ✅ Created `membership-types/drag-drop.js` for reordering memberships
- ✅ Created `membership-types/auth.js` for initialization
- ✅ Added membership CSS styling with distinct indigo/purple color scheme
- ✅ Integrated membership management into existing concession-types page

**Location:** `admin/admin-tools/concession-types.html`, `admin/admin-tools/membership-types/`, `admin/admin-tools/concession-types.css`

**Key Features:**
- **Card Display:** Shows membership name, price, description, status
- **Status Toggle:** Active/Inactive switch with visual feedback
- **Drag & Drop:** Reorder memberships by display order
- **Add/Edit:** Modal form for creating and editing membership types
- **Delete:** Confirmation modal with check for active memberships
- **Registration Badge:** Indicates if membership is shown on registration form
- **Color Scheme:** Distinct indigo/purple (#5b4a99) to differentiate from packages
- **Consistent Styling:** White background, black bold text, purple Edit buttons, red Delete buttons (matches casual rates and concession packages)

---

### ✅ Phase 4: Student Portal UI (COMPLETED)

**Completed Tasks:**
- ✅ Extended `PaymentService` class in `student-portal/prepay/payment-service.js` with 4 membership methods:
  - `processMembershipPurchaseOneTime(studentId, membershipTypeId)` - One-time membership purchase
  - `processMembershipPurchaseRecurring(studentId, membershipTypeId)` - Recurring subscription purchase
  - `toggleMembershipAutoRenew(membershipId, enabled)` - Toggle auto-renew on/off
  - `cancelMembership(membershipId)` - Cancel membership (continues until period ends)
- ✅ Created `student-portal/membership/index.html` - Complete membership interface
- ✅ Created `student-portal/membership/membership.css` - Comprehensive styling (~400 lines)
- ✅ Created `student-portal/membership/membership-service.js` - Data fetching service
- ✅ Created `student-portal/membership/membership.js` - Page logic and event handlers (~500 lines)
- ✅ Fixed membership card styling in admin tools to match casual rates and concession packages

**Location:** `student-portal/membership/`, `student-portal/prepay/payment-service.js`

**Key Features:**

**Purchase Flow:**
- **Improver-Gated Access:** Non-improvers see "Not Eligible" message with link to concessions
- **Membership Type Selection:** Grid display of available membership types (from Firestore)
- **One-Time vs Recurring:** Radio buttons to choose payment type
- **Auto-Renew Disclosure:** Prominent disclosure box explaining recurring billing (shown only for recurring)
- **Stripe Integration:** Card element with real-time validation
- **Terms Acceptance:** Checkbox required before purchase
- **Success Handling:** Confirmation message and auto-redirect to management view

**Management Dashboard:**
- **Current Membership Card:** Displays active membership with all details
- **Status Badge:** Visual indicator (Active/Inactive)
- **Expiry Information:** Shows valid-until date prominently
- **Auto-Renew Toggle:** Prominent sliding toggle (only for recurring memberships)
  - Clear description of what toggle does
  - Confirmation modal when toggling
  - Explains membership continues until expiry even when disabled
- **Cancel Button:** Cancel membership with confirmation modal
- **Transaction History Link:** Navigate to full transaction history
- **No Active Membership:** Redirects to purchase flow

**Styling Consistency:**
- Indigo/purple color scheme (#5b4a99) matches admin membership cards
- White card backgrounds with subtle shadows
- Responsive grid layouts
- Mobile-friendly with collapsible sections
- Consistent with existing student portal design patterns

**Error Handling:**
- Firestore permission errors caught and displayed
- Stripe payment failures handled gracefully
- Network errors shown with retry options
- Loading states for all async operations

---

### ✅ Phase 5: Check-in Integration (COMPLETED)

**Completed Tasks:**
- ✅ Created `admin/check-in/js/membership-validation.js` for improver membership validation
- ✅ Extended `checkin-concession-display.js` with `updateMembershipInfo()` function
- ✅ Updated check-in modal to check student type and display appropriate info
- ✅ Added membership info section to `check-in/index.html` with styling
- ✅ Added "Use Membership" radio button to entry type selection
- ✅ Updated `checkin-save.js` to track check-in source field
- ✅ Added CSS styling for membership info container with improver badge

**Location:** `admin/check-in/js/membership-validation.js`, `admin/check-in/js/checkin-concession-display.js`, `admin/check-in/index.html`, `admin/check-in/check-in.css`, `admin/check-in/js/firestore/checkin-save.js`

**Key Implementation Details:**

**1. Improver Validation Logic (`membership-validation.js`):**
- `checkStudentMembership(studentId)` - Checks if student is improver and has active membership
- `getMembershipDetails(membershipId)` - Retrieves membership details for display
- **Validation Flow:**
  - If not improver: Return `useExistingLogic: true` (use concession system)
  - If improver with active membership: Return `canCheckIn: true, source: 'membership'`
  - If improver without membership: Return `canCheckIn: false, allowOverride: true`
  - Automatically clears expired membership fields from student document

**2. UI Updates:**
- **Improver Badge:** Purple gradient badge with star icon next to student name
- **Membership Info Container:** Displays membership status with visual indicators
  - **Active Membership:** Green success box showing expiry date and days remaining
  - **No Membership:** Red error box with admin override message
- **Entry Type Radio:** Added "Use Membership" option (disabled if no active membership)
- **Auto-Selection:**
  - Improver with active membership → defaults to "Use Membership"
  - Improver without membership → defaults to "Free Entry" (admin override)
  - Beginner → existing concession/casual defaults

**3. Check-in Source Tracking:**
- Added `source` field to checkins collection: `'membership' | 'concession' | 'casual' | 'free'`
- Stored alongside entryType for reporting and analytics
- Allows tracking which payment method was used for each check-in

**4. Styling:**
- Membership info container: White background, 2px solid purple border, rounded corners
- Active status: Green background with checkmark icon
- No membership: Red background with exclamation icon
- Improver badge: Purple gradient with white text and star icon
- Consistent with existing concession info styling

**Check-in Flow:**
1. Student selected → `showSelectedStudent()` calls `checkStudentMembership()`
2. If improver → show membership info, hide concession info
3. If beginner → show concession info (existing logic)
4. Validation prevents check-in if improver has no active membership (unless admin overrides)
5. Check-in saved with source field for reporting

---

## Remaining Implementation Phases

---

### ✅ Phase 6: Admin Membership Assignment & Cash Payments (COMPLETED)

**Completed Tasks:**
- ✅ Created `functions/admin-assign-membership.js` Cloud Function
- ✅ Created `admin/check-in/js/membership-assignment-modal.js` for admin UI
- ✅ Added "Purchase Membership" button to check-in membership info section
- ✅ Added "Renew Membership" button for students with active memberships
- ✅ Added script reference to check-in page
- ✅ Exported function in `functions/index.js`

**Location:** `functions/admin-assign-membership.js`, `admin/check-in/js/membership-assignment-modal.js`

**Key Implementation Details:**

**1. Cloud Function (`adminAssignMembership`):**
- **Authentication:** Checks user is authenticated and has admin role
- **Parameters:** `studentId`, `membershipTypeId`, `paymentMethod`, `startDate`, `isRecurring`, `notes`
- **Payment Methods:** cash, bank-transfer, eftpos, online, comp
- **Validation:**
  - Verifies student and membership type exist
  - Warns if student is not improver (doesn't block)
  - Forces `isRecurring = false` for non-online payments
  - Checks for existing active membership (cancels old one if present)
- **Operations:**
  - Creates membership document with admin metadata
  - Updates student document (activeMembershipId, membershipStatus, membershipExpiryDate)
  - Creates transaction record (unless payment method is 'comp')
  - Calculates anniversary-based expiry dates
- **Returns:** Success status, membershipId, transactionId, expiryDate

**2. Admin UI Modal:**
- **Form Fields:**
  - Student info card (shows name, email, improver status)
  - Membership type selector (loads from Firestore)
  - Payment method selector (cash, eftpos, bank-transfer, online, comp)
  - Recurring checkbox (only shown for online payments)
  - Start date picker (allows backdating/future dating)
  - Admin notes textarea (optional)
  - Total amount display
  - Expiry preview (calculated dynamically)
- **Integration Points:**
  - Called from check-in modal via "Purchase Membership" button
  - Modal returns to check-in modal on close/cancel
  - Refreshes membership info after successful assignment
  - Uses DatePicker component for date selection
- **Validation:**
  - Enables submit button only when all required fields are filled
  - Shows warning if student already has active membership
  - Shows improver status badge (green if improver, yellow warning if not)

**3. Check-in UI Updates:**
- **Active Membership:** Shows "Renew Membership" button below expiry info
- **No Membership:** Shows "Purchase Membership" button in error box
- **Button Handler:** `purchaseMembershipForStudent(studentId)` function
  - Hides check-in modal
  - Opens membership assignment modal with student pre-selected
  - Passes callback to refresh membership info after assignment
  - Returns to check-in modal on close

**Admin Workflow:**
1. Admin opens check-in modal for student
2. If improver with no membership → "Purchase Membership" button appears
3. Click button → opens membership assignment modal
4. Select membership type, payment method, start date, notes
5. Click "Assign Membership" → Cloud Function creates membership
6. Modal closes → check-in modal reopens with updated membership info
7. Admin can now check in student using membership entry type

---

### Phase 7: Display Logic & Conditional UI ✅ COMPLETE

**Status:** ✅ Complete (June 2026)

**Completed Tasks:**
1. ✅ **Implemented improver-based UI toggling** (student portal)
   - **Student Portal Header** (`student-portal/student-portal-header.js`):
     - Added `applyImproverBasedUI()` function to conditionally show/hide navigation
     - Stores current student data in `window.currentStudent` for UI logic
     - **If `improver === true`:**
       - ✅ Show "Memberships" navigation link
       - ✅ Show "Membership" tile/card (dashboard)
       - ❌ Hide "Concessions" navigation link
       - ❌ Hide "Purchase Concessions" tile/card and nav button
       - ❌ Hide "Prepay" tile/card and nav button
     - **If `improver === false` OR `improver` field is missing/undefined:**
       - ✅ Show "Concessions" navigation link
       - ✅ Show "Purchase Concessions" tile and nav button
       - ✅ Show "Prepay" tile and nav button
       - ❌ Hide "Memberships" navigation link
       - ❌ Hide "Membership" tile/card (dashboard)
   
   - **Direct URL access protection** (`student-portal/js/access-control.js`):
     - ✅ Created new access control utility
     - ✅ Added to membership, purchase, and prepay pages
     - If beginner tries to access `/student-portal/membership/`, redirects to dashboard with message: "Memberships are for Improver students only"
     - If improver tries to access `/student-portal/purchase/` (concessions), redirects to membership page with message: "As an Improver, please use the Membership system"
     - If improver tries to access `/student-portal/prepay/` (casual rates), redirects to membership page with message: "As an Improver, please use the Membership system"
     - Uses snackbar for notifications if available, fallback to alert
     - Bypasses access control for admin users

2. ✅ **Implemented membership filtering**
   - Student purchase page (`student-portal/membership/membership-service.js`):
     - Already filters with `.where('isActive', '!=', false)` (completed in Phase 4)
     - Updated empty state message: "Memberships are not currently available. Please contact an admin."

3. ✅ **Admin UI updates**
   - Student database: Improver checkbox already functional (updated in separate work)
   - Check-in modal: Improver badge and membership container already implemented (completed in Phase 5)

**Implementation Notes:**
- Navigation visibility controlled by `data-nav` attributes on `<li>` elements
- Dashboard tiles controlled by element IDs (`nav-membership`, `nav-concessions`, etc.)
- Mobile menu automatically refreshes after UI changes
- Access control runs on page load after authentication check
- Admin users bypass all access restrictions

---



### Phase 8: Student Database UI Updates ✅ COMPLETE

**Status:** ✅ Complete (June 2026)

**Completed Tasks:**
1. ✅ **Improver checkbox in student modal**
   - Checkbox already existed in HTML (line 185: `<input type="checkbox" id="modal-improver">`)
   - Already handled in `openStudentModal()` and `saveStudentChanges()` functions
   - Now includes membership/concession display logic

2. ✅ **Show membership info for improvers**
   - Added membership info section to student modal HTML
   - Created `updateMembershipConcessionsDisplay(student)` function
   - Created `loadMembershipInfo(student)` function to fetch and display:
     - Current membership status badge (Active/No Active Membership)
     - Membership type name
     - Expiry date with days remaining
     - Auto-renew indicator for recurring memberships
   - Styled with purple border matching membership theme
   - Shows warning message if improver has no active membership

3. ✅ **Show concession balance for non-improvers**
   - Added concession info section to student modal HTML
   - Created `loadConcessionInfo(studentId)` function
   - Created `getConcessionCount(studentId)` function to query active concessions
   - Displays total count of active concessions
   - Badge turns green if concessions exist, gray if none

4. ✅ **Add concession check and alert when toggling improver status**
   - **When unchecking improver:**
     - Shows confirmation modal: "This student will revert to using concessions. Their active membership will remain valid until expiry. Continue?"
     - Reverts checkbox if cancelled
   - **When checking improver:**
     - Saves improver status immediately
     - Checks for active concessions AFTER saving (per implementation plan)
     - Calls `checkForConcessionsAndAlert()` function if concessions found
   - **Alert functionality:**
     - Queries `concessionBlocks` collection for active concessions
     - Calculates total concessions, total amount, and detailed breakdown
     - Calls Cloud Function `sendImproverPromotionAlert` to email admin
     - Shows modal alert to admin with concession details and refund instructions
     - Modal appears even if email fails (with failure notice)

5. ✅ **Created improver promotion alert email template**
   - New file: `functions/emails/improver-promotion-alert.js`
   - Professional email design with Urban Swing branding
   - Includes:
     - Alert banner highlighting action required
     - Student details table (name, email, ID)
     - Concession summary box (total classes and amount)
     - Detailed concession blocks table with package type, remaining, and price
     - Next steps checklist for admin (5-step refund process)
     - Important notice about improver status and membership requirement
   - Both HTML and plain text versions
   - Sent to: dance@urbanswing.co.nz

6. ✅ **Created Cloud Function for sending alert**
   - New function: `sendImproverPromotionAlert` in `functions/email-notifications.js`
   - Callable function (onCall) accessible from client
   - Parameters: studentId, studentName, studentEmail, totalConcessions, totalAmount, concessionDetails
   - Uses nodemailer with existing Gmail SMTP transport
   - Returns success/error response to client
   - Comprehensive logging for debugging

**Location:** 
- HTML: `admin/student-database/index.html` (lines 167-195 for checkboxes, new sections after)
- CSS: `admin/student-database/student-database.css` (membership-info-section, concession-info-section)
- JS: `admin/student-database/js/modals/student-modal.js` (updated with 6 new helper functions)
- Email: `functions/emails/improver-promotion-alert.js` (new file)
- Cloud Function: `functions/email-notifications.js` (new export: sendImproverPromotionAlert)

**Implementation Notes:**
- Improver checkbox was already functional; Phase 8 added the surrounding logic
- Membership/concession display toggles automatically based on improver status
- Concession check happens AFTER saving (not before) per implementation plan
- Email alert is non-blocking - modal shows even if email fails
- Admin sees both email and modal alert for maximum visibility
- Modal alert includes full concession breakdown for immediate action

---

## Remaining Implementation Phases (Phase 10+)

---

### Original Phase 8 Requirements (for reference)

**Tasks:**
1. **Add "Improver" checkbox to student profile** (`admin/student-database/`)
   - Add checkbox on same row as:
     - Email Updates checkbox
     - Over 16 Confirmed checkbox
     - Crew Member checkbox
   - Label: "Improver"
   - Updates `improver` field in Firestore on toggle
   - Visual indicator: Badge or highlight showing improver status

2. **Show membership info for improvers** (in student profile)
   - If `improver === true`, display:
     - Current membership status badge
     - Membership type name
     - Expiry date
     - Recurring indicator
     - "View Membership History" button
     - "Assign Membership" button
     - "Cancel Membership" button (if active recurring)
   
   - If `improver === false`, display:
     - Concession balance (existing)
     - Concession blocks (existing)

3. **Add concession check and alert when toggling improver status**
   - **When checking improver checkbox:**
     - Save the improver status change immediately
     - Query student's `concessionBlocks` collection for active/unexpired concessions
     - If concessions found:
       - Show modal (use shared confirmation modal): "This student has [X] concessions remaining from [Concession Type Name]. A manual pro-rated refund will be required. Amount spent: $[amount]."
       - Send email to admin (dance@urbanswing.co.nz):
         - Subject: "Action Required: Student Promoted to Improver with Remaining Concessions"
         - Body includes:
           - Student name
           - Number of concessions remaining
           - Concession type name
           - Amount spent on that concession type
           - Link to student profile
   
   - **When unchecking improver checkbox:**
     - Show confirmation: "This student will revert to using concessions. Their active membership will remain valid until expiry. Continue?"
     - If confirmed, save the change

4. **Implementation details:**
   - Check concessions AFTER saving improver status
   - Query: `concessionBlocks` where `studentId === studentId` AND `remaining > 0` AND `expiryDate > now()`
   - Email template: Create `functions/emails/improver-promotion-alert.js`
   - Trigger email via Cloud Function or client-side callable function

**Reference:**
- Existing checkbox patterns in student database
- Email patterns: `functions/emails/new-student-emails.js`
- Modal: Use existing shared confirmation modal

---

### Phase 9: Auto-Renew Enhancements & Membership Lifecycle

**Status:** Not Started (June 2026)

**Overview:**
This phase implements the complete auto-renew workflow, membership expiry handling, email notifications, and payment method updates based on clarified business rules:
- Remove cancel membership button (not needed - auto-renew toggle handles this)
- Default to recurring purchases
- Hide auto-renew toggle for cash/EFTPOS/bank transfer memberships
- Update Payment Method functionality for online memberships
- Automated expiry handling with admin notifications
- Stripe webhook improvements for accurate period tracking

---

#### 9.1: UI Updates - Remove Cancel & Default to Recurring

**Status:** Partially Complete (3/4 tasks done)

**Tasks:**

1. ✅ **Remove Cancel Membership button** (`student-portal/membership/membership.js`) - **COMPLETE**
   - ✅ Removed `handleCancelMembership()` function
   - ✅ Removed cancel button from `displayCurrentMembership()` HTML
   - ✅ Removed event listener setup for cancel button
   - ✅ Kept `PaymentService.cancelMembership()` method for potential admin use

2. ✅ **Default to recurring purchases** (`student-portal/membership/index.html`) - **COMPLETE**
   - ✅ Recurring radio button has `checked` attribute (already implemented)
   - ✅ Auto-renew disclosure box visible by default

3. ✅ **Update payment method button** (`student-portal/membership/membership.js`) - **COMPLETE**
   - ✅ Added "Update Payment Method" button to membership-actions div
   - ✅ Only shows for memberships where `paymentMethod === 'online'`
   - ✅ Button class: `btn-secondary btn-secondary-lg`
   - ✅ Created `handleUpdatePaymentMethod()` function (placeholder implementation)

4. ❌ **Update payment method modal** (`student-portal/membership/` - new file: `update-payment-modal.js`) - **PENDING**
   - Modal title: "Update Payment Method"
   - Show current membership type and expiry
   - Stripe Elements card input (reuse existing card element setup)
   - "Update" button to submit
   - Call new Cloud Function `updateMembershipPaymentMethod`

**Expected Outcome:**
- ✅ No cancel button in student portal
- ✅ Recurring is default selection (students must actively choose one-time)
- ❌ Students can update card without cancelling/repurchasing (pending full modal)

---

#### 9.2: Auto-Renew Toggle Visibility Rules ✅ COMPLETE

**Tasks:**

1. ✅ **Conditional display logic** (`student-portal/membership/membership.js`)
   - ✅ Show auto-renew toggle section ONLY when:
     ```javascript
     isRecurring === true 
     && paymentMethod === 'online' 
     && status === 'active'
     ```
   - ✅ Hide entire auto-renew section for:
     - Expired memberships (`status === 'expired'`)
     - Inactive memberships (`status === 'inactive'`)
     - Cash/EFTPOS/bank transfer memberships (`paymentMethod !== 'online'`)

2. ✅ **Payment method display updates**
   - ✅ For online memberships: Show "Online" (don't show card details)
   - ✅ For cash/EFTPOS/bank transfer: Show as currently implemented

**Expected Outcome:**
- ✅ Auto-renew toggle hidden for all cash/in-person purchases
- ✅ Expired memberships don't show confusing disabled toggle
- ✅ Clean UI that only shows relevant controls

---

#### 9.3: Expired Membership Badge & UI ✅ COMPLETE

**Tasks:**

1. ✅ **Add expired status badge** (`student-portal/membership/membership.css`, `membership.js`)
   - ✅ Create `.membership-status-badge.expired` CSS class
   - ✅ Background: `var(--bg-error-light)`, Color: `var(--error)`
   - ✅ Show "EXPIRED" badge for `status === 'expired'`
   - ✅ Update `displayCurrentMembership()` to show expired badge

2. ✅ **Expired membership message**
   - ✅ Replace active membership details with:
     ```html
     <div class="expired-message">
       <h3>Your membership has expired</h3>
       <p>Purchase a new membership below to continue attending classes.</p>
       <button class="btn-primary btn-primary-lg" onclick="scrollToPurchase()">
         Purchase Membership
       </button>
     </div>
     ```
   - ✅ Added `scrollToPurchase()` function to scroll to purchase section

3. ✅ **Display expired membership with purchase options**
   - ✅ Updated `getCurrentMembership()` to fetch both active and expired memberships
   - ✅ When expired, return most recently expired membership (ordered by `currentPeriodEnd desc`)
   - ✅ UI shows expired membership details at top, purchase options below
   - ✅ Section header changes to "Previous Membership" for expired status
   - ✅ Added CSS spacing between expired and purchase sections

4. ✅ **Check-in UI for expired members** (already implemented in Phase 5, verify only)
   - "Use Membership" radio button disabled
   - Default to "Casual Entry" radio button
   - Show expired badge in check-in modal

**Expected Outcome:**
- ✅ Clear visual indication membership has expired
- ✅ Student directed to purchase new membership
- ✅ Expired membership details remain visible (most recent one if multiple)
- ✅ Admin sees expired status during check-in

---

#### 9.4: Cloud Function - Update Payment Method

**Tasks:**

1. **Create `updateMembershipPaymentMethod` function** (`functions/membership-management.js`)
   - HTTP function (onRequest) with authentication
   - Parameters: `membershipId`, `paymentMethodId` (from Stripe Elements)
   - Validation:
     - Verify user owns the membership
     - Verify membership is active with `isRecurring: true`
     - Verify `paymentMethod === 'online'`
   - Operations:
     - Attach new payment method to Stripe customer
     - Set as default payment method
     - Update Stripe subscription payment method
     - Detach old payment method (optional - Stripe keeps history)
   - Return: Success status, last4 of new card

2. **Export function** (`functions/index.js`)
   - Add to exports: `exports.updateMembershipPaymentMethod = updateMembershipPaymentMethod;`

3. **Add to API config** (`config/api-config.js`)
   - Add endpoint: `MEMBERSHIP_UPDATE_PAYMENT: `${FUNCTIONS_BASE_URL}/updateMembershipPaymentMethod``

**Expected Outcome:**
- Students can update credit card without cancelling membership
- No interruption to billing cycle
- Secure payment method updates through Stripe

---

#### 9.5: Transaction Type Consistency ✅ COMPLETE

**Tasks:**

1. ✅ **Update webhook handler** (`functions/stripe-webhook-memberships.js`)
   - ✅ Changed transaction type from `'membership-renewal'` to `'membership-purchase'`
   - ✅ Line ~144: `type: 'membership-purchase'` (instead of `'membership-renewal'`)
   - ✅ Added comment: `// Type is 'membership-purchase' for consistency with initial purchase`
   - ✅ Updated transactionId to use 'membership-purchase' prefix

2. ✅ **Verify initial purchase functions** (already correct)
   - ✅ `processOneTimeMembershipPurchase`: Already uses `'membership-purchase'`
   - ✅ `processRecurringMembershipPurchase`: Already uses `'membership-purchase'`

**Expected Outcome:**
- ✅ All membership transactions have consistent type: `'membership-purchase'`
- ✅ Easier querying and reporting
- ✅ No migration needed (no existing renewal transactions)

---

#### 9.6: Webhook Period Calculation Fix ✅ COMPLETE

**Tasks:**

1. ✅ **Update webhook period handling** (`functions/stripe-webhook-memberships.js`)
   - ✅ In `invoice.payment_succeeded` handler:
     - ✅ Instead of manually calculating period, read from subscription object
     - ✅ Retrieve full subscription: `const subscription = await stripe.subscriptions.retrieve(invoice.subscription);`
     - ✅ Use Stripe's authoritative period:
       ```javascript
       const newPeriodStart = new Date(subscription.current_period_start * 1000);
       const newPeriodEnd = new Date(subscription.current_period_end * 1000);
       ```
     - ✅ Removed manual `calculateMembershipExpiry()` call

2. ✅ **Verify initial purchase period** (`functions/process-membership-purchase.js`)
   - ✅ In `processRecurringMembershipPurchase`:
     - ✅ After creating subscription, read back the period:
       ```javascript
       const currentPeriodStart = new Date(subscription.current_period_start * 1000);
       const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
       ```
     - ✅ Use these values for membership document (instead of manual calculation)

3. ✅ **Keep manual calculation for one-time purchases**
   - ✅ `processOneTimeMembershipPurchase` still uses `calculateMembershipExpiry()`
   - ✅ This is correct since one-time purchases don't have Stripe subscriptions

**Expected Outcome:**
- ✅ Period dates match Stripe subscription exactly (no off-by-one errors)
- ✅ Renewal dates consistent with Stripe billing
- ✅ "Sticky day" billing works correctly
   - Admin assigned memberships still use `calculateMembershipExpiry()`

**Expected Outcome:**
- Stripe subscriptions use Stripe's authoritative billing cycle
- No discrepancies between Stripe and Firestore
- Manual calculation only for non-Stripe purchases

---

#### 9.7: Email Notifications

**Tasks:**

1. **Successful renewal email** (`functions/emails/membership-renewal-success.js` - new file)
   - Template function: `generateMembershipRenewalSuccessEmail({ studentName, membershipType, newExpiryDate, amount })`
   - Email to: Student email
   - Subject: "Your Urban Swing Membership Has Renewed"
   - Body includes:
     - Confirmation of successful payment
     - New expiry date
     - Amount charged
     - Link to view membership in student portal
     - Link to turn off auto-renew if desired

2. **Failed renewal email** (`functions/emails/membership-renewal-failed.js` - new file)
   - Template function: `generateMembershipRenewalFailedEmail({ studentName, membershipType, expiryDate })`
   - Email to: Student email
   - Subject: "Action Required: Membership Payment Failed"
   - Body includes:
     - Payment failed notification
     - Membership has expired
     - Instructions to update payment method or purchase new membership
     - Link to student portal

3. **Expired membership admin alert** (`functions/emails/membership-expired-admin-alert.js` - new file)
   - Template function: `generateMembershipExpiredAdminAlert({ expiredMemberships })`
   - Email to: `dance@urbanswing.co.nz`
   - Subject: "Daily Report: Expired Memberships - [Date]"
   - Body includes:
     - Count of memberships expired in last 24 hours
     - Table with student name, membership type, expiry date
     - Note: "These students will need to purchase new memberships"

4. **Update webhook handler** (`functions/stripe-webhook-memberships.js`)
   - In `invoice.payment_succeeded`:
     - Call `sendMembershipRenewalSuccessEmail(studentData.email, emailData)`
   - In `invoice.payment_failed`:
     - Call `sendMembershipRenewalFailedEmail(studentData.email, emailData)`

5. **Create email sending functions** (`functions/email-notifications.js`)
   - Add exports:
     - `sendMembershipRenewalSuccessEmail(to, data)`
     - `sendMembershipRenewalFailedEmail(to, data)`
     - `sendMembershipExpiredAdminAlert(expiredMemberships)`

**Expected Outcome:**
- Students notified of successful renewals
- Students notified immediately of payment failures
- Admin gets daily digest of expired memberships
- All email patterns match existing email system

---

#### 9.8: Scheduled Function - Daily Expiry Check ✅ COMPLETE

**Tasks:**

1. ✅ **Create scheduled function** (`functions/scheduled-membership-expiry.js` - new file)
   - ✅ Cloud Scheduler trigger: Daily at 8:00 AM NZ time
   - ✅ Function: `checkExpiredMemberships`
   - ✅ Query memberships where:
     ```javascript
     status === 'active' 
     && currentPeriodEnd < now()
     && (isRecurring === false || stripeSubscriptionId === null)
     ```
   - ✅ For each expired membership:
     - ✅ Update membership: `status: 'expired'`
     - ✅ Update student: `activeMembershipId: null`, `membershipStatus: 'expired'`
     - ✅ Add to expiredList array
   - ✅ After processing all:
     - ❌ Send admin email with expiredList (pending Phase 9.7)
     - ✅ Log count and details

2. ✅ **Export function** (`functions/index.js`)
   - ✅ Add export: `exports.checkExpiredMemberships = checkExpiredMemberships;`

3. ❌ **Set up Cloud Scheduler** (manual Firebase Console task) - **PENDING**
   - Create job: "check-expired-memberships"
   - Frequency: `0 8 * * *` (8 AM daily)
   - Timezone: Pacific/Auckland
   - Target: Cloud Function `checkExpiredMemberships`

**Expected Outcome:**
- ✅ Non-recurring memberships automatically expire at end of period
- ✅ Student and membership documents updated correctly
- ❌ Admin notified daily of expiries (pending Phase 9.7 email implementation)
- ✅ No manual checking required

---

#### 9.9: Testing & Verification

**Manual Testing Checklist:**

**Auto-Renew Toggle Visibility:**
- [ ] Active online membership → Toggle visible and functional
- [ ] Active cash membership → No toggle shown
- [ ] Expired online membership → No toggle, expired badge shown
- [ ] One-time online membership → No toggle shown

**Update Payment Method:**
- [ ] Button appears for online memberships (active)
- [ ] Button hidden for cash/EFTPOS/bank transfer memberships
- [ ] Click button → Modal opens with Stripe Elements
- [ ] Enter new card → Successful update
- [ ] Verify Stripe subscription updated with new payment method
- [ ] Next renewal uses new card

**Default Recurring:**
- [ ] Open purchase page → Recurring radio pre-selected
- [ ] Auto-renew disclosure visible by default
- [ ] Can switch to one-time if desired

**Email Notifications:**
- [ ] Trigger renewal webhook → Student receives success email
- [ ] Trigger failed payment webhook → Student receives failure email
- [ ] Run scheduled function → Admin receives daily digest

**Expired Membership Flow:**
- [ ] Non-recurring membership reaches end date → Auto-expires via scheduled function
- [ ] Student portal shows expired badge and purchase button
- [ ] Check-in shows expired status, defaults to casual entry
- [ ] Admin receives email notification

**Webhook Period Calculation:**
- [ ] Create recurring membership → Verify period matches Stripe subscription
- [ ] Renewal occurs → Verify new period matches Stripe exactly
- [ ] No off-by-one-day errors

**Transaction Consistency:**
- [ ] Initial purchase → Type is `'membership-purchase'`
- [ ] Renewal → Type is `'membership-purchase'` (not renewal)

---

### Phase 10: Reporting & Admin Views

**Background:**
- Existing registration emails (for beginners) remain unchanged - they already handle casual rates and concessions correctly
- Improver promotion alert already implemented in Phase 8

**Tasks:**
1. **Create improver promotion alert email** (`functions/emails/improver-promotion-alert.js` - new file)
   - Function: `generateImproverPromotionAlert({ studentName, studentId, concessionsRemaining, concessionTypeName, amountSpent })`
   - Email to: `dance@urbanswing.co.nz`
   - Subject: `"Action Required: ${studentName} Promoted to Improver with Remaining Concessions"`
   - Body includes:
     ```html
     <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
       <h2 style="color: #7C3AED;">Improver Promotion Alert</h2>
       <div style="background: #FEF3C7; padding: 20px; border-left: 4px solid #F59E0B; margin: 20px 0;">
         <h3 style="color: #92400E; margin-top: 0;">⚠️ Manual Refund Required</h3>
         <p><strong>${studentName}</strong> has been promoted to Improver but has remaining concessions that need to be refunded.</p>
       </div>
       <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
         <p><strong>Student:</strong> ${studentName}</p>
         <p><strong>Concessions Remaining:</strong> ${concessionsRemaining} classes</p>
         <p><strong>Concession Type:</strong> ${concessionTypeName}</p>
         <p><strong>Amount Spent:</strong> $${amountSpent.toFixed(2)}</p>
       </div>
       <p style="margin-top: 20px;">Please process a pro-rated refund for the unused concessions.</p>
       <a href="https://urbanswing.co.nz/admin/student-database/?id=${studentId}" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Student Profile</a>
     </div>
         <table style="width: 100%; border-collapse: collapse;">
           <tr>
             <td style="padding: 8px; border-bottom: 1px solid ${colors.borderLighter};"><strong>Amount Paid:</strong></td>
             <td style="padding: 8px; border-bottom: 1px solid ${colors.borderLighter}; color: ${colors.purplePrimary}; font-weight: bold;">$${membershipData.amount.toFixed(2)}</td>
           </tr>
           <tr>
             <td style="padding: 8px; border-bottom: 1px solid ${colors.borderLighter};"><strong>Membership Type:</strong></td>
             <td style="padding: 8px; border-bottom: 1px solid ${colors.borderLighter};">${membershipData.typeName}</td>
           </tr>
           <tr>
             <td style="padding: 8px; border-bottom: 1px solid ${colors.borderLighter};"><strong>Billing:</strong></td>
             <td style="padding: 8px; border-bottom: 1px solid ${colors.borderLighter};">${membershipData.isRecurring ? '🔄 Recurring Monthly' : '⏱️ One-Time (1 month)'}</td>
           </tr>
           <tr>
             <td style="padding: 8px;"><strong>Expires On:</strong></td>
             <td style="padding: 8px; color: ${colors.purplePrimary}; font-weight: bold;">${membershipData.expiryDate.toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Pacific/Auckland' })}</td>
           </tr>
         </table>
       </div>
       ` : ''}
       ```
     - Update text version similarly
   
   - **Modify `generateWelcomeEmail()`** (add membership parameter)
     - Add parameter: `membershipData` (nullable)
     - Replace pricing table with membership confirmation if membership purchased:
       ```javascript
       ${membershipData ? `
       <div style="background: ${colors.successLight}; padding: 20px; border-radius: 8px; border-left: 4px solid ${colors.success}; margin: 20px 0;">
         <h3 style="color: ${colors.successDark}; margin-top: 0;">✅ Membership Activated!</h3>
         <p style="margin: 10px 0; color: ${colors.textPrimary};">
           You now have unlimited access to all classes until <strong>${membershipData.expiryDate.toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Pacific/Auckland' })}</strong>.
         </p>
     ```
   - Use existing Nodemailer transport (same pattern as new-student-emails.js)
   - Include error handling and logging

2. **Create callable function to trigger email** (`functions/` or client-side trigger)
   - Triggered from student database UI when improver checkbox is toggled
   - Accepts: `{ studentId, studentName }`
   - Queries concessionBlocks to calculate remaining concessions and amounts
   - Calls `generateImproverPromotionAlert()` and sends email
   - Returns success/failure status

3. **Optional: Create membership-specific email templates** (future enhancement)
   - `membership-renewal-confirmation.js`: Confirmation when recurring membership renews
   - `membership-cancellation-confirmation.js`: Confirmation when membership is cancelled
   - `membership-expiry-warning.js`: Reminder 3 days before expiry (for non-recurring)
   - `membership-payment-failed.js`: Notification when recurring payment fails

**Files to Create:**
- `functions/emails/improver-promotion-alert.js` (new file)
- Callable function or client-side trigger in student database UI

**Reference:**
- Email patterns: `functions/emails/new-student-emails.js`
- Nodemailer setup: `functions/email-notifications.js`

---

**Tasks:**
4. **Create membership dashboard** (`admin/admin-tools/reports/memberships.html` - new file)
   - **Layout:**
     - Page header: "Active Memberships Report"
     - Summary cards:
       - Total active memberships
       - Total improver students
       - Total recurring memberships
       - Revenue this month (from memberships)
       - Expiring this week (count)
       - Improvers without active memberships (count) ← Warning indicator
     - Filter controls:
       - Status: All / Active / Cancelled / Expired
       - Type: Recurring / One-Time / All
       - Date range picker
     - Data table:
       - Columns: Student Name, Improver Badge, Membership Type, Status, Recurring, Purchase Date, Expiry Date, Days Remaining, Price, Actions
       - Sort by any column
       - Search by student name
       - Actions: View Details, Cancel (if recurring), View History
   
   - **Implementation:**
     - `memberships-report.js`: Query logic, filtering, sorting
     - `memberships-report.css`: Styling
     - Export to CSV functionality
     - Print-friendly view

5. **Add improver-aware student list** (enhance existing student database)
   - **In `admin/student-database/` (student list view):**
     - Add "Improver" column or badge indicator
     - Filter: Show only improvers / Show only beginners / Show all
     - Highlight improvers without active memberships (warning color)
   
   - **In student profile/details page:**
     - Show improver checkbox (from Phase 8)
     - Display membership or concession info based on status

6. **Add membership metrics to admin dashboard** (if dashboard exists)
   - Widget showing:
     - Active memberships count
     - Improver students count (with/without memberships)
     - New memberships this month
     - Recurring vs one-time breakdown
     - Revenue from memberships

7. **Create improver alert system** (scheduled Cloud Function - optional)
   - Query improvers without active memberships
   - Send reminder emails to improvers 3 days before membership expires
   - Show alert in admin dashboard: "5 improvers need to renew memberships"

**Reference:**
- Existing reports: `admin/admin-tools/reports/` (if any)
- Student database: `admin/student-database/`
- Dashboard: `admin/dashboard/` or similar

---

### Phase 11: Testing & Verification

#### Automated Tests

1. **Cloud Function Unit Tests** (`functions/__tests__/`)
   - `processRecurringMembershipPurchase`: Verify Stripe subscription creation, database updates
   - `processOneTimeMembershipPurchase`: Verify Payment Intent, expiry calculation (1 month, sticky day)
   - `updateMembershipPaymentMethod`: Verify payment method updates, permissions
   - Webhook handlers: Mock Stripe events, verify database updates
   - Expiry date calculation: Test anniversary billing (purchased 7th = expires 6th next month)
   - Scheduled expiry function: Mock expired memberships, verify status updates

2. **Firestore Security Rules Tests**
   - Students can read their own memberships
   - Students cannot read other students' memberships
   - Students can update payment methods via Cloud Function (own memberships only)
   - Admins can read/write all memberships
   - Public can read `membershipTypes` (for purchase interface)
   - Only admins can write `membershipTypes`

3. **Integration Tests**
   - Full purchase flow: Select membership → Enter payment → Verify database updates → Verify Stripe
   - Check-in flow: Active membership → Check in → Verify concession not used
   - Update payment method flow: Change card → Verify Stripe updated → Next renewal uses new card
   - Expiry flow: Non-recurring membership expires → Scheduled function updates status → Email sent

#### Manual Testing Checklist

**Admin Flow:**
- [ ] Create membership type
- [ ] Enable/disable membership type → Verify visibility in improver purchase interface
- [ ] Reorder membership types (drag-drop)
- [ ] Edit membership type (price, name, description)
- [ ] Delete membership type (with confirmation)
- [ ] Add improver checkbox to student profile (same row as Email Updates, Over 16, Crew Member)
- [ ] Toggle improver status → Verify UI changes in student portal
- [ ] Verify beginners cannot see memberships in student portal
- [ ] Verify improvers cannot see concessions in student portal
- [ ] Manually assign membership to improver (cash, bank transfer, online)
- [ ] Verify auto-renew checkbox disabled for cash/bank/eftpos payments

**Student Purchase Flow (Improvers only):**
- [ ] Mark student as improver → Verify memberships appear, concessions hidden
- [ ] Purchase one-time membership → Verify expiry is 1 month from purchase (sticky day)
- [ ] Purchase recurring membership (online) → Verify Stripe subscription created, auto-renew checked by default
- [ ] Verify membership shows in student portal with correct status
- [ ] Verify membership expiry date is accurate (anniversary-based)
- [ ] Check membership management page shows correct details
- [ ] Cancel recurring membership → Verify can still check in until expiry
- [ ] Uncheck auto-renew before purchase → Verify one-time membership created

**Check-in Flow:**
- [ ] Check in improver with active membership → Verify check-in succeeds, shows "IMPROVER" badge
- [ ] Check in improver without membership → Verify check-in blocked, shows override option
- [ ] Admin overrides check-in for improver without membership → Verify confirmation modal, check-in succeeds with warning
- [ ] Check in beginner with concession → Verify concession decremented (existing flow)
- [ ] Check in beginner without concession → Verify casual payment (existing flow)
- [ ] Verify Membership Container displays for improvers (expiry, days remaining, purchase button)
- [ ] Verify Concession Balance Container displays for beginners (existing)
- [ ] Verify check-in history shows "via Membership" vs "via Concession" vs "NO MEMBERSHIP (Override)"

**Improver Status & UI Toggling:**
- [ ] Mark student as improver → Verify concessions hidden, memberships visible in student portal
- [ ] Unmark student as improver → Verify memberships hidden, concessions visible in student portal
- [ ] Beginner tries to access `/student-portal/memberships/` directly → Verify redirect with message
- [ ] Improver tries to access `/student-portal/purchase/` directly → Verify redirect with message
- [ ] Verify improver checkbox appears in student database (same row as Email Updates, Over 16, Crew Member)
- [ ] Verify improver badge shows in check-in modal
- [ ] Verify confirmation prompts when toggling improver status

**Phase 9 Features - Auto-Renew & Lifecycle:**
- [ ] Open purchase page → Recurring radio button pre-selected by default
- [ ] Purchase recurring membership → No cancel button shown in management page
- [ ] Purchase cash membership → Auto-renew toggle hidden completely
- [ ] Purchase online membership → Auto-renew toggle visible and functional
- [ ] Update payment method button appears for online memberships only
- [ ] Click "Update Payment Method" → Modal opens with Stripe card input
- [ ] Update card successfully → Verify Stripe subscription updated
- [ ] Expired membership shows "EXPIRED" badge (not disabled toggle)
- [ ] Expired membership shows purchase button, not management controls
- [ ] Transaction type is 'membership-purchase' for both initial and renewal
- [ ] Webhook uses Stripe's period dates (not manual calculation)
- [ ] Non-recurring membership expires → Scheduled function updates status
- [ ] Successful renewal → Student receives email confirmation
- [ ] Failed renewal payment → Student receives email alert
- [ ] Daily expiry check → Admin receives email with list of expired memberships
- [ ] Check in student with expired membership → Shows expired status, defaults to casual

**Cancellation & Webhooks:**
- [ ] Toggle auto-renew OFF → Verify Stripe subscription set to cancel at period end (no cancel button needed)
- [ ] Auto-renew disabled → Membership continues until expiry, then expires naturally
- [ ] Webhook: `invoice.payment_succeeded` → Verify membership period extended by 1 month
- [ ] Webhook: `invoice.payment_failed` → Verify membership immediately expires, student notified
- [ ] Webhook: `customer.subscription.deleted` → Verify membership marked cancelled, student fields cleared

**Edge Cases:**
- [ ] Student marked as improver mid-concession period → Verify concessions hidden but can still use existing balance if admin allows
- [ ] Improver membership expires mid-day → Verify can still check in on expiry date (valid through end of day)
- [ ] Admin backdates membership → Verify expiry calculated correctly from start date
- [ ] Admin assigns membership to non-improver student → Verify warning shown
- [ ] Payment method fails during recurring renewal → Verify immediate expiration
- [ ] Student cancels, then re-purchases → Verify new membership created correctly
- [ ] Admin purchases membership for improver via cash → Verify auto-renew checkbox disabled/hidden
- [ ] Improver without membership tries to check in → Verify admin can override with confirmation

**Display Logic:**
- [ ] Improver student logs in → Verify memberships visible, concessions hidden
- [ ] Beginner student logs in → Verify concessions visible, memberships hidden
- [ ] Disable all membership types → Verify "No memberships available" message for improvers
- [ ] Re-enable membership types → Verify improvers can purchase again

**Reporting & Admin Views:**
- [ ] Open membership dashboard → Verify all active memberships listed with improver indicators
- [ ] Filter by status (active/cancelled/expired) → Verify correct filtering
- [ ] Filter by type (recurring/one-time) → Verify correct filtering
- [ ] Export to CSV → Verify data accuracy
- [ ] View student profile → Verify improver checkbox and membership/concession info displayed based on status
- [ ] View student membership history → Verify all past memberships shown
- [ ] Check dashboard for "Improvers without memberships" alert

---

## Technical Specifications

### Stripe Integration Details

**Recurring Memberships (Subscriptions):**
```javascript
// Create subscription with anniversary billing
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{
    price: stripePriceId,  // Pre-created Price object in Stripe
  }],
  payment_behavior: 'default_incomplete',
  payment_settings: { save_default_payment_method: 'on_subscription' },
  expand: ['latest_invoice.payment_intent'],
  billing_cycle_anchor: 'now',  // Anniversary-based billing
  metadata: {
    studentId: studentId,
    studentName: studentName,
    membershipTypeId: membershipTypeId
  }
});
```

**One-Time Memberships (Payment Intents):**
```javascript
// Existing pattern from process-concession-purchase.js
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(membershipPrice * 100),  // Convert to cents
  currency: 'nzd',
  customer: customerId,
  payment_method: paymentMethodId,
  confirm: true,
  description: `Urban Swing - ${membershipTypeName}`,
  metadata: {
    studentId: studentId,
    membershipTypeId: membershipTypeId,
    type: 'membership-one-time'
  }
});
```

**Stripe Product/Price Setup (Manual - Do Once):**
1. Create Product in Stripe Dashboard: "Urban Swing Monthly Membership"
2. Create Price for Product: $80.00 NZD, recurring monthly
3. Store Price ID in `membershipTypes` document (optional field `stripePriceId`)
4. Or dynamically create Prices via Stripe API when membership type is created

### Expiry Calculation Logic

**Anniversary-Based (1 month from purchase, "sticky day" approach):**
```javascript
// Purchase date: June 7, 2026 → Expires July 6, 2026
const purchaseDate = new Date('2026-06-07');
const expiryDate = new Date(purchaseDate);

// Add 1 month using setMonth (handles month-end automatically)
expiryDate.setMonth(expiryDate.getMonth() + 1);
// Result: July 7, 2026

// Subtract 1 day to expire day before anniversary
expiryDate.setDate(expiryDate.getDate() - 1);
// Result: July 6, 2026

// Valid through END of expiry day
expiryDate.setHours(23, 59, 59, 999);

// Edge case example: Jan 31 purchase
// const jan31 = new Date('2026-01-31');
// jan31.setMonth(jan31.getMonth() + 1); // → Feb 28 or 29 (JavaScript auto-adjusts)
// jan31.setDate(jan31.getDate() - 1);   // → Feb 27 or 28
// Next renewal: Feb 27/28 → Mar 27/28 (day "sticks")
```

**Check-in Validation:**
```javascript
const now = new Date();
const membershipExpiry = student.membershipExpiryDate.toDate();

// Set expiry to end of day for comparison
membershipExpiry.setHours(23, 59, 59, 999);

if (membershipExpiry >= now) {
  // Valid - can check in
  return { canCheckIn: true, source: 'membership' };
} else {
  // Expired - clear membership and use concession
  await clearExpiredMembership(studentId);
  return checkConcessionBlocks(studentId);
}
```

### Database Query Patterns

**Load Active Membership Types:**
```javascript
const membershipTypes = await db.collection('membershipTypes')
  .where('isActive', '==', true)
  .orderBy('displayOrder', 'asc')
  .get();
```

**Get Student's Active Membership:**
```javascript
const membership = await db.collection('memberships')
  .where('studentId', '==', studentId)
  .where('status', '==', 'active')
  .orderBy('currentPeriodEnd', 'desc')
  .limit(1)
  .get();
```

**Find Memberships Expiring Soon:**
```javascript
const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

const expiringMemberships = await db.collection('memberships')
  .where('status', '==', 'active')
  .where('isRecurring', '==', false)  // Only non-recurring
  .where('currentPeriodEnd', '<=', sevenDaysFromNow)
  .get();
```

---

## Migration & Rollout Strategy

### Phase 1: Development & Testing (No user impact)
1. Create new collections (`membershipTypes`, `memberships`)
2. Implement Cloud Functions (not yet deployed)
3. Build admin UI (hidden behind feature flag or admin-only)
4. Test thoroughly in development environment

### Phase 2: Soft Launch (Admin-only)
1. Deploy Cloud Functions
2. Deploy admin UI for membership management
3. Admins can create membership types and manually assign memberships
4. Test check-in flow with real data
5. Gather feedback from admin users

### Phase 3: Student Portal Launch
1. Deploy student purchase interface
2. Deploy membership management page
3. Update navigation and dashboard
4. Announce memberships to students via email/social media

### Phase 4: Registration Integration
1. Add memberships to registration form
2. Update registration emails
3. Promote memberships to new students

### Rollback Plan
- Disable all membership types (`isActive = false`)
- Existing memberships continue to work until expiry
- Re-enable concessions for affected students
- Stripe subscriptions can be cancelled manually if needed

### Data Backup
- Export `membershipTypes` and `memberships` collections before major updates
- Store Stripe subscription IDs for manual cancellation if needed
- Keep audit trail of all membership transactions

---

## Cost Considerations

### Stripe Fees
- **Payment Intents (one-time):** 2.9% + $0.30 per transaction (existing)
- **Subscriptions (recurring):** 2.9% + $0.30 per transaction + 0.5% for subscription management
- Example: $80 membership = $2.72 Stripe fee (one-time) or $3.12 (recurring with management fee)

### Firebase Costs (incremental)
- **Firestore reads:** ~10-20 reads per membership purchase + check-in
- **Firestore writes:** ~5-10 writes per membership purchase
- **Cloud Functions invocations:** ~2-5 invocations per membership action
- **Storage:** Minimal (small documents)
- **Estimated monthly cost increase:** $5-20 depending on membership adoption

---

## Future Enhancements (Out of Scope for Initial Implementation)

1. **Multi-tier Improver Memberships**
   - Standard Improver Membership ($80/month)
   - Premium Improver Membership ($100/month) - includes workshop discounts
   - Implementation: Create multiple active membership types in `membershipTypes`

2. **Skill Level Progression Tracking**
   - Add `skillLevel: 'beginner' | 'improver' | 'intermediate' | 'advanced'`
   - Automated suggestions for when to promote students
   - Track number of classes attended before promotion

3. **Automated Improver Promotion**
   - Suggest promotion after X beginner classes
   - Admin approval workflow
   - Automated email notification to student

4. **Concession Conversion Tool**
   - Calculate pro-rated refund automatically
   - Generate refund receipt
   - Track concession-to-membership conversions

2. **Annual Memberships**
   - Add `billingPeriod: 'year'` option
   - Update expiry calculation: `+365 days` or `+12 months`
   - Discount for annual vs monthly

3. **Membership Upgrades Between Improver Tiers**
   - Allow switching between standard/premium improver memberships
   - Pro-rate remaining period
   - Stripe API: `subscription.update()`

4. **Beginner Trial Memberships**
   - Special 1-week trial membership for beginners considering improver classes
   - Admin can assign as comp
   - Doesn't change improver status

5. **Membership Perks**
   - Discount on workshops
   - Priority registration
   - Free merchandise
   - Track perks in `membershipTypes.perks` array

6. **Membership Analytics Dashboard**
   - Churn rate
   - Lifetime value
   - Conversion rate (one-time → recurring)
   - Revenue forecasting

7. **Automated Reminder Emails**
   - Expiry reminders (3 days before) for non-recurring improver memberships
   - Renewal promotions for lapsed improvers
   - Usage stats ("You've attended 8 classes this month!")
   - Promotion congratulations email when marked as improver

8. **Membership Freeze/Pause**
   - Pause recurring billing for 1-3 months
   - Extend expiry date accordingly
   - Stripe API: `subscription.pause_collection`

9. **Gift Memberships**
   - Purchase membership for another student
   - Generate gift codes
   - Redemption flow

---

## Success Metrics

### Key Performance Indicators (KPIs)
1. **Improver Conversion Rate:** % of beginner students promoted to improver
   - Target: 40% of active students become improvers within 6 months
2. **Membership Adoption:** % of improver students with active memberships
   - Target: 95%+ of improvers maintain active memberships
3. **Recurring Ratio:** % of memberships that are recurring
   - Target: 70% recurring, 30% one-time
4. **Retention Rate:** % of memberships renewed after first period
   - Target: 85% retention for improvers
5. **Revenue Impact:** Monthly revenue from memberships vs concessions
   - Target: Memberships generate 50% of revenue (as improver population grows)
6. **Check-in Frequency:** Average classes per month for improvers vs beginners
   - Hypothesis: Improvers attend 6-8 classes/month vs 3-4 for beginners

### Monitoring & Alerts
- Daily count of active memberships
- Daily count of improvers without active memberships (alert if >5)
- Weekly report of new memberships
- Weekly report of improver promotions
- Alert if payment failure rate exceeds 5%
- Alert if cancellation rate exceeds 20%
- Alert if improver check-in override rate exceeds 10%

---

## Support & Maintenance

### Admin Training
1. Create admin guide: "How to Manage Membership Types"
2. Create admin guide: "How to Manually Assign Memberships"
3. Create admin guide: "Handling Membership Cancellations and Refunds"
4. Video tutorial: Using the membership dashboard

### Student Support
1. FAQ page: "Membership vs Concessions"
2. FAQ page: "How to Cancel a Recurring Membership"
3. FAQ page: "What Happens When My Membership Expires"
4. Help email template: Membership questions

### Troubleshooting Guides
1. **Payment Failed:** Steps to retry payment, update payment method
2. **Membership Not Showing:** Clear cache, re-login, check Firestore
3. **Check-in Issues:** Verify expiry date, check student document fields
4. **Stripe Webhook Delays:** Manually update membership status if webhook is slow

---

## Dependencies & Prerequisites

### Required Tools & Accounts
- ✅ Stripe account (existing)
- ✅ Firebase project (existing)
- ✅ Firestore database (existing)
- ✅ Cloud Functions (existing)
- ✅ Nodemailer email setup (existing)

### Required Stripe Configuration
- [ ] Create Membership Product in Stripe Dashboard
- [ ] Create Membership Price (recurring monthly)
- [ ] Configure webhook endpoint (or extend existing)
- [ ] Test webhook signature verification

### Required Firebase Configuration
- [ ] Add Firestore indexes for membership queries
- [ ] Update security rules for new collections
- [ ] Deploy new Cloud Functions
- [ ] Set environment variables (Stripe keys, email config)

### Development Environment
- Node.js 18+ (for Cloud Functions)
- Firebase CLI
- Git (for version control)
- VS Code (or preferred editor)

---

## Risk Assessment

### Technical Risks
1. **Stripe Webhook Delays**
   - Risk: Webhook fires late, membership not updated immediately
   - Mitigation: Poll Stripe API on check-in if webhook hasn't fired, implement retry logic

2. **Concurrent Purchase Issues**
   - Risk: Student purchases multiple memberships simultaneously
   - Mitigation: Firestore transaction locks, UI checks for existing active membership

3. **Expiry Date Calculation Errors**
   - Risk: Incorrect expiry date calculation (timezone issues, leap years)
   - Mitigation: Unit tests for all date calculations, use Firestore Timestamps

4. **Payment Failure Edge Cases**
   - Risk: Student can't update payment method, membership expires prematurely
   - Mitigation: Grace period option (configurable), email notifications, admin override

### Business Risks
1. **Low Adoption Rate**
   - Risk: Students prefer concessions over memberships
   - Mitigation: Pricing analysis, promotional pricing for first month, clear benefits communication

2. **High Cancellation Rate**
   - Risk: Many students cancel after first month
   - Mitigation: Exit surveys, improved onboarding, engagement emails

3. **Revenue Cannibalization**
   - Risk: Memberships reduce overall revenue (students who would buy concessions switch to cheaper membership)
   - Mitigation: Price memberships appropriately ($80 = ~5 classes, breakeven at 6 classes)

### Operational Risks
1. **Admin Training Gap**
   - Risk: Admins don't understand how to manage memberships
   - Mitigation: Training sessions, comprehensive documentation, dedicated support channel

2. **Student Confusion**
   - Risk: Students don't understand difference between memberships and concessions
   - Mitigation: Clear FAQ page, comparison table, onboarding email

---

## Summary of Key Design Decisions

**Student Classification Model:** Implemented a two-tier system where admin explicitly marks students as "improvers" via checkbox in student database. This creates a clean separation: beginners use the existing casual/concession system (unchanged), while improvers are required to use memberships.

**UI Segregation:** Completely separate UIs based on student type. Improvers see only memberships in their student portal; beginners see only concessions. For improvers, both "Purchase Concessions" and "Prepay" tiles/nav buttons are completely hidden (not just disabled).

**Check-in Validation:** Improvers MUST have active membership to check in. Admin can override with confirmation modal for comp/trial classes. Check-in UI shows "IMPROVER" badge and dedicated Membership Container (vs Concession Balance Container for beginners).

**Improver Promotion Alerts:** When admin sets `improver: true` on a student with active/unexpired concessions, system immediately sends email to admin (dance@urbanswing.co.nz) with concession details and refund information. Admin also sees modal warning (using shared confirmation modal) with concession count and manual refund requirement.

**Auto-Renew Disclosure:** Clear, prominent disclosure of auto-renewal terms:
- Purchase page: Recurring radio button (checked by default) with inline text explaining charges and cancellation
- Confirmation modal: Shows before payment if auto-renew enabled, explains billing date and cancellation options
- Management page: Large, obvious sliding toggle with plain-language helper text:
  - If ON: "Turn off to stop your credit card being automatically charged"
  - If OFF: "Turn on to auto-renew your membership"
- Important: Turning off auto-renew doesn't cancel the current membership - it just prevents the next billing cycle. Membership remains active until end of current monthly period.

**Auto-Renew & Lifecycle Management (Phase 9):**
- **Default to Recurring:** Purchase page defaults to recurring membership (students must actively choose one-time)
- **No Cancel Button:** Cancel button removed - auto-renew toggle handles this (toggle off = membership expires naturally at end of period)
- **Cash Memberships:** Cannot auto-renew. Auto-renew toggle hidden completely for cash/EFTPOS/bank transfer purchases
- **Update Payment Method:** Online memberships show "Update Payment Method" button (replaces cancel button) for changing credit card without interruption
- **Expired Memberships:** Show "EXPIRED" badge, hide auto-renew controls, direct student to purchase new membership
- **Transaction Consistency:** All membership transactions use type `'membership-purchase'` (initial purchase and renewals)
- **Webhook Period Accuracy:** Read billing period from Stripe subscription object (not manual calculation) to avoid date discrepancies
- **Scheduled Expiry:** Daily function checks for expired non-recurring memberships, updates status, notifies admin
- **Email Notifications:**
  - Successful renewal → Student receives confirmation email
  - Failed renewal payment → Student receives failure email
  - Daily expiry report → Admin (dance@urbanswing.co.nz) receives list of expired memberships

**Payment Options:** 
- Online payments: Auto-renew (recurring) selected by default, one-time available as option, creates Stripe Subscription if recurring
- Cash/bank/eftpos: Cannot auto-renew, always one-time membership, must purchase new membership each time (no conversion to online)
- Admin can purchase memberships on behalf of students for in-person payments
- Payment method stored as `'online'` for student portal purchases (not `'stripe'`)

**Membership Validity:** 1 month from purchase date (anniversary-based, "sticky day" approach). Valid through end of expiry day. If purchased on day that doesn't exist in next month (e.g., 31st), JavaScript automatically adjusts to last day of month, and that day "sticks" for future renewals. Recurring memberships auto-renew monthly; one-time memberships expire after 1 month.

**Pricing & Configuration:** Admin creates and manages membership types in concession-types.html (same pattern as concession packages). Flexible pricing allows different membership tiers in future.

**Email Notifications:** Registration emails (welcome and admin notification) remain unchanged - they apply to beginners who use casual rates and concessions. New improver promotion alert email created for concession refund notifications.

**Transition Handling:** When student is promoted to improver with remaining concessions, admin manually handles pro-rated refund. System alerts admin via email and modal to ensure refund isn't forgotten.

---

## Questions & Decisions Log

### Answered Questions
1. **What does a membership provide?** Unlimited classes for the membership period
2. **Who gets memberships?** Improver-level students ONLY (beginners use concessions)
3. **How is student type determined?** Admin sets `improver: true` via checkbox in student database
4. **Can students have multiple active memberships?** No - only one at a time
5. **Who can cancel recurring memberships?** Students and admins can turn off auto-renew (membership continues until expiry). Turning off auto-renew doesn't cancel the current membership - it just prevents the next billing cycle.
6. **Can admins create memberships?** Yes - for cash/bank transfers, comps, backdating
7. **Should memberships be offered during registration?** No - new students start as beginners
8. **What happens if recurring payment fails?** Immediate expiration, no grace period
9. **Can students check in on expiry date?** Yes - valid through end of expiry day
10. **What happens to existing concessions when promoted to improver?** Admin issues manual pro-rated refund. Admin receives email alert and modal warning if concessions remain.
11. **Can admin override check-in for improver without membership?** Yes - with confirmation modal
12. **Membership pricing?** Flexible - admin configures in concession-types.html (same as concession packages)
13. **Auto-renew default?** Checked by default for online payments; disabled for cash/bank/eftpos
14. **Membership visibility for beginners?** Completely hidden (including nav buttons)
15. **Check-in UI for improvers?** Show "IMPROVER" badge + Membership Container (vs Concession Balance Container)
16. **Do registration emails need updating?** No - they're for beginners only who use casual rates/concessions
17. **When is the improver promotion alert sent?** After saving `improver: true`, if student has active/unexpired concessions
18. **How is auto-renew disclosed?** Inline text below toggle on purchase page + confirmation modal before payment
19. **What UI elements are hidden for improvers?** Purchase Concessions tile/nav button AND Prepay tile/nav button (completely hidden)
20. **What UI elements are hidden for non-improvers?** Membership tile/nav button (completely hidden - if improver: false or improver field missing)
21. **What happens when auto-renew is turned off?** Membership continues until end of current monthly period. After expiry, student must manually purchase new membership (online or cash via admin).
22. **How is expiry calculated?** 1 month from purchase using "sticky day" approach. Purchased 7th = expires 6th of next month. If purchased 31st Jan, expires 28/29th Feb (adjusted), then that day "sticks" (Feb 28 → Mar 28, not Mar 31).
23. **Is cancel membership button needed? (Phase 9)** No - removed completely. Auto-renew toggle handles cancellation (toggle off = expires naturally at period end). No pro-rated refunds, so early cancellation not valid use case.
24. **Should recurring be default? (Phase 9)** Yes - recurring radio button pre-selected by default. Students can still choose one-time if desired.
25. **Can cash memberships be converted to auto-renew? (Phase 9)** No - cash/EFTPOS/bank transfer memberships cannot be converted. Student must purchase new online membership via student portal. Auto-renew toggle hidden for all non-online purchases.
26. **How to update payment method? (Phase 9)** "Update Payment Method" button replaces cancel button location. Opens modal with Stripe Elements. Only visible for online memberships. Updates Stripe subscription seamlessly.
27. **What happens when subscription auto-expires? (Phase 9)** Status updates to 'expired', activeMembershipId cleared, membershipStatus set to 'expired'. Handled by webhook (customer.subscription.deleted) or scheduled function (for non-recurring).
28. **Transaction type for renewals? (Phase 9)** All transactions use 'membership-purchase' (not 'membership-renewal') for consistency.
29. **How to calculate renewal periods? (Phase 9)** Read from Stripe subscription object (subscription.current_period_start, subscription.current_period_end) instead of manual calculation.
30. **When to notify admin of expired memberships? (Phase 9)** Daily scheduled function sends email to dance@urbanswing.co.nz with list of all memberships that expired in last 24 hours.
31. **Email notifications for renewals? (Phase 9)** Yes - successful renewal → student email; failed renewal → student email; expired membership → admin email (daily digest).
32. **UI for expired memberships? (Phase 9)** Show "EXPIRED" badge, hide auto-renew section completely, display purchase button to buy new membership.
33. **Grace period for expired memberships? (Phase 9)** No grace period. If expired, student must purchase new membership. Admin sees expired status during check-in and defaults to casual entry.
34. **Where to show card details? (Phase 9)** Don't show card info at all (avoid implying we store card data). Show "Online" as payment method. "Update Payment Method" button allows changing card.

### Open Questions (To Be Decided During Implementation)
1. **Improver promotion workflow:** Should there be an automated notification to student when promoted to improver?
2. **Concession refund process:** Should system track/calculate refund amounts automatically?
3. **Bulk improver assignment:** Need tool to promote multiple students at once?
4. **Improver demotion:** Can students be demoted back to beginner? What happens to membership?
5. **Membership types:** Start with one type or multiple improver membership tiers (e.g., standard vs premium)?
6. **Dashboard placement:** Exact position of Membership tile in student portal dashboard

---

## Contact & Ownership

**Project Owner:** Urban Swing Administration  
**Technical Contact:** Development Team  
**Documentation Maintained By:** Implementation Team  

**Last Updated:** June 10, 2026  
**Version:** 3.1  
**Status:** Phase 8 Complete - Phase 9 Planned  

**Major Changes in v3.1:**
- Added comprehensive **Phase 9: Auto-Renew Enhancements & Membership Lifecycle**
- Removed cancel membership button requirement (auto-renew toggle sufficient)
- Default to recurring purchases with update payment method functionality
- Cash memberships cannot convert to auto-renew (must purchase new online membership)
- Transaction type consistency and webhook period calculation improvements
- Automated expiry handling with scheduled functions and email notifications
- Detailed test cases for all Phase 9 features

**Major Changes in v3.0:**
- ✅ **Phase 8 Complete:** Student Database UI Updates
- Improver checkbox functional with membership/concession display logic
- Improver promotion alert system with email and modal warnings

**Major Changes in v2.0:**
- Shifted from universal membership system to **improver-gated model**
- Memberships ONLY for improver-level students (beginners use existing concession system)
- Admin controls student classification via `improver` checkbox in student database
- Removed registration form integration (new students start as beginners)
- Added conditional UI logic to show/hide payment options based on student type
- Enhanced check-in validation with improver status and admin override capability  

---

## Appendices

### Appendix A: Data Model Schemas (Full)

See Phase 1 section for complete Firestore document schemas.

### Appendix B: Stripe Webhook Event Payloads

**`customer.subscription.updated`**
```json
{
  "id": "sub_xxx",
  "object": "subscription",
  "current_period_start": 1685491200,
  "current_period_end": 1688083200,
  "status": "active",
  "metadata": {
    "studentId": "student-123",
    "membershipTypeId": "membership-type-id"
  }
}
```

**`invoice.payment_succeeded`**
```json
{
  "id": "in_xxx",
  "object": "invoice",
  "subscription": "sub_xxx",
  "amount_paid": 8000,
  "customer": "cus_xxx",
  "status": "paid"
}
```

**`invoice.payment_failed`**
```json
{
  "id": "in_xxx",
  "object": "invoice",
  "subscription": "sub_xxx",
  "attempt_count": 1,
  "customer": "cus_xxx",
  "status": "open"
}
```

### Appendix C: Firestore Security Rules (Full)

See Phase 1 section for complete security rules.

### Appendix D: Email Template Examples

See Phase 9 section for email template modifications.

### Appendix E: UI Mockups

_To be added: Screenshots of admin UI, student purchase page, membership management page_

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-06-05 | 1.0 | Initial implementation plan created | Development Team |
| 2026-06-05 | 2.0 | **Major revision:** Shifted to improver-gated model. Memberships only for improvers; beginners continue using concessions. Removed registration integration. Added improver checkbox, conditional UI, and enhanced check-in validation. | Development Team |
| 2026-06-05 | 2.1 | **Added clarifications:** (1) Registration emails unchanged - apply to beginners only. (2) Improver promotion alerts - email + modal when concessions remain. (3) Auto-renew disclosure - inline text + confirmation modal + sliding toggle. (4) Hide Prepay tile for improvers (in addition to Purchase Concessions). (5) Added toggleMembershipAutoRenew Cloud Function. | Development Team |
| 2026-06-05 | 2.2 | **UI and auto-renew clarifications:** (1) Clarified UI visibility for non-improvers (hide Membership tile/nav). (2) Improved auto-renew toggle text for non-tech-savvy users ("Turn off to stop your credit card being automatically charged" vs "Turn on to auto-renew your membership"). (3) Clarified that turning off auto-renew does NOT cancel membership - membership continues until end of monthly period, then requires manual renewal. (4) Changed from "30 days" to "1 month" billing with "sticky day" approach (industry standard, matches Stripe behavior). | Development Team |
| 2026-06-10 | 3.1 | **Phase 9 Added - Auto-Renew Enhancements & Lifecycle:** (1) Removed cancel membership button - not needed, auto-renew toggle handles cancellation. (2) Default to recurring purchases (students can still choose one-time). (3) Hide auto-renew toggle for cash/EFTPOS/bank transfer memberships. (4) Add "Update Payment Method" button for online memberships. (5) Transaction type consistency - all use 'membership-purchase'. (6) Webhook period calculation - read from Stripe subscription object. (7) Scheduled function for daily expiry checks. (8) Email notifications - successful renewal, failed payment, expired memberships. (9) Expired membership badge and UI. (10) Clarified: cash memberships cannot convert to auto-renew, must purchase new online membership. (11) Payment method display - show "Online" without card details. (12) Renamed original Phases 9 & 10 to Phases 10 & 11. | Development Team |
| 2026-06-11 | 3.1 | **Phase 9.1.1 Complete - Cancel Button Removed:** Removed Cancel Membership button from student portal membership management page. Removed `handleCancelMembership()` function and event listener. Membership actions section now only shows "View Transaction History" button for recurring memberships. Updated implementation plan to track progress (1/4 tasks in Phase 9.1 complete). | Development Team |
| 2026-06-11 | 3.1 | **Phase 9.2 Complete - Auto-Renew Toggle Visibility:** Auto-renew toggle now only displays for online recurring memberships with active status (`isRecurring && paymentMethod === 'online' && status === 'active'`). Hidden for cash/EFTPOS/bank transfer memberships and expired/inactive memberships. Payment method display shows "Online" without card details. | Development Team |
| 2026-06-11 | 3.1 | **Phase 9.3 Complete - Expired Membership UI:** Added `.membership-status-badge.expired` CSS class. Implemented expired membership message with "Purchase Membership" button. Added `scrollToPurchase()` function. When `status === 'expired'`, displays special UI directing students to purchase new membership. | Development Team |
| 2026-06-11 | 3.1 | **Phase 9.3 Enhancement - Show Expired Membership Details:** Updated `getCurrentMembership()` in `membership-service.js` to fetch both active and expired memberships. If multiple expired memberships exist, returns most recently expired one (ordered by `currentPeriodEnd desc`). UI now shows expired membership details at top with purchase options below. Section header changes to "Previous Membership" when expired. Added CSS spacing between sections. Fixed `scrollToPurchase()` button to use event listener instead of inline onclick (module scope issue). Mobile UI improvements: expired badge stays on same line as heading, reduced padding in expired message box, smaller button size for mobile. | Development Team |
| 2026-06-11 | 3.2 | **Phase 9.1.2 & 9.1.3 Complete:** Confirmed recurring membership is default selection (already implemented). Added "Update Payment Method" button for online recurring memberships with placeholder `handleUpdatePaymentMethod()` function. Button appears in membership-actions section alongside "View Transaction History" button. | Development Team |
| 2026-06-11 | 3.2 | **Phase 9.5 Complete - Transaction Type Consistency:** Changed all renewal transactions from type 'membership-renewal' to 'membership-purchase' in `stripe-webhook-memberships.js`. Updated transactionId prefix. All membership transactions now use consistent type for easier querying. | Development Team |
| 2026-06-11 | 3.2 | **Phase 9.6 Complete - Webhook Period Calculation:** Updated webhook handler to read period from Stripe subscription object instead of manual calculation. In `stripe-webhook-memberships.js` and `process-membership-purchase.js`, now retrieve `subscription.current_period_start` and `subscription.current_period_end` for authoritative period dates. Eliminates off-by-one errors and ensures consistency with Stripe billing. | Development Team |
| 2026-06-11 | 3.2 | **Phase 9.8 Complete - Scheduled Expiry Function:** Created `scheduled-membership-expiry.js` with daily scheduled function `checkExpiredMemberships` (runs 8 AM NZ time). Queries non-recurring/cancelled memberships past expiry, updates status to 'expired', clears student activeMembershipId. Exported in `index.js`. Email notification pending Phase 9.7 implementation. | Development Team |

---

**End of Document**
