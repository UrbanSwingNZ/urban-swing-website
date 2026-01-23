/**
 * Mock Stripe SDK for testing
 */

function createMockStripe() {
  return {
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test Student',
        metadata: {}
      }),
      update: jest.fn().mockResolvedValue({
        id: 'cus_test123'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com'
      })
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({
        id: 'pm_test123',
        customer: 'cus_test123'
      })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
        amount: 5500,
        currency: 'nzd',
        charges: {
          data: [{
            receipt_url: 'https://stripe.com/receipts/test123'
          }]
        }
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'ref_test123',
        status: 'succeeded',
        amount: 5500
      })
    }
  };
}

module.exports = {
  createMockStripe
};
