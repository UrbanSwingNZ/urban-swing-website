/**
 * Firebase Authentication Users Restoration Script
 * 
 * This script restores Firebase Auth users from a backup created by the Database Backup tool.
 * 
 * IMPORTANT: Read RESTORE_AUTH_USERS.md before running this script!
 * 
 * Prerequisites:
 * 1. Node.js installed
 * 2. Firebase Admin SDK: npm install firebase-admin
 * 3. Service account key downloaded from Firebase Console (serviceAccountKey.json)
 * 4. authUsers.json backup file from your database backup ZIP
 * 
 * Usage:
 * 1. Place serviceAccountKey.json and authUsers.json in the same directory as this script
 * 2. Run: node restore-auth-users.js
 * 
 * WARNING: This will create users with a temporary password. 
 * Users MUST reset their passwords after restoration.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const BACKUP_FILE_PATH = './authUsers.json';
const TEMPORARY_PASSWORD = 'TemporaryPassword123!'; // Users will need to reset this
const DRY_RUN = false; // Set to true to test without actually creating users

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Validate required files exist
function validateSetup() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    log(`ERROR: Service account key not found at ${SERVICE_ACCOUNT_PATH}`, colors.red);
    log('Download it from Firebase Console → Project Settings → Service Accounts', colors.yellow);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_FILE_PATH)) {
    log(`ERROR: Backup file not found at ${BACKUP_FILE_PATH}`, colors.red);
    log('Extract authUsers.json from your backup ZIP file', colors.yellow);
    process.exit(1);
  }

  log('✓ Required files found', colors.green);
}

// Initialize Firebase Admin
function initializeFirebase() {
  try {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    log('✓ Firebase Admin initialized', colors.green);
  } catch (error) {
    log(`ERROR: Failed to initialize Firebase Admin: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Read backup data
function readBackupData() {
  try {
    const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE_PATH, 'utf8'));
    log(`✓ Read ${backupData.length} users from backup`, colors.green);
    return backupData;
  } catch (error) {
    log(`ERROR: Failed to read backup file: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Restore a single user
async function restoreUser(user, index, total) {
  try {
    // Check if user already exists
    try {
      const existingUser = await admin.auth().getUser(user.uid);
      log(`[${index + 1}/${total}] SKIP: ${user.email} (${user.uid}) - already exists`, colors.yellow);
      return { status: 'skipped', user: user.email };
    } catch (error) {
      // User doesn't exist, proceed with creation
    }

    if (DRY_RUN) {
      log(`[${index + 1}/${total}] DRY RUN: Would restore ${user.email} (${user.uid})`, colors.cyan);
      return { status: 'dry-run', user: user.email };
    }

    // Create user with original UID
    await admin.auth().createUser({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified || false,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      disabled: user.disabled || false,
      password: TEMPORARY_PASSWORD
    });

    log(`[${index + 1}/${total}] ✓ RESTORED: ${user.email} (${user.uid})`, colors.green);
    return { status: 'restored', user: user.email };

  } catch (error) {
    log(`[${index + 1}/${total}] ✗ FAILED: ${user.email} - ${error.message}`, colors.red);
    return { status: 'failed', user: user.email, error: error.message };
  }
}

// Main restoration function
async function restoreAuthUsers() {
  log('\n========================================', colors.blue);
  log('Firebase Auth Users Restoration', colors.blue);
  log('========================================\n', colors.blue);

  if (DRY_RUN) {
    log('⚠️  DRY RUN MODE - No users will be created', colors.yellow);
  }

  // Validate setup
  validateSetup();

  // Initialize Firebase
  initializeFirebase();

  // Read backup data
  const users = readBackupData();

  if (users.length === 0) {
    log('No users to restore', colors.yellow);
    return;
  }

  // Confirm restoration
  if (!DRY_RUN) {
    log(`\n⚠️  About to restore ${users.length} users with temporary password: ${TEMPORARY_PASSWORD}`, colors.yellow);
    log('Users will need to reset their passwords after restoration.\n', colors.yellow);
    log('Press Ctrl+C to cancel, or wait 5 seconds to continue...', colors.cyan);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  log('\nStarting restoration...\n', colors.cyan);

  // Track results
  const results = {
    restored: [],
    skipped: [],
    failed: [],
    dryRun: []
  };

  // Restore users one by one
  for (let i = 0; i < users.length; i++) {
    const result = await restoreUser(users[i], i, users.length);
    
    if (result.status === 'restored') results.restored.push(result.user);
    else if (result.status === 'skipped') results.skipped.push(result.user);
    else if (result.status === 'failed') results.failed.push({ user: result.user, error: result.error });
    else if (result.status === 'dry-run') results.dryRun.push(result.user);

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Print summary
  log('\n========================================', colors.blue);
  log('Restoration Summary', colors.blue);
  log('========================================\n', colors.blue);

  if (DRY_RUN) {
    log(`Would restore: ${results.dryRun.length} users`, colors.cyan);
  } else {
    log(`✓ Successfully restored: ${results.restored.length} users`, colors.green);
    log(`⊘ Skipped (already exist): ${results.skipped.length} users`, colors.yellow);
    log(`✗ Failed: ${results.failed.length} users`, colors.red);
  }

  if (results.failed.length > 0) {
    log('\nFailed users:', colors.red);
    results.failed.forEach(f => {
      log(`  - ${f.user}: ${f.error}`, colors.red);
    });
  }

  if (!DRY_RUN && results.restored.length > 0) {
    log('\n⚠️  IMPORTANT: Send password reset emails to all restored users!', colors.yellow);
    log(`Temporary password: ${TEMPORARY_PASSWORD}`, colors.yellow);
  }

  log('\n✓ Restoration complete!\n', colors.green);
}

// Run the restoration
restoreAuthUsers()
  .then(() => process.exit(0))
  .catch(error => {
    log(`\n✗ Restoration failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  });
