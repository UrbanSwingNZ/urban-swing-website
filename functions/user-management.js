/**
 * User Management Cloud Functions
 * Handles user account operations (disable, enable, export)
 */

const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Get Firestore with explicit settings
const getFirestore = () => {
  return admin.firestore();
};

/**
 * Disable a Firebase Auth user account
 * Used when soft-deleting a student
 * Requires admin authentication
 */
exports.disableUserAccount = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to disableUserAccount");
    throw new Error("Authentication required");
  }

  logger.info("Disabling user account, requested by:", request.auth.uid);

  try {
    // Verify the requesting user is an admin or super-admin
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!userDoc.exists) {
      logger.error("User document not found:", request.auth.uid);
      throw new Error("User not authorized");
    }

    const userData = userDoc.data();
    if (userData.role !== 'admin' && userData.role !== 'super-admin') {
      logger.error("Non-admin user attempted to disable account:", request.auth.uid);
      throw new Error("Admin privileges required");
    }

    const { authUid } = request.data;
    
    if (!authUid) {
      throw new Error("authUid is required");
    }

    // Disable the Firebase Auth user
    await admin.auth().updateUser(authUid, {
      disabled: true
    });

    logger.info("Successfully disabled user account:", authUid);

    return {
      success: true,
      message: "User account disabled successfully"
    };
  } catch (error) {
    logger.error("Error disabling user account:", error);
    throw new Error(`Failed to disable user account: ${error.message}`);
  }
});

/**
 * Enable a Firebase Auth user account
 * Used when restoring a soft-deleted student
 * Requires admin authentication
 */
exports.enableUserAccount = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to enableUserAccount");
    throw new Error("Authentication required");
  }

  logger.info("Enabling user account, requested by:", request.auth.uid);

  try {
    // Verify the requesting user is an admin or super-admin
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!userDoc.exists) {
      logger.error("User document not found:", request.auth.uid);
      throw new Error("User not authorized");
    }

    const userData = userDoc.data();
    if (userData.role !== 'admin' && userData.role !== 'super-admin') {
      logger.error("Non-admin user attempted to enable account:", request.auth.uid);
      throw new Error("Admin privileges required");
    }

    const { authUid } = request.data;
    
    if (!authUid) {
      throw new Error("authUid is required");
    }

    // Enable the Firebase Auth user
    await admin.auth().updateUser(authUid, {
      disabled: false
    });

    logger.info("Successfully enabled user account:", authUid);

    return {
      success: true,
      message: "User account enabled successfully"
    };
  } catch (error) {
    logger.error("Error enabling user account:", error);
    throw new Error(`Failed to enable user account: ${error.message}`);
  }
});

/**
 * Export all Firebase Authentication users
 * Returns list of all auth users with their UIDs and profile data
 * Requires admin authentication
 */
exports.exportAuthUsers = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to exportAuthUsers");
    throw new Error("Authentication required");
  }

  logger.info("Exporting auth users for admin:", request.auth.uid);

  try {
    // Verify the requesting user is an admin
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!userDoc.exists) {
      logger.error("User document not found:", request.auth.uid);
      throw new Error("User not authorized");
    }

    const userData = userDoc.data();
    if (!userData.isAdmin) {
      logger.error("Non-admin user attempted to export auth users:", request.auth.uid);
      throw new Error("Admin privileges required");
    }

    // List all auth users
    const listUsersResult = await admin.auth().listUsers();
    const authUsers = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
      providerData: userRecord.providerData,
    }));

    logger.info(`Exported ${authUsers.length} auth users`);

    return {
      users: authUsers,
      count: authUsers.length,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error exporting auth users:", error);
    throw new Error(`Auth export failed: ${error.message}`);
  }
});
