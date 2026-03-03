/**
 * Firebase Backup Script
 * Exports all Firestore collections and Auth users to JSON
 * Uses Google Cloud APIs directly with Workload Identity Federation
 */

const { Firestore } = require('@google-cloud/firestore');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

let db, auth;

// Initialize Firestore and Auth clients with access token
async function initializeFirebase() {
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const projectId = process.env.PROJECT_ID;
  
  console.log('Starting Firebase initialization...');
  console.log(`Project ID: ${projectId}`);
  console.log(`Access token present: ${!!accessToken}`);
  console.log(`Access token length: ${accessToken ? accessToken.length : 0}`);
  
  if (!accessToken) {
    throw new Error('GOOGLE_ACCESS_TOKEN environment variable not set');
  }
  
  // Explicitly set credentials to avoid loading from file
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
  process.env.GCLOUD_PROJECT = projectId;
  
  // Initialize Firestore with OAuth2 client
  const { GoogleAuth } = require('google-auth-library');
  const googleAuth = new GoogleAuth({
    projectId: projectId
  });
  
  // Create a client with our access token
  const authClient = await googleAuth.getClient();
  authClient.credentials = {
    access_token: accessToken,
    token_type: 'Bearer'
  };
  
  console.log('Creating Firestore client...');
  db = new Firestore({
    projectId: projectId,
    auth: authClient
  });
  
  console.log('Creating Auth API client...');
  // Initialize Firebase Auth using Identity Toolkit API
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  auth = google.identitytoolkit({
    version: 'v1',
    auth: oauth2Client
  });
  
  console.log('✓ Initialized Firestore and Auth clients successfully');
}

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
 * Export Firebase Auth users using Identity Toolkit API
 */
async function exportAuthUsers() {
  console.log('Exporting Auth users');
  const users = [];
  const projectId = process.env.PROJECT_ID;
  
  try {
    let nextPageToken = undefined;
    
    do {
      const response = await auth.projects.accounts.batchGet({
        targetProjectId: `projects/${projectId}`,
        maxResults: 1000,
        nextPageToken: nextPageToken
      });
      
      if (response.data.users) {
        response.data.users.forEach(user => {
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
        });
      }
      
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
    
    console.log(`  ✓ Exported ${users.length} users`);
  } catch (error) {
    console.error('Error exporting users:', error.message);
  }
  
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
  // Initialize Firebase first
  await initializeFirebase();
  
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
