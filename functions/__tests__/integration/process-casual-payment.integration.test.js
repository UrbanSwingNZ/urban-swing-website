/**
 * Integration Tests for process-casual-payment Cloud Function
 * 
 * Tests the HTTP endpoint for processing casual entry payments
 */

const {
  setupTestEnvironment,
  clearFirestore,
  cleanupTestEnvironment,
  seedFirestore,
} = require('../setup');

const {
  callFunction,
} = require('../helpers/http-helpers');

const {
  casualRates,
  testStudent,
} = require('../helpers/test-data');

describe('process-casual-payment Integration Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  beforeEach(async () => {
    await clearFirestore();
    
    // Seed required data
    await seedFirestore({
      casualRates,
      students: testStudent,
    });
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('Request validation', () => {
    test('should reject GET requests', async () => {
      const response = await callFunction('processCasualPayment', {}, { method: 'GET' });
      
      expect(response.status).toBe(405);
      expect(response.data.error).toBe('Method not allowed');
    });

    test('should reject requests without studentId', async () => {
      const response = await callFunction('processCasualPayment', {
        rateId: 'casual-standard',
        classDate: new Date().toISOString(),
        paymentMethodId: 'pm_test_123',
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Missing student ID');
    });

    test('should reject requests without rateId', async () => {
      const response = await callFunction('processCasualPayment', {
        studentId: 'test-student-456',
        classDate: new Date().toISOString(),
        paymentMethodId: 'pm_test_123',
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Missing rate ID');
    });

    test('should reject requests without classDate', async () => {
      const response = await callFunction('processCasualPayment', {
        studentId: 'test-student-456',
        rateId: 'casual-standard',
        paymentMethodId: 'pm_test_123',
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Missing class date');
    });

    test('should reject requests without paymentMethodId', async () => {
      const response = await callFunction('processCasualPayment', {
        studentId: 'test-student-456',
        rateId: 'casual-standard',
        classDate: new Date().toISOString(),
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Missing payment method');
    });

    test('should reject requests with non-existent studentId', async () => {
      const response = await callFunction('processCasualPayment', {
        studentId: 'non-existent-student',
        rateId: 'casual-standard',
        classDate: new Date().toISOString(),
        paymentMethodId: 'pm_test_123',
      });
      
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Student not found');
    });

    test('should reject requests with invalid rateId', async () => {
      const response = await callFunction('processCasualPayment', {
        studentId: 'test-student-456',
        rateId: 'invalid-rate',
        classDate: new Date().toISOString(),
        paymentMethodId: 'pm_test_123',
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid rate ID');
    });
  });

  describe('CORS headers', () => {
    test('should include CORS headers in response', async () => {
      const response = await callFunction('processCasualPayment', {
        studentId: 'test-student-456',
        rateId: 'casual-standard',
        classDate: new Date().toISOString(),
        paymentMethodId: 'pm_test_123',
      }, {
        headers: {
          'Origin': 'http://localhost:3000',
        },
      });
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle preflight OPTIONS requests', async () => {
      const response = await callFunction('processCasualPayment', {}, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });
      
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Duplicate detection', () => {
    test('should detect duplicate casual payment for same date', async () => {
      // Create first transaction
      await seedFirestore({
        transactions: {
          'trans-1': {
            studentId: 'test-student-456',
            type: 'casual',
            classDate: new Date('2026-01-23').toISOString(),
            createdAt: new Date(),
          },
        },
      });

      // Attempt duplicate payment
      const response = await callFunction('processCasualPayment', {
        studentId: 'test-student-456',
        rateId: 'casual-standard',
        classDate: '2026-01-23T10:00:00.000Z',
        paymentMethodId: 'pm_test_123',
      });
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('already paid');
    });

    test('should allow casual payment for different dates', async () => {
      // Create transaction for different date
      await seedFirestore({
        transactions: {
          'trans-1': {
            studentId: 'test-student-456',
            type: 'casual',
            classDate: new Date('2026-01-22').toISOString(),
            createdAt: new Date(),
          },
        },
      });

      // Different date should succeed (would fail at payment processing in real test)
      const response = await callFunction('processCasualPayment', {
        studentId: 'test-student-456',
        rateId: 'casual-standard',
        classDate: '2026-01-23T10:00:00.000Z',
        paymentMethodId: 'pm_test_123',
      });
      
      // Will fail at Stripe payment step, but passes duplicate check
      expect(response.status).not.toBe(400);
      expect(response.data.error).not.toContain('already paid');
    });
  });

  // Note: Stripe payment processing tests would require Stripe test mode
  // or mocking, which is beyond basic integration testing
  // These tests validate the request handling, validation, and duplicate detection
});
