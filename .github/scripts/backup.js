/**
 * Firebase Backup Script
 * Exports all Firestore collections and Auth users to JSON
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin with Application Default Credentials
// This works with Workload Identity Federation (no keys needed!)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'directed-curve-447204-j4'
});

const db = admin.firestore();
const auth = admin.auth();

/**
 * Export all documents from a collection
 */
async function exportCollection(collectionName) {
  console.log(`Exporting collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  const documents = [];
  
  snapshot.forEach(doc => {
    documents.push({
      id: doc.id,
      data: doc.data()
    });
  });
  
  console.log(`  ✓ Exported ${documents.length} documents`);
  return documents;
}

/**
 * Export all Firebase Auth users
 */
async function exportAuthUsers() {
  console.log('Exporting Auth users');
  const users = [];
  
  const listUsers = async (nextPageToken) => {
    const result = await auth.listUsers(1000, nextPageToken);
    
    result.users.forEach(user => {
      users.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        },
        customClaims: user.customClaims || {}
      });
    });
    
    if (result.pageToken) {
      await listUsers(result.pageToken);
    }
  };
  
  await listUsers();
  console.log(`  ✓ Exported ${users.length} users`);
  return users;
}

/**
 * Get all collection names
 */
async function getAllCollections() {
  const collections = await db.listCollections();
  return collections.map(col => col.id);
}

/**
 * Main backup function
 */
async function runBackup() {
  console.log('='.repeat(50));
  console.log('Starting Firebase Backup');
  console.log('='.repeat(50));
  
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backup = {
    timestamp: new Date().toISOString(),
    firestore: {},
    auth: []
  };
  
  // Export all Firestore collections
  const collectionNames = await getAllCollections();
  console.log(`\nFound ${collectionNames.length} collections\n`);
  
  for (const collectionName of collectionNames) {
    try {
      backup.firestore[collectionName] = await exportCollection(collectionName);
    } catch (error) {
      console.error(`Error exporting ${collectionName}:`, error.message);
      backup.firestore[collectionName] = { error: error.message };
    }
  }
  
  // Export Auth users
  console.log('');
  try {
    backup.auth = await exportAuthUsers();
  } catch (error) {
    console.error('Error exporting Auth users:', error.message);
    backup.auth = { error: error.message };
  }
  
  // Write backup to file
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(__dirname, filename);
  await fs.writeFile(filepath, JSON.stringify(backup, null, 2));
  
  // Calculate file size
  const stats = await fs.stat(filepath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('Backup completed successfully!');
  console.log(`File: ${filename}`);
  console.log(`Size: ${sizeKB} KB`);
  console.log('='.repeat(50));
}

// Run the backup
runBackup()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Backup failed:', error);
    process.exit(1);
  });
