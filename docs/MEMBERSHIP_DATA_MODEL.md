# Membership Data Model

## Overview
This document defines the Firestore data structures for the membership system. The system supports both one-time and recurring monthly memberships for improver-level students.

## Collections

### membershipTypes

Public-readable collection of membership package types available for purchase. Similar structure to `concessionPackages`.

```javascript
{
  name: string,                    // e.g., "Monthly Membership"
  price: number,                   // Price in dollars (e.g., 89)
  billingPeriod: "month",          // Currently only "month" supported
  displayOrder: number,            // Sort order for display
  isActive: boolean,               // Whether this type is available for purchase
  description: string | null,      // Optional description text
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `isActive` (ASC) + `displayOrder` (ASC)

**Security:**
- Read: Public
- Write: Admin/Front-desk only

---

### memberships

Individual membership records for students. Similar to `concessionBlocks` but with subscription support.

```javascript
{
  studentId: string,               // Reference to students collection
  studentName: string,             // Denormalized for quick display
  typeId: string,                  // Reference to membershipTypes
  typeName: string,                // Denormalized membership type name
  price: number,                   // Price paid for this membership
  status: string,                  // "active" | "cancelled" | "expired"
  isRecurring: boolean,            // Auto-renew enabled?
  
  // Dates
  purchaseDate: Timestamp,         // When membership was purchased
  currentPeriodStart: Timestamp,   // Start of current billing period
  currentPeriodEnd: Timestamp,     // End of current billing period (valid through 23:59:59.999)
  
  // Stripe Integration
  stripeSubscriptionId: string | null,  // Null for one-time/non-online payments
  stripeCustomerId: string,             // Stripe customer ID
  
  // Payment
  paymentMethod: string,           // "online" | "cash" | "bank-transfer" | "eftpos"
  
  // Cancellation
  cancelledAt: Timestamp | null,   // When auto-renew was disabled
  cancelledBy: string | null,      // "student" | "admin" | userId
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Status Values:**
- `active`: Membership is currently valid (currentPeriodEnd >= today)
- `cancelled`: Auto-renew disabled, but still valid through currentPeriodEnd
- `expired`: currentPeriodEnd has passed

**Indexes:**
- `studentId` (ASC) + `status` (ASC) + `currentPeriodEnd` (DESC) - For finding student's active membership
- `status` (ASC) + `currentPeriodEnd` (ASC) - For finding expiring memberships

**Security:**
- Read: Student (own records) or Admin/Front-desk
- Write: Admin/Front-desk only

---

### students (Updated Fields)

The following fields are added to the existing `students` collection:

```javascript
{
  // ... existing fields ...
  
  // Membership-related fields
  improver: boolean | null,               // Admin-controlled flag for access level
  activeMembershipId: string | null,      // Reference to active membership document
  membershipStatus: "active" | null,      // Quick status check (null if no membership)
  membershipExpiryDate: Timestamp | null  // Denormalized for quick filtering
}
```

**Notes:**
- `improver` field controls UI visibility: improvers see memberships, beginners see concessions
- Denormalized fields (`activeMembershipId`, `membershipStatus`, `membershipExpiryDate`) are updated by Cloud Functions for performance
- If `improver` is `false` or missing, membership UI is hidden

---

## Data Relationships

```
students (improver: true)
    ↓
    ↓ studentId
    ↓
memberships (status: "active")
    ↓
    ↓ typeId
    ↓
membershipTypes (isActive: true)
```

---

## Billing Cycle Logic

### Monthly Billing
- **Period**: 1 calendar month from purchase
- **Calculation**: JavaScript `setMonth(currentMonth + 1)`
- **Day Handling**: "Sticky day" approach
  - Jan 31 → Feb 28/29 (last day of month)
  - Feb 28 → Mar 28 (maintains day 28)
  - Mar 31 → Apr 30 (last day of month)

### Expiry Time
- Memberships are valid **through the end of the expiry date**
- Valid check: `currentPeriodEnd >= today` (time component: 23:59:59.999)

### Auto-Renewal
- Only available for online payments (Stripe)
- Billing occurs on anniversary date each month
- Subscription managed via Stripe webhooks:
  - `invoice.payment_succeeded` → Extend membership
  - `invoice.payment_failed` → Mark as `cancelled`
  - `customer.subscription.deleted` → Mark as `cancelled`

---

## Phase 1 Implementation Status

✅ **Completed:**
- Firestore security rules added for `membershipTypes` and `memberships`
- Composite indexes created for membership queries
- `improver` checkbox added to student database UI
- Student modal updated to handle `improver` field
- Data model documentation created

**Next Phase:** Stripe integration and Cloud Functions for payment processing
