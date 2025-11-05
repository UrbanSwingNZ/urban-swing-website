# CRITICAL SECURITY FIXES - Student Registration

## Security Flaws Discovered

### 1. **Auth Session Hijacking**
**Problem:** When an admin was logged in and a new student registered, the registration process signed in the new student, which replaced the admin's auth session.

**Impact:** Admin lost their session and new student inherited admin access!

### 2. **No Role-Based Access Control**
**Problem:** Firestore security rules only checked if a user was authenticated, not their role. Any authenticated user could access admin features.

**Impact:** Students could access the entire admin area including sensitive data.

## Fixes Implemented

### Backend Changes (`functions/create-student-payment.js`)

1. **Auth User Creation Moved to Backend**
   - Backend now creates Firebase Auth user using Admin SDK
   - This does NOT sign in the user (unlike frontend `createUserWithEmailAndPassword`)
   - Password is passed from frontend to backend securely via HTTPS

2. **User Document Structure Changed**
   - User document ID is now the `authUid` (not `studentId`)
   - Added `role: 'student'` field to all new users
   - This enables efficient role lookups in security rules

3. **Required Fields Updated**
   - Backend now requires `password` field
   - Password is used to create auth user on backend

### Frontend Changes

1. **`student-portal/js/stripe/payment-handler.js`**
   - Now passes `password` to backend function

2. **`student-portal/js/registration-form-handler.js`**
   - No longer creates auth user (backend does this)
   - No longer updates user document (backend creates it complete)
   - After successful backend call, signs in the user with `signInWithEmailAndPassword`
   - This keeps admin sessions separate from new student registrations

### Security Rules (`config/firestore.rules`)

1. **Role-Based Helper Functions**
   ```
   isAdminOrFrontDesk() - checks for 'admin' or 'front-desk' role
   isStudent() - checks for 'student' role
   getStudentId() - gets the studentId from user document
   ```

2. **Updated Collection Rules**
   - **students**: Only admins and front-desk can access
   - **concessionBlocks**: Admins can read/write, students can read their own
   - **transactions**: Admins can read/write, students can read their own
   - **checkins**: Admins can read/write, students can read their own
   - **users**: Admins can read/write all, students can read their own
   - **casualRates/concessionPackages**: Public read, admin write only

### Admin Area Changes (`admin/admin.js`)

1. **Role Verification on Login**
   - After auth state change, checks user document for role
   - Only allows 'admin' or 'front-desk' roles
   - Automatically signs out and denies access to students
   - Shows clear error message: "Access denied: You do not have permission to access the admin area"

## User Document Structure

**New Structure:**
```javascript
{
  email: "student@example.com",
  firstName: "John",
  lastName: "Doe",
  studentId: "john-doe-abc123",  // Links to students collection
  role: "student",               // NEW: 'student', 'front-desk', or 'admin'
  createdAt: timestamp
}
```

**Document ID:** Now uses `authUid` (Firebase Auth UID) for easy role lookups

## Migration Required

### Existing Admin Users
You need to manually create user documents for existing admin users:

1. Go to Firestore Console
2. In `users` collection, create documents with:
   - Document ID: The user's Firebase Auth UID
   - Fields:
     ```
     email: "dance@urbanswing.co.nz"
     firstName: "Admin"
     lastName: "User"
     role: "admin"
     createdAt: [current timestamp]
     studentId: null (or their studentId if they're also a student)
     ```

### Existing Student Users (if any)
If any students have already registered, their user documents need:
1. Document ID changed from `studentId` to `authUid`
2. `role: "student"` field added

## Testing Checklist

- [ ] Admin can log in and access admin area
- [ ] New student can register and pay
- [ ] New student is automatically signed in after registration
- [ ] Admin session is NOT affected when student registers in another tab
- [ ] Student CANNOT access admin area
- [ ] Student CAN access their own data in student portal
- [ ] Security rules enforce role-based access

## Deployment Steps

1. Deploy backend function: `firebase deploy --only functions:createStudentWithPayment`
2. Deploy security rules: `firebase deploy --only firestore:rules`
3. Deploy hosting: `firebase deploy --only hosting`
4. Manually create admin user documents in Firestore (see Migration section)
5. Test thoroughly with admin and student accounts

## IMPORTANT NOTES

- **Do not test with production data until fully tested in development**
- **Existing admin users will be locked out until their user documents are created**
- **Password is transmitted via HTTPS but never stored in Firestore**
- **Admin SDK on backend can create auth users without signing them in**
