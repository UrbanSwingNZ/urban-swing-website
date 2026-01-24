/**
 * Integration Tests for update-class-date Cloud Function
 * 
 * Tests the Callable function for updating class dates on prepaid casual transactions
 */

const {
  setupTestEnvironment,
  clearFirestore,
  cleanupTestEnvironment,
  seedFirestore,
  getAdminFirestore,
} = require('./setup');

const {
  callCallableFunction,
} = require('./helpers/http-helpers');

const {
  testStudent: testStudents,
} = require('./helpers/test-data');

// Get the first student from the testStudent object
const testStudentData = Object.values(testStudents)[0];

const admin = require('firebase-admin');

// TODO: Fix auth context for v1 Callable functions in emulator
// Auth mocking doesn't work the same way for v1 onCall functions
// Skipping these tests until we implement proper v1 auth context handling
describe.skip('update-class-date Integration Tests', () => {
  let testUserId;
  let testTransactionId;
  let adminUserId;

  beforeAll(async () => {
    await setupTestEnvironment();
    testUserId = 'test-user-123';
    adminUserId = 'admin-user-456';
  });

  beforeEach(async () => {
    await clearFirestore();
    
    const db = getAdminFirestore();
    
    // Create test student user
    await db.collection('users').doc(testUserId).set({
      email: testStudentData.email,
      firstName: testStudentData.firstName,
      lastName: testStudentData.lastName,
      studentId: 'STU-001',
      role: 'student',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create admin user
    await db.collection('users').doc(adminUserId).set({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create test casual transaction (prepaid, not used)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const txRef = await db.collection('transactions').add({
      userId: testUserId,
      studentId: 'STU-001',
      type: 'casual-entry',
      classDate: admin.firestore.Timestamp.fromDate(tomorrow),
      amount: 2500,
      paymentIntentId: 'pi_test_123',
      status: 'succeeded',
      usedForCheckin: false,
      reversed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    testTransactionId = txRef.id;
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('Authentication', () => {
    test('should reject unauthenticated requests', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, null); // No auth context
      
      // Should return error in response (not throw)
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/unauthenticated|auth/i);
    });
  });

  describe('Authorization', () => {
    test('should allow student to update their own transaction', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.success).toBe(true);
      
      // Verify the date was updated
      const db = getAdminFirestore();
      const txDoc = await db.collection('transactions').doc(testTransactionId).get();
      const updatedDate = txDoc.data().classDate.toDate();
      expect(updatedDate.toDateString()).toBe(newDate.toDateString());
    });

    test('should allow admin to update any transaction', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 3);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: adminUserId });
      
      expect(result.data.success).toBe(true);
    });

    test('should reject update from different non-admin student', async () => {
      const db = getAdminFirestore();
      const otherUserId = 'other-user-789';
      
      // Create another student user
      await db.collection('users').doc(otherUserId).set({
        email: 'other@test.com',
        firstName: 'Other',
        lastName: 'Student',
        studentId: 'STU-002',
        role: 'student',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: otherUserId });
      
      // Should return error in response
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/permission|denied/i);
    });

    test('should allow front-desk role to update transactions', async () => {
      const db = getAdminFirestore();
      const frontDeskUserId = 'frontdesk-user-999';
      
      await db.collection('users').doc(frontDeskUserId).set({
        email: 'frontdesk@test.com',
        firstName: 'Front',
        lastName: 'Desk',
        role: 'front-desk',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: frontDeskUserId });
      
      expect(result.data.success).toBe(true);
    });
  });

  describe('Input validation', () => {
    test('should reject missing transactionId', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/invalid|argument|transactionId/i);
    });

    test('should reject missing newClassDate', async () => {
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
      }, { uid: testUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/invalid|argument|date/i);
    });

    test('should reject non-existent transaction', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: 'non-existent-id',
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/not.found|does not exist/i);
    });
  });

  describe('Transaction type validation', () => {
    test('should reject non-casual transaction types', async () => {
      const db = getAdminFirestore();
      
      // Create a concession transaction
      const txRef = await db.collection('transactions').add({
        userId: testUserId,
        studentId: 'STU-001',
        type: 'concession-package',
        packageType: 'package-5',
        amount: 10000,
        paymentIntentId: 'pi_test_456',
        status: 'succeeded',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: txRef.id,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/invalid|casual|type/i);
    });
  });

  describe('Transaction state validation', () => {
    test('should reject reversed transactions', async () => {
      const db = getAdminFirestore();
      
      // Update transaction to reversed
      await db.collection('transactions').doc(testTransactionId).update({
        reversed: true,
      });
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/reversed|precondition/i);
    });

    test('should reject transactions already used for check-in', async () => {
      const db = getAdminFirestore();
      
      // Update transaction to checked in
      await db.collection('transactions').doc(testTransactionId).update({
        usedForCheckin: true,
      });
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.error).toBeDefined();
      expect(result.data.error.message || result.data.error).toMatch(/checked.?in|precondition/i);
    });
  });

  describe('Date validation', () => {
    test('should accept valid ISO date string', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 5);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.success).toBe(true);
    });

    test('should update the classDate field correctly', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 7);
      newDate.setHours(19, 0, 0, 0); // Set to 7pm for clear comparison
      
      await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      const db = getAdminFirestore();
      const txDoc = await db.collection('transactions').doc(testTransactionId).get();
      const updatedDate = txDoc.data().classDate.toDate();
      
      // Compare date parts (ignore milliseconds)
      expect(updatedDate.getFullYear()).toBe(newDate.getFullYear());
      expect(updatedDate.getMonth()).toBe(newDate.getMonth());
      expect(updatedDate.getDate()).toBe(newDate.getDate());
    });

    test('should set updatedAt timestamp', async () => {
      const db = getAdminFirestore();
      
      // Get initial state
      const beforeDoc = await db.collection('transactions').doc(testTransactionId).get();
      const beforeUpdatedAt = beforeDoc.data().updatedAt;
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 4);
      
      await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      // Check updatedAt was set
      const afterDoc = await db.collection('transactions').doc(testTransactionId).get();
      const afterUpdatedAt = afterDoc.data().updatedAt;
      
      expect(afterUpdatedAt).toBeDefined();
      if (beforeUpdatedAt) {
        expect(afterUpdatedAt.toMillis()).toBeGreaterThan(beforeUpdatedAt.toMillis());
      }
    });
  });

  describe('Success responses', () => {
    test('should return success with message', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      
      const result = await callCallableFunction('updateClassDate', {
        transactionId: testTransactionId,
        newClassDate: newDate.toISOString(),
      }, { uid: testUserId });
      
      expect(result.data.success).toBe(true);
      expect(result.data.message).toBeDefined();
      expect(typeof result.data.message).toBe('string');
    });
  });
});
