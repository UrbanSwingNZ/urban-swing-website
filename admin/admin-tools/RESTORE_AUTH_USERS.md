# Restoring Firebase Authentication Users

This guide explains how to restore Firebase Authentication users from a backup created by the Database Backup tool.

## What Gets Backed Up

The `authUsers.json` file in your backup contains:
- User UIDs (unique identifiers)
- Email addresses
- Email verification status
- Display names
- Photo URLs
- Account disabled status
- Creation and last sign-in timestamps
- Provider data (authentication methods)

## Important Notes

⚠️ **Auth users CANNOT be restored directly from the browser** - Firebase Authentication can only be managed via:
1. Firebase Admin SDK (server-side)
2. Firebase Console (manual, one-by-one)
3. Firebase CLI with Admin SDK scripts

## Restoration Options

### Option 1: Firebase Console (Manual)
For small numbers of users:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Authentication → Users
4. Click "Add user" for each user in your backup
5. Manually enter email and set a temporary password
6. Have users reset their password

**Limitations:**
- Time-consuming for many users
- Cannot preserve original UIDs (new UIDs will be generated)
- Cannot import metadata (creation dates, etc.)
- Firestore `users` collection document IDs won't match Auth UIDs

### Option 2: Firebase Admin SDK Script (Recommended)
For complete restoration with original UIDs:

#### Prerequisites
- Node.js installed
- Firebase Admin SDK access
- Service account credentials

#### Steps

1. **Install Dependencies**
```bash
npm install firebase-admin
```

2. **Download Service Account Key**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` (DO NOT commit to Git!)

3. **Create Restoration Script** (`restore-auth-users.js`):
```javascript
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Read backup file
const backupData = JSON.parse(fs.readFileSync('./authUsers.json', 'utf8'));

async function restoreAuthUsers() {
  console.log(`Restoring ${backupData.length} auth users...`);
  
  for (const user of backupData) {
    try {
      // Check if user already exists
      try {
        await admin.auth().getUser(user.uid);
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      } catch (error) {
        // User doesn't exist, proceed with creation
      }
      
      // Create user with original UID
      await admin.auth().createUser({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        disabled: user.disabled,
        password: 'TemporaryPassword123!' // Users will need to reset
      });
      
      console.log(`✓ Restored user: ${user.email} (${user.uid})`);
    } catch (error) {
      console.error(`✗ Failed to restore ${user.email}:`, error.message);
    }
  }
  
  console.log('Restoration complete!');
}

restoreAuthUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Restoration failed:', error);
    process.exit(1);
  });
```

4. **Run the Script**
```bash
node restore-auth-users.js
```

5. **Notify Users**
   - All users will have the temporary password set in the script
   - Send password reset emails to all users
   - Users can use "Forgot Password" to set their own password

### Option 3: Firebase CLI Import (Bulk Import)
Firebase provides a bulk import feature via CLI:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Convert your backup to Firebase's import format (CSV or JSON)
# Then import users
firebase auth:import authUsers.json --hash-algo=SCRYPT --project=your-project-id
```

**Note:** The import format is specific - you may need to transform your backup data.

## Why Preserve Original UIDs?

Preserving original UIDs is crucial because:
1. **Firestore `users` collection** uses Auth UIDs as document IDs
2. **Student ownership** links to Auth UIDs
3. **Check-ins and transactions** may reference user UIDs
4. **Permissions and security rules** rely on UID matching

Without preserving UIDs, you would need to:
- Update all Firestore document IDs
- Migrate all references across collections
- Potentially lose data relationships

## Testing the Restoration

After restoration:
1. Check Firebase Console → Authentication to verify users
2. Test login with a restored account
3. Verify Firestore `users` documents match Auth UIDs
4. Check that student portal access works correctly

## Security Best Practices

- ✅ Store backups in secure, encrypted locations
- ✅ Use temporary passwords and require immediate reset
- ✅ Keep service account keys secure (never commit to Git)
- ✅ Enable 2FA for admin accounts
- ✅ Audit restored accounts for suspicious activity
- ✅ Delete service account keys after use

## Disaster Recovery Checklist

In case of complete data loss:

- [ ] Restore Firestore collections (via backup tool)
- [ ] Restore Auth users (via Admin SDK script)
- [ ] Verify UID matching between Auth and Firestore `users` collection
- [ ] Test user login and portal access
- [ ] Send password reset emails to all users
- [ ] Verify student data and ownership
- [ ] Check transactions and check-ins
- [ ] Test concession packages
- [ ] Verify admin access

## Support

For issues with restoration:
1. Check Firebase Console logs
2. Review Cloud Functions logs (if using functions)
3. Verify service account permissions
4. Contact Firebase Support for authentication issues
