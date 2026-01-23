/**
 * Tests for stripe/stripe-payment.js
 */

// Create shared mock instances
const { createMockStripe } = require('../test-helpers/mock-stripe');
const { createMockFirebaseAdmin } = require('../test-helpers/mock-firebase');
const { testStudent, testCasualRates, testConcessionPackages } = require('../test-helpers/test-data');

// Create mock instances ONCE
const mockStripe = createMockStripe();
const mockAdmin = createMockFirebaseAdmin({
  casualRates: testCasualRates,
  concessionPackages: testConcessionPackages
});

// Mock modules to return the shared instances
jest.mock('stripe', () => jest.fn(() => mockStripe));
jest.mock('firebase-admin', () => mockAdmin);

// Now require the module under test
const { createCustomer, processPayment, refundPayment } = require('../../stripe/stripe-payment');

describe('stripe-payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a Stripe customer with student data', async () => {
      const studentData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '021 123 4567',
        studentId: 'student-123'
      };

      const result = await createCustomer(studentData);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '021 123 4567',
        metadata: {
          source: 'student-portal-registration',
          studentId: 'student-123'
        }
      });

      expect(result.id).toBe('cus_test123');
      expect(result.email).toBe('test@example.com');
    });

    it('should handle missing phone number', async () => {
      const studentData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        studentId: 'student-456'
      };

      await createCustomer(studentData);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'jane@example.com',
        name: 'Jane Smith',
        phone: undefined,
        metadata: {
          source: 'student-portal-registration',
          studentId: 'student-456'
        }
      });
    });

    it('should handle missing studentId', async () => {
      const studentData = {
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com'
      };

      await createCustomer(studentData);

      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            studentId: 'pending'
          })
        })
      );
    });

    it('should throw error if Stripe customer creation fails', async () => {
      mockStripe.customers.create.mockRejectedValueOnce(
        new Error('Stripe API error')
      );

      const studentData = {
        firstName: 'Error',
        lastName: 'Test',
        email: 'error@example.com'
      };

      await expect(createCustomer(studentData)).rejects.toThrow(
        'Failed to create customer: Stripe API error'
      );
    });
  });

  describe('processPayment', () => {
    const paymentData = {
      customerId: 'cus_test123',
      paymentMethodId: 'pm_test123',
      packageId: '5-class',
      studentData: {
        firstName: 'Test',
        lastName: 'Student',
        email: 'test@example.com'
      }
    };

    it('should process a successful payment', async () => {
      const result = await processPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('pi_test123');
      expect(result.amount).toBe(5500);
      expect(result.currency).toBe('nzd');
      expect(result.receiptUrl).toBeDefined();
    });

    it('should attach payment method to customer', async () => {
      await processPayment(paymentData);

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test123', {
        customer: 'cus_test123'
      });
    });

    it('should set payment method as default', async () => {
      await processPayment(paymentData);

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        invoice_settings: {
          default_payment_method: 'pm_test123'
        }
      });
    });

    it('should create payment intent with correct metadata', async () => {
      await processPayment(paymentData);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5500,
          currency: 'nzd',
          customer: 'cus_test123',
          payment_method: 'pm_test123',
          confirm: true,
          off_session: true,
          description: 'Urban Swing - 5 Classes',
          metadata: expect.objectContaining({
            studentName: 'Test Student',
            studentEmail: 'test@example.com',
            packageId: '5-class',
            packageName: '5 Classes',
            packageType: 'concession-package',
            source: 'student-portal-registration'
          }),
          receipt_email: 'test@example.com'
        })
      );
    });

    it('should throw error for invalid package ID', async () => {
      const invalidPaymentData = {
        ...paymentData,
        packageId: 'invalid-package'
      };

      await expect(processPayment(invalidPaymentData)).rejects.toThrow(
        'Invalid package ID: invalid-package'
      );
    });

    it('should handle payment requiring additional authentication', async () => {
      mockStripe.paymentIntents.create.mockResolvedValueOnce({
        id: 'pi_test123',
        status: 'requires_action',
        client_secret: 'pi_test123_secret'
      });

      const result = await processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.requiresAction).toBe(true);
      expect(result.clientSecret).toBe('pi_test123_secret');
      expect(result.error).toBe('Payment requires additional authentication');
    });

    it('should handle failed payment status', async () => {
      mockStripe.paymentIntents.create.mockResolvedValueOnce({
        id: 'pi_test123',
        status: 'failed'
      });

      const result = await processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed with status: failed');
    });

    it('should handle Stripe card errors', async () => {
      const cardError = new Error('Your card was declined');
      cardError.type = 'StripeCardError';
      cardError.code = 'card_declined';

      mockStripe.paymentIntents.create.mockRejectedValueOnce(cardError);

      const result = await processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Your card was declined');
      expect(result.stripeError).toBe('card_declined');
    });

    it('should handle Stripe invalid request errors', async () => {
      const invalidError = new Error('Invalid payment method');
      invalidError.type = 'StripeInvalidRequestError';

      mockStripe.paymentIntents.create.mockRejectedValueOnce(invalidError);

      const result = await processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid payment information');
    });

    it('should handle generic Stripe errors', async () => {
      const genericError = new Error('Network error');
      genericError.type = 'StripeConnectionError';

      mockStripe.paymentIntents.create.mockRejectedValueOnce(genericError);

      const result = await processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment processing failed');
    });

    it('should include returnUrl if provided', async () => {
      const paymentDataWithUrl = {
        ...paymentData,
        returnUrl: 'https://example.com/success'
      };

      await processPayment(paymentDataWithUrl);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: 'https://example.com/success'
        })
      );
    });

    it('should process payment for casual rate', async () => {
      const casualPaymentData = {
        ...paymentData,
        packageId: 'casual-standard'
      };

      const result = await processPayment(casualPaymentData);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(1500); // $15 in cents
    });

    it('should fetch current pricing from Firestore', async () => {
      // This test ensures fetchPricing is called
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await processPayment(paymentData);

      // fetchPricing logs when fetching
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fetched packages from Firestore:',
        expect.any(Array)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('refundPayment', () => {
    it('should create a refund successfully', async () => {
      const result = await refundPayment('pi_test123', 'requested_by_customer');

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        reason: 'requested_by_customer'
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('ref_test123');
      expect(result.status).toBe('succeeded');
    });

    it('should use default reason if not provided', async () => {
      await refundPayment('pi_test123');

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        reason: 'requested_by_customer'
      });
    });

    it('should handle refund creation errors', async () => {
      mockStripe.refunds.create.mockRejectedValueOnce(
        new Error('Refund already processed')
      );

      const result = await refundPayment('pi_test123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refund already processed');
    });

    it('should accept different refund reasons', async () => {
      await refundPayment('pi_test123', 'duplicate');

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        reason: 'duplicate'
      });
    });
  });
});
