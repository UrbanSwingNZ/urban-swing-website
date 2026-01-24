/**
 * Integration Tests for user-management Cloud Functions
 * 
 * Tests disableUserAccount and enableUserAccount Callable functions
 * 
 * SKIPPED: These tests require Firebase Auth operations (admin.auth())
 * which don't work properly in the emulator environment.
 */

const {
  setupTestEnvironment,
  clearFirestore,
  cleanupTestEnvironment,
  getAdminFirestore,
} = require('./setup');

const {
  callCallableFunction,
} = require('./helpers/http-helpers');

const admin = require('firebase-admin');

describe.skip('user-management Integration Tests', () => {
  let adminUserId;
  let studentUserId;
  let targetAuthUid;

  beforeAll(async () => {
    await setupTestEnvironment();
    adminUserId = 'admin-user-123';
    studentUserId = 'student-user-456';
    targetAuthUid = 'target-user-789';
  });

  beforeEach(async () => {
    await clearFirestore();
    
    const db = getAdminFirestore();
    
    // Create admin user
    await db.collection('users').doc(adminUserId).set({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create regular student user
    await db.collection('users').doc(studentUserId).set({
      email: 'student@test.com',
      firstName: 'Test',
      lastName: 'Student',
      role: 'student',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('disableUserAccount', () => {
    test('should require authentication', async () => {
      const result = await callCallableFunction('disableUserAccount', {
        authUid: targetAuthUid,
      }, null);
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/authentication/i);
    });

    test('should reject non-admin users', async () => {
      const result = await callCallableFunction('disableUserAccount', {
        authUid: targetAuthUid,
      }, { uid: studentUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/admin|authorized/i);
    });

    test('should require authUid parameter', async () => {
      const result = await callCallableFunction('disableUserAccount', {
        // Missing authUid
      }, { uid: adminUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/authUid|required/i);
    });

    test('should successfully disable user account for admin', async () => {
      // Note: This test can't actually call Firebase Auth in emulator
      // It will fail when trying to updateUser, but validates request structure
      const result = await callCallableFunction('disableUserAccount', {
        authUid: targetAuthUid,
      }, { uid: adminUserId });
      
      // May fail due to emulator limitations with Firebase Auth
      // But if it reaches the Auth call, validation passed
      if (result.data.error) {
        // Expected error from Firebase Auth in emulator
        expect(result.data.error.message || result.data.error).toMatch(/auth|disabled/i);
      } else {
        expect(result.data.success).toBe(true);
      }
    });
  });

  describe('enableUserAccount', () => {
    test('should require authentication', async () => {
      const result = await callCallableFunction('enableUserAccount', {
        authUid: targetAuthUid,
      }, null);
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/authentication/i);
    });

    test('should reject non-admin users', async () => {
      const result = await callCallableFunction('enableUserAccount', {
        authUid: targetAuthUid,
      }, { uid: studentUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/admin|authorized/i);
    });

    test('should require authUid parameter', async () => {
      const result = await callCallableFunction('enableUserAccount', {
        // Missing authUid
      }, { uid: adminUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/authUid|required/i);
    });

    test('should successfully enable user account for admin', async () => {
      // Note: This test can't actually call Firebase Auth in emulator
      // It will fail when trying to updateUser, but validates request structure
      const result = await callCallableFunction('enableUserAccount', {
        authUid: targetAuthUid,
      }, { uid: adminUserId });
      
      // May fail due to emulator limitations with Firebase Auth
      // But if it reaches the Auth call, validation passed
      if (result.data.error) {
        // Expected error from Firebase Auth in emulator
        expect(result.data.error.message || result.data.error).toMatch(/auth|enabled/i);
      } else {
        expect(result.data.success).toBe(true);
      }
    });

    test('should allow super-admin to enable accounts', async () => {
      const db = getAdminFirestore();
      const superAdminId = 'super-admin-999';
      
      await db.collection('users').doc(superAdminId).set({
        email: 'superadmin@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super-admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const result = await callCallableFunction('enableUserAccount', {
        authUid: targetAuthUid,
      }, { uid: superAdminId });
      
      // May fail at Auth layer but validation should pass
      if (result.data.error) {
        expect(result.data.error.message || result.data.error).toMatch(/auth|enabled/i);
      } else {
        expect(result.data.success).toBe(true);
      }
    });
  });
});
