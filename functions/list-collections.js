/**
 * List Collections Cloud Function
 * 
 * Returns a list of all top-level collections in Firestore.
 * This uses the Admin SDK which has the listCollections() method,
 * unlike the client SDK which doesn't provide this functionality.
 * 
 * Security: Only accessible to admin users (dance@urbanswing.co.nz)
 */

const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

exports.listCollections = onCall({
  cors: true,
  invoker: 'public'
}, async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to list collections'
    );
  }

  // Verify user is the admin (dance@urbanswing.co.nz)
  const userEmail = request.auth.token.email;
  if (userEmail !== 'dance@urbanswing.co.nz') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only dance@urbanswing.co.nz can access this function'
    );
  }

  try {
    // Get Firestore instance
    const db = admin.firestore();
    
    // List all collections
    const collections = await db.listCollections();
    
    // Extract collection IDs
    const collectionIds = collections.map(col => col.id);
    
    // Return sorted collection list
    return {
      success: true,
      collections: collectionIds.sort()
    };
  } catch (error) {
    console.error('Error listing collections:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to list collections',
      error.message
    );
  }
});
