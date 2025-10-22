# Firestore Security Rules

This document contains the security rules for the Urban Swing check-in system.

## Overview

These rules ensure that:
- Only authenticated admin users can read/write data
- Data validation is enforced at the database level
- Students cannot modify their own check-in or concession data

## Complete Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    // TODO: Implement proper admin role checking
    function isAdmin() {
      return isAuthenticated();
      // In production, check against admin list:
      // return isAuthenticated() && 
      //   get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Students collection - admin read/write only
    match /students/{studentId} {
      allow read, write: if isAdmin();
    }
    
    // Check-ins collection - admin read/write only
    match /checkins/{checkinId} {
      allow read, write: if isAdmin();
      
      // Validate check-in data structure
      allow create: if isAdmin() && 
        request.resource.data.keys().hasAll([
          'studentId', 
          'studentName', 
          'checkinDate', 
          'entryType'
        ]) &&
        request.resource.data.entryType in ['casual', 'concession', 'free'];
    }
    
    // Concession packages collection - admin read/write only
    match /concessionPackages/{packageId} {
      allow read, write: if isAdmin();
    }
    
    // Concession blocks collection - admin read/write only
    match /concessionBlocks/{blockId} {
      allow read, write: if isAdmin();
      
      // Validate concession block data structure on create
      allow create: if isAdmin() &&
        request.resource.data.keys().hasAll([
          'studentId',
          'studentName',
          'packageId',
          'packageName',
          'originalQuantity',
          'remainingQuantity',
          'purchaseDate',
          'status',
          'price',
          'paymentMethod'
        ]) &&
        request.resource.data.status in ['active', 'expired', 'depleted'] &&
        request.resource.data.remainingQuantity >= 0 &&
        request.resource.data.remainingQuantity <= request.resource.data.originalQuantity;
      
      // Validate updates - prevent changing immutable fields
      allow update: if isAdmin() &&
        request.resource.data.studentId == resource.data.studentId &&
        request.resource.data.packageId == resource.data.packageId &&
        request.resource.data.originalQuantity == resource.data.originalQuantity &&
        request.resource.data.purchaseDate == resource.data.purchaseDate;
    }
    
    // Transactions collection (if implemented)
    match /transactions/{transactionId} {
      allow read, write: if isAdmin();
    }
    
    // Admins collection (for role management)
    match /admins/{userId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only modify via Firebase Console or Cloud Functions
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Field Validation Rules

### Concession Blocks

**Immutable Fields (cannot be changed after creation):**
- `studentId` - The student who owns the block
- `packageId` - The package this block came from
- `originalQuantity` - Original number of entries purchased
- `purchaseDate` - When the block was purchased

**Mutable Fields (can be updated):**
- `remainingQuantity` - Decremented on each use
- `status` - Changes from active → expired → depleted
- `expiryDate` - Can be extended by admin if needed
- `notes` - Admin notes about the block

**Business Logic Validation:**
```javascript
// Remaining quantity must be between 0 and original
request.resource.data.remainingQuantity >= 0 &&
request.resource.data.remainingQuantity <= request.resource.data.originalQuantity

// Status must be valid
request.resource.data.status in ['active', 'expired', 'depleted']

// If depleted, remainingQuantity must be 0
request.resource.data.status == 'depleted' implies request.resource.data.remainingQuantity == 0
```

### Check-ins

**Required Fields:**
- `studentId` - Reference to student document
- `studentName` - Display name (denormalized)
- `checkinDate` - Date of check-in
- `entryType` - Must be 'casual', 'concession', or 'free'

**Conditional Fields:**
- `paymentMethod` - Required if entryType is 'casual'
- `freeEntryReason` - Required if entryType is 'free'
- `concessionBlockId` - Required if entryType is 'concession'

## Admin Role Management

### Current Implementation (Development)

All authenticated users are treated as admins:

```javascript
function isAdmin() {
  return isAuthenticated();
}
```

### Production Implementation (Recommended)

Create an `admins` collection with user roles:

**Document structure: `/admins/{userId}`**
```json
{
  "email": "admin@example.com",
  "role": "admin",
  "createdAt": "2024-01-15T10:00:00Z",
  "createdBy": "system"
}
```

**Update security rules:**
```javascript
function isAdmin() {
  return isAuthenticated() && 
    exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
}
```

**Add admin via Firebase Console:**
1. Go to Firestore Database
2. Create collection `admins`
3. Add document with user's UID as document ID
4. Set fields: `email`, `role: "admin"`, `createdAt`

### Role Types (Future Enhancement)

```javascript
{
  "admin": {
    "description": "Full access - manage students, packages, check-ins",
    "permissions": ["read", "write", "delete"]
  },
  "instructor": {
    "description": "Check-in students, view reports",
    "permissions": ["read", "checkin"]
  },
  "viewer": {
    "description": "Read-only access to reports",
    "permissions": ["read"]
  }
}
```

## Deployment

### Via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database → Rules tab
4. Copy the rules from above
5. Click "Publish"

### Via Firebase CLI

1. Update `firebase/firestore.rules` with the rules above
2. Deploy:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Testing Security Rules

### Firestore Rules Simulator

1. Go to Firebase Console → Firestore → Rules tab
2. Click "Firestore Rules Playground"
3. Test queries:
   ```javascript
   // Test as authenticated user
   get /databases/$(database)/documents/students/student123
   
   // Test as unauthenticated user (should fail)
   get /databases/$(database)/documents/students/student123
   ```

### Unit Tests (Optional)

Use `@firebase/rules-unit-testing` package:

```javascript
const firebase = require('@firebase/rules-unit-testing');

describe('Concession blocks security', () => {
  it('allows admins to read blocks', async () => {
    const db = firebase.initializeTestApp({
      projectId: 'test-project',
      auth: { uid: 'admin123' }
    }).firestore();
    
    const doc = db.collection('concessionBlocks').doc('block123');
    await firebase.assertSucceeds(doc.get());
  });
  
  it('denies unauthenticated users', async () => {
    const db = firebase.initializeTestApp({
      projectId: 'test-project'
    }).firestore();
    
    const doc = db.collection('concessionBlocks').doc('block123');
    await firebase.assertFails(doc.get());
  });
});
```

## Common Errors

### "Missing or insufficient permissions"

**Cause:** User is not authenticated or doesn't have admin role

**Solution:**
- Verify user is logged in: `firebase.auth().currentUser`
- Check admin role in Firestore Console
- Ensure rules are deployed correctly

### "Document does not match the required schema"

**Cause:** Trying to create/update document with missing or invalid fields

**Solution:**
- Check all required fields are present
- Verify field types match (string, number, timestamp)
- Ensure status values are valid ('active', 'expired', 'depleted')

### "Cannot modify immutable field"

**Cause:** Trying to update a field that shouldn't change (studentId, purchaseDate, etc.)

**Solution:**
- Only update mutable fields (remainingQuantity, status, notes)
- Use Firestore Console if you need to fix data issues

## Security Best Practices

1. **Never expose Firebase config publicly** (it's in `firebase-config.js` but should be in `.env`)
2. **Always validate data server-side** (don't trust client validation)
3. **Use Cloud Functions for sensitive operations** (refunds, bulk updates)
4. **Log all administrative actions** (add `createdBy`, `updatedBy` fields)
5. **Regular security audits** (review who has admin access)
6. **Implement row-level security** (students can only see their own data if needed)

## Future Enhancements

### Audit Logging

Add audit trail for sensitive operations:

```javascript
match /auditLog/{logId} {
  allow read: if isAdmin();
  allow create: if isAuthenticated(); // Any auth user can log
  allow update, delete: if false; // Audit logs are immutable
}
```

### Rate Limiting

Implement rate limiting via Cloud Functions or App Check to prevent abuse.

### Data Validation Functions

```javascript
function isValidEmail(email) {
  return email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
}

function isValidDate(date) {
  return date is timestamp && date <= request.time;
}
```
