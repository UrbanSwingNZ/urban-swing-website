/**
 * Firebase Backup Script
 * Exports all Firestore collections and Auth users to JSON
 * Uses REST APIs directly with Workload Identity Federation access token
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

console.log('='.repeat(50));
console.log('Firebase Backup - REST API Approach');
console.log('='.repeat(50));
console.log(`Project ID: ${PROJECT_ID}`);
console.log(`Access token present: ${!!ACCESS_TOKEN}`);
console.log('');

/**
 * Make authenticated request to Firebase REST API
 */
async function firebaseRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return response.json();
}

/**
 * Export all documents from a collection using Firestore REST API
 */
async function exportCollection(collectionName) {
  console.log(`Exporting collection: ${collectionName}`);
  const documents = [];
  
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}`;
    const data = await firebaseRequest(url);
    
    if (data.documents) {
      for (const doc of data.documents) {
        const docId = doc.name.split('/').pop();
        documents.push({
          id: docId,
          data: parseFirestoreFields(doc.fields || {})
        });
      }
    }
    
    console.log(`  ✓ Exported ${documents.length} documents`);
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
  }
  
  return documents;
}

/**
 * Convert Firestore REST API field format to simple objects
 */
function parseFirestoreFields(fields) {
  const result = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else if (value.nullValue !== undefined) result[key] = null;
    else if (value.arrayValue !== undefined) {
      result[key] = value.arrayValue.values ? value.arrayValue.values.map(v => parseFirestoreFields({ temp: v }).temp) : [];
    }
    else if (value.mapValue !== undefined) {
      result[key] = parseFirestoreFields(value.mapValue.fields || {});
    }
    else result[key] = value;
  }
  
  return result;
}

/**
 * Export Firebase Auth users using Identity Toolkit REST API
 */
async function exportAuthUsers() {
  console.log('Exporting Auth users');
  const users = [];
  
  try {
    let nextPageToken = undefined;
    
    do {
      const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet?maxResults=1000${nextPageToken ? `&nextPageToken=${nextPageToken}` : ''}`;
      const data = await firebaseRequest(url, { method: 'POST', body: JSON.stringify({}) });
      
      if (data.users) {
        for (const user of data.users) {
          users.push({
            uid: user.localId,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified || false,
            disabled: user.disabled || false,
            metadata: {
              creationTime: user.createdAt,
              lastSignInTime: user.lastLoginAt
            },
            customClaims: user.customAttributes ? JSON.parse(user.customAttributes) : {}
          });
        }
      }
      
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);
    
    console.log(`  ✓ Exported ${users.length} users`);
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
  }
  
  return users;
}

/**
 * Get all collection IDs
 */
async function getAllCollections() {
  console.log('Discovering collections...');
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:listCollectionIds`;
  const data = await firebaseRequest(url, { 
    method: 'POST',
    body: JSON.stringify({})
  });
  
  return data.collectionIds || [];
}

/**
 * Main backup function
 */
async function runBackup() {
  console.log('\nStarting backup process');
  console.log('='.repeat(50));
  
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backup = {
    timestamp: new Date().toISOString(),
    firestore: {},
    auth: []
  };
  
  // Export all Firestore collections
  const collectionNames = await getAllCollections();
  console.log(`Found ${collectionNames.length} collections\n`);
  
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
    console.error('\nBackup failed!');
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
