/**
 * Cloud Function: Manage Authentication Users
 * 
 * Provides operations for managing Firebase Authentication users:
 * - list: Get all auth users (paginated)
 * - disable: Disable a user account
 * - enable: Enable a user account
 * - delete: Delete a user account
 * - sendPasswordReset: Send password reset email
 * 
 * Security: Restricted to dance@urbanswing.co.nz
 */

const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

exports.manageAuthUsers = onCall(
    {
        cors: true,
        region: 'us-central1',
        invoker: 'public'
    },
    async (request) => {
        const { operation, uid, pageToken, maxResults = 100 } = request.data;

        // Security: Only allow dance@urbanswing.co.nz
        if (!request.auth || request.auth.token.email !== 'dance@urbanswing.co.nz') {
            logger.warn('Unauthorized access attempt to manageAuthUsers', { 
                email: request.auth?.token?.email 
            });
            throw new Error('Unauthorized: Only dance@urbanswing.co.nz can access this function');
        }

        try {
            switch (operation) {
                case 'list':
                    return await listAuthUsers(pageToken, maxResults);
                
                case 'disable':
                    if (!uid) throw new Error('UID is required for disable operation');
                    await admin.auth().updateUser(uid, { disabled: true });
                    logger.info('User disabled', { uid, by: request.auth.token.email });
                    return { success: true, message: 'User disabled successfully' };
                
                case 'enable':
                    if (!uid) throw new Error('UID is required for enable operation');
                    await admin.auth().updateUser(uid, { disabled: false });
                    logger.info('User enabled', { uid, by: request.auth.token.email });
                    return { success: true, message: 'User enabled successfully' };
                
                case 'delete':
                    if (!uid) throw new Error('UID is required for delete operation');
                    await admin.auth().deleteUser(uid);
                    logger.info('User deleted', { uid, by: request.auth.token.email });
                    return { success: true, message: 'User deleted successfully' };
                
                case 'sendPasswordReset':
                    if (!uid) throw new Error('UID is required for sendPasswordReset operation');
                    const user = await admin.auth().getUser(uid);
                    if (!user.email) throw new Error('User has no email address');
                    const link = await admin.auth().generatePasswordResetLink(user.email);
                    // Note: In production, you'd send this via email. For now, return it.
                    logger.info('Password reset link generated', { uid, email: user.email });
                    return { success: true, message: 'Password reset link generated', link };
                
                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }
        } catch (error) {
            logger.error('Error in manageAuthUsers', { 
                operation, 
                uid, 
                error: error.message 
            });
            throw new Error(`Operation failed: ${error.message}`);
        }
    }
);

/**
 * List all authentication users with pagination
 */
async function listAuthUsers(pageToken, maxResults) {
    const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);
    
    const users = listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        providerData: user.providerData.map(p => p.providerId)
    }));

    return {
        users,
        nextPageToken: listUsersResult.pageToken || null,
        totalCount: users.length
    };
}
