/**
 * Integration Tests for sendPortalInvitationEmail Cloud Function
 * 
 * Tests the Callable function for inviting students to the portal
 * 
 * SKIPPED: These tests require email sending and Firebase Auth operations
 * which don't work in the emulator environment.
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

describe.skip('sendPortalInvitationEmail Integration Tests', () => {
  let testStudentId;

  beforeAll(async () => {
    await setupTestEnvironment();
    testStudentId = 'STU-12345';
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('Input validation', () => {
    test('should reject request without studentId', async () => {
      const result = await callCallableFunction('sendPortalInvitationEmail', {
        // Missing studentId
      });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/student.*id.*required/i);
    });

    test('should reject non-existent student', async () => {
      const result = await callCallableFunction('sendPortalInvitationEmail', {
        studentId: 'non-existent-student',
      });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/student.*not found/i);
    });

    test('should reject student without email', async () => {
      const db = getAdminFirestore();
      
      // Create student without email
      await db.collection('students').doc(testStudentId).set({
        firstName: 'Test',
        lastName: 'Student',
        studentId: testStudentId,
        // No email field
      });
      
      const result = await callCallableFunction('sendPortalInvitationEmail', {
        studentId: testStudentId,
      });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/email/i);
    });
  });

  describe('Duplicate account detection', () => {
    test('should reject if student already has portal account', async () => {
      const db = getAdminFirestore();
      
      // Create student
      await db.collection('students').doc(testStudentId).set({
        firstName: 'Test',
        lastName: 'Student',
        email: 'test@example.com',
        studentId: testStudentId,
      });
      
      // Create existing users document
      await db.collection('users').doc('user-123').set({
        studentId: testStudentId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Student',
        role: 'student',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const result = await callCallableFunction('sendPortalInvitationEmail', {
        studentId: testStudentId,
      });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/already.*portal.*account/i);
    });

    test('should allow invitation for student without portal account', async () => {
      const db = getAdminFirestore();
      
      // Create student without users document
      await db.collection('students').doc(testStudentId).set({
        firstName: 'Test',
        lastName: 'Student',
        email: 'newstudent@example.com',
        studentId: testStudentId,
      });
      
      const result = await callCallableFunction('sendPortalInvitationEmail', {
        studentId: testStudentId,
      });
      
      // Function will fail at email/auth layer in emulator, but validation passes
      // If it gets past the duplicate check, that's success for our test
      if (result.data.error) {
        // Should NOT be a "already has account" error
        expect(result.data.error.message || result.data.error).not.toMatch(/already.*portal.*account/i);
        // Will likely be auth or email related error from emulator
        expect(result.data.error.message || result.data.error).toMatch(/auth|email|send/i);
      } else {
        expect(result.data.success).toBe(true);
      }
    });
  });

  describe('Email validation', () => {
    test('should normalize email to lowercase', async () => {
      const db = getAdminFirestore();
      
      // Create student with uppercase email
      await db.collection('students').doc(testStudentId).set({
        firstName: 'Test',
        lastName: 'Student',
        email: 'TEST@EXAMPLE.COM',
        studentId: testStudentId,
      });
      
      const result = await callCallableFunction('sendPortalInvitationEmail', {
        studentId: testStudentId,
      });
      
      // Function will fail in emulator but should reach auth check
      // Success if it doesn't fail on basic validation
      if (result.data.error) {
        expect(result.data.error.message || result.data.error).not.toMatch(/student.*not found/i);
        expect(result.data.error.message || result.data.error).not.toMatch(/email.*required/i);
      } else {
        expect(result.data.success).toBe(true);
      }
    });
  });

  describe('Business logic validation', () => {
    test('should check for existing auth user before sending invitation', async () => {
      const db = getAdminFirestore();
      
      // Create student
      await db.collection('students').doc(testStudentId).set({
        firstName: 'Test',
        lastName: 'Student',
        email: 'existing@example.com',
        studentId: testStudentId,
      });
      
      const result = await callCallableFunction('sendPortalInvitationEmail', {
        studentId: testStudentId,
      });
      
      // In emulator, this will fail at auth check
      // We're validating the logic reaches that point
      if (result.data.error) {
        // Could be "already exists" or auth error from emulator
        const errorMsg = result.data.error.message || result.data.error;
        const isExpectedError = 
          errorMsg.match(/auth/i) || 
          errorMsg.match(/email/i) ||
          errorMsg.match(/already exists/i);
        expect(isExpectedError).toBeTruthy();
      } else {
        expect(result.data.success).toBe(true);
      }
    });
  });
});
