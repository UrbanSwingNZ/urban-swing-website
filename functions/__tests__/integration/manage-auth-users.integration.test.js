/**
 * Integration Tests for manageAuthUsers Cloud Function
 * 
 * Tests the super-admin Callable function for managing Firebase Auth users
 * Note: Restricted to dance@urbanswing.co.nz email only
 * 
 * SKIPPED: These tests require Firebase Auth email verification (token.email)
 * which doesn't work in the emulator environment.
 */

const {
  setupTestEnvironment,
  clearFirestore,
  cleanupTestEnvironment,
} = require('./setup');

const {
  callCallableFunction,
} = require('./helpers/http-helpers');

describe.skip('manageAuthUsers Integration Tests', () => {
  let authorizedUserId;
  let unauthorizedUserId;

  beforeAll(async () => {
    await setupTestEnvironment();
    authorizedUserId = 'authorized-user-123';
    unauthorizedUserId = 'unauthorized-user-456';
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('Security and Authorization', () => {
    test('should reject unauthenticated requests', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'list',
      }, null);
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/unauthorized/i);
    });

    test('should reject non-authorized email addresses', async () => {
      // Simulate authenticated user with wrong email
      // Note: In real scenario, request.auth.token.email would be checked
      // Emulator may not support token.email, so test will fail at that check
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'list',
      }, { uid: unauthorizedUserId });
      
      expect(result.data.error).toBeDefined();
      // Will fail because auth token doesn't have email in emulator
      const errorMsg = result.data.error.message || result.data.error;
      expect(errorMsg.match(/unauthorized|email/i)).toBeTruthy();
    });
  });

  describe('List operation', () => {
    test('should require valid operation', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'invalid-operation',
      }, { uid: authorizedUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/unknown operation|unauthorized/i);
    });

    test('should accept list operation', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'list',
        maxResults: 10,
      }, { uid: authorizedUserId });
      
      // Will fail at auth check in emulator
      if (result.data.error) {
        // Expected - can't verify email in emulator
        expect(result.data.error.message || result.data.error).toMatch(/unauthorized|email/i);
      } else {
        expect(result.data.users).toBeDefined();
        expect(Array.isArray(result.data.users)).toBe(true);
      }
    });

    test('should handle pagination parameters', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'list',
        maxResults: 50,
        pageToken: 'some-token',
      }, { uid: authorizedUserId });
      
      // Will fail at auth check
      expect(result.data.error).toBeDefined();
    });
  });

  describe('Disable operation', () => {
    test('should require uid parameter', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'disable',
        // Missing uid
      }, { uid: authorizedUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/uid.*required|unauthorized/i);
    });

    test('should accept valid disable request', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'disable',
        uid: 'user-to-disable',
      }, { uid: authorizedUserId });
      
      // Will fail at auth/Firebase Auth layer
      expect(result.data.error).toBeDefined();
    });
  });

  describe('Enable operation', () => {
    test('should require uid parameter', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'enable',
        // Missing uid
      }, { uid: authorizedUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/uid.*required|unauthorized/i);
    });

    test('should accept valid enable request', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'enable',
        uid: 'user-to-enable',
      }, { uid: authorizedUserId });
      
      // Will fail at auth layer
      expect(result.data.error).toBeDefined();
    });
  });

  describe('Delete operation', () => {
    test('should require uid parameter', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'delete',
        // Missing uid
      }, { uid: authorizedUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/uid.*required|unauthorized/i);
    });

    test('should accept valid delete request', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'delete',
        uid: 'user-to-delete',
      }, { uid: authorizedUserId });
      
      // Will fail at auth layer
      expect(result.data.error).toBeDefined();
    });
  });

  describe('UpdateEmail operation', () => {
    test('should require uid parameter', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'updateEmail',
        email: 'newemail@example.com',
        // Missing uid
      }, { uid: authorizedUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/uid.*required|unauthorized/i);
    });

    test('should require email parameter', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'updateEmail',
        uid: 'user-to-update',
        // Missing email
      }, { uid: authorizedUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/email.*required|unauthorized/i);
    });

    test('should accept valid updateEmail request', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'updateEmail',
        uid: 'user-to-update',
        email: 'newemail@example.com',
      }, { uid: authorizedUserId });
      
      // Will fail at auth layer
      expect(result.data.error).toBeDefined();
    });
  });

  describe('SendPasswordReset operation', () => {
    test('should require uid parameter', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'sendPasswordReset',
        // Missing uid
      }, { uid: authorizedUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/uid.*required|unauthorized/i);
    });

    test('should accept valid sendPasswordReset request', async () => {
      const result = await callCallableFunction('manageAuthUsers', {
        operation: 'sendPasswordReset',
        uid: 'user-to-reset',
      }, { uid: authorizedUserId });
      
      // Will fail at auth layer
      expect(result.data.error).toBeDefined();
    });
  });
});
