# Firebase Authentication Backup Implementation

## Overview
Added Firebase Authentication user backup capability to the Database Backup tool, ensuring complete disaster recovery coverage.

## Changes Made

### 1. Cloud Function (`functions/index.js`)
- **New Function**: `exportAuthUsers`
  - Exports all Firebase Authentication users with their UIDs and profile data
  - Requires admin authentication (checks `users` collection for `isAdmin` field)
  - Returns user data including:
    - UID (critical for maintaining Firestore document relationships)
    - Email, display name, photo URL
    - Email verification status
    - Disabled status
    - Creation and last sign-in timestamps
    - Provider data (authentication methods)

### 2. Backup Tool UI (`admin/admin-tools/backup-database.html`)
- **Added Collections**:
  - `casualRates` - Casual rates pricing data
  - `users` - Firestore user profiles (labeled "Users (Firestore)")
  - `authUsers` - Firebase Authentication users (labeled "Auth Users")
  
- **Enhanced Collection Handling**:
  - Collections now have a `type` property (`firestore` or `auth`)
  - Auth collections show "Available" instead of document count (since count requires Cloud Function call)
  - Backup process handles Auth collections differently by calling the `exportAuthUsers` Cloud Function
  
- **Updated UI**:
  - Added Firebase Functions SDK script tag
  - Updated info section to mention Auth backup capability
  - Improved stats calculation to handle non-numeric collection counts

### 3. Restoration Tools
Created comprehensive restoration tooling:

#### `restore-auth-users.js`
- Production-ready Node.js script for restoring Auth users
- Features:
  - Validates required files (service account key, backup data)
  - Dry-run mode for testing without creating users
  - Preserves original UIDs (critical for Firestore relationships)
  - Creates users with temporary password
  - Skips existing users
  - Detailed progress reporting with color-coded console output
  - Error handling and summary statistics
  - Rate limiting protection

#### `RESTORE_AUTH_USERS.md`
- Complete documentation covering:
  - What gets backed up
  - Why preserving UIDs is critical
  - Three restoration methods (Console, Admin SDK, Firebase CLI)
  - Step-by-step restoration guide
  - Security best practices
  - Disaster recovery checklist

#### `package.json`
- Dependencies for restoration script
- NPM scripts for running restoration

#### `.gitignore`
- Prevents committing sensitive files:
  - Service account keys
  - Backup files
  - Environment files

## How It Works

### Backup Flow
1. User selects "Auth Users" in backup tool
2. When backup runs, tool detects `authUsers` collection type is 'auth'
3. Calls `exportAuthUsers` Cloud Function
4. Cloud Function:
   - Verifies user is admin
   - Uses Firebase Admin SDK to list all auth users
   - Returns sanitized user data
5. User data is added to ZIP as JSON and CSV files

### Restore Flow
1. Extract `authUsers.json` from backup ZIP
2. Download service account key from Firebase Console
3. Place both files in `admin/admin-tools` directory
4. Run `npm install` to get Firebase Admin SDK
5. Run `node restore-auth-users.js`
6. Script creates users with original UIDs
7. Users can log in with temporary password and reset

## Critical Architecture Points

### Why Preserve UIDs?
- Firestore `users` collection uses Auth UIDs as document IDs
- Student ownership links to Auth UIDs
- Security rules rely on UID matching
- Without preserving UIDs, would need to migrate all references across collections

### Why Cloud Function?
- Client-side JavaScript cannot list all auth users (security restriction)
- Firebase Admin SDK required (server-side only)
- Cloud Functions provide secure, authenticated access

### Why Temporary Passwords?
- Password hashes cannot be exported/imported for security
- Users must reset passwords after restoration
- Temporary password allows initial authentication

## Testing Checklist

- [x] Cloud Function deployed successfully (`exportAuthUsers`)
- [ ] Backup tool can select Auth Users collection
- [ ] Backup downloads with authUsers.json file
- [ ] authUsers.json contains correct user data
- [ ] Restoration script validates files
- [ ] Dry-run mode works correctly
- [ ] Restoration preserves original UIDs
- [ ] Restored users can log in with temporary password
- [ ] Password reset flow works

## Security Considerations

✅ Admin verification in Cloud Function
✅ Service account keys in .gitignore
✅ Backup files excluded from Git
✅ Temporary passwords require reset
✅ Detailed audit trail in restore script
✅ Rate limiting in restoration

## Deployment Status

- ✅ Cloud Function `exportAuthUsers` deployed to `us-central1`
- ✅ Backup tool updated with Auth support
- ✅ Restoration documentation complete
- ✅ Restoration script ready

## Usage

### To Backup
1. Open Admin Tools → Database Backup
2. Select "Auth Users" checkbox
3. Click "Backup Selected Collections" or "Backup Everything"
4. Download ZIP file containing `authUsers.json`

### To Restore
1. Extract `authUsers.json` from backup
2. Follow instructions in `RESTORE_AUTH_USERS.md`
3. Run restoration script
4. Send password reset emails to users

## Future Enhancements

- [ ] Automated password reset email sending during restoration
- [ ] UI-based restoration tool (currently CLI only)
- [ ] Scheduled automatic backups
- [ ] Backup encryption
- [ ] Backup versioning and retention policies
- [ ] One-click restore from Firebase Console
