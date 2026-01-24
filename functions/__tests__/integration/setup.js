/**
 * Integration Test Setup
 * 
 * Sets up Firebase Emulator environment for integration tests
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');

let testEnv;

/**
 * Initialize the Firebase Test Environment before all tests
 */
async function setupTestEnvironment() {
  if (testEnv) {
    return testEnv;
  }

  testEnv = await initializeTestEnvironment({
    projectId: 'directed-curve-447204-j4',
    firestore: {
      host: 'localhost',
      port: 8080,
    },
  });

  return testEnv;
}

/**
 * Clear all Firestore data before each test
 */
async function clearFirestore() {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
}

/**
 * Clean up and destroy the test environment after all tests
 */
async function cleanupTestEnvironment() {
  if (testEnv) {
    await testEnv.cleanup();
    testEnv = null;
  }
}

/**
 * Get an authenticated Firestore instance
 */
function getAuthenticatedFirestore(uid = 'test-user') {
  if (!testEnv) {
    throw new Error('Test environment not initialized');
  }
  return testEnv.authenticatedContext(uid).firestore();
}

/**
 * Get an unauthenticated Firestore instance
 */
function getUnauthenticatedFirestore() {
  if (!testEnv) {
    throw new Error('Test environment not initialized');
  }
  return testEnv.unauthenticatedContext().firestore();
}

/**
 * Seed test data into Firestore
 */
async function seedFirestore(collections) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    
    for (const [collectionName, documents] of Object.entries(collections)) {
      for (const [docId, data] of Object.entries(documents)) {
        await db.collection(collectionName).doc(docId).set(data);
      }
    }
  });
}

module.exports = {
  setupTestEnvironment,
  clearFirestore,
  cleanupTestEnvironment,
  getAuthenticatedFirestore,
  getUnauthenticatedFirestore,
  seedFirestore,
  assertSucceeds,
  assertFails,
};
