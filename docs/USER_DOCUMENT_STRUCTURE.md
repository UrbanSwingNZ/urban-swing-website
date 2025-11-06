# User Document Structure - Final Implementation

## Document ID: authUid (Firebase Auth UID)

The `users` collection uses **authUid as the document ID** (not studentId).

### Why?
- Security rules can efficiently check roles: `get(/databases/.../users/$(request.auth.uid)).data.role`
- No need to query - direct document lookup by auth UID
- Standard Firebase Auth pattern

## User Document Structure

```javascript
{
  email: "student@example.com",
  firstName: "John",
  lastName: "Doe",
  studentId: "john-doe-abc123",  // Link to students collection
  role: "student",               // 'student', 'front-desk', or 'admin'
  createdAt: timestamp
}
```

**Document ID:** Firebase Auth UID (e.g., `8silkyX1hRhF4wLwkBHnTpB4...`)
**Not:** studentId

## Looking Up Users

### By Auth UID (Direct - Fast)
```javascript
const userDoc = await db.collection('users').doc(authUid).get();
```

### By Student ID (Query - Slower)
```javascript
const snapshot = await db.collection('users')
  .where('studentId', '==', studentId)
  .limit(1)
  .get();
```

## Code That Was Fixed

### ✅ Backend Function (`functions/create-student-payment.js`)
- Creates user document with ID = `authUid`
- No longer uses `studentId` as document ID

### ✅ Backend Email Function (`functions/index.js`)
- Now queries users by `studentId` field instead of direct lookup

### ✅ Student Service (`student-portal/js/services/student-service.js`)
- `getUserByStudentId()` now queries instead of direct lookup
- `createUser()` uses `authUid` as document ID and adds `role: 'student'`

### ✅ Security Rules (`config/firestore.rules`)
- Allow querying users by `studentId` (limited to 10 results)
- Removed `authUid` field requirement (redundant - it's the document ID)

## Admin User Setup

Admin users must be manually created in Firestore:

1. Get Auth UID from Firebase Console → Authentication
2. Create document in `users` collection:
   - **Document ID:** The Auth UID (e.g., `EJ7xRCZRMmeFEQiCDLpvXD...`)
   - **Fields:**
     ```javascript
     {
       email: "admin@example.com",
       firstName: "Admin",
       lastName: "User",
       role: "admin",  // or "front-desk"
       createdAt: timestamp,
       studentId: null  // optional
     }
     ```

## Registration Flow

### New Student Registration (With Payment)
1. Backend creates Firebase Auth user (doesn't sign them in)
2. Backend creates user document with ID = authUid
3. Backend creates student document with ID = studentId
4. Frontend signs in user with email/password
5. Frontend redirects to student portal

### Existing-Incomplete Registration
1. Frontend creates Firebase Auth user
2. Frontend creates user document with ID = authUid
3. Frontend updates student document
4. User is automatically signed in
5. Frontend redirects to student portal

## Security

- Students can only access their own data (filtered by `studentId` in user document)
- Admin area checks user role on auth state change
- Firestore rules enforce role-based access
- Auth UID cannot be predicted or guessed
