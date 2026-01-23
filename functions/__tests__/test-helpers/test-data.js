/**
 * Test data fixtures
 */

// Test student data
const testStudent = {
  studentId: 'student-test-123',
  firstName: 'Test',
  lastName: 'Student',
  email: 'test.student@urbanswing.co.nz',
  phone: '021 123 4567',
  stripeCustomerId: 'cus_test123',
  concessionBalance: 5,
  expiredConcessions: 0
};

// Test casual rates
const testCasualRates = {
  'casual-standard': {
    name: 'Casual Entry',
    price: 15,
    isActive: true,
    isPromo: false,
    displayOrder: 1,
    description: 'Standard casual entry'
  },
  'casual-student': {
    name: 'Student Casual Entry',
    price: 12,
    isActive: true,
    isPromo: false,
    displayOrder: 2,
    description: 'Casual entry for students with valid student ID'
  },
  'casual-promo': {
    name: 'PROMO - Casual Entry',
    price: 10,
    isActive: true,
    isPromo: true,
    displayOrder: 3,
    description: 'Promotional casual entry rate'
  },
  'casual-inactive': {
    name: 'Inactive Casual Rate',
    price: 20,
    isActive: false,
    isPromo: false,
    displayOrder: 4,
    description: 'This rate should not be fetched'
  }
};

// Test concession packages
const testConcessionPackages = {
  '5-class': {
    name: '5 Classes',
    price: 55,
    numberOfClasses: 5,
    expiryMonths: 6,
    isActive: true,
    isPromo: false,
    showOnRegistration: true,
    displayOrder: 1,
    description: '5 class concession valid for 6 months'
  },
  '10-class': {
    name: '10 Classes',
    price: 100,
    numberOfClasses: 10,
    expiryMonths: 9,
    isActive: true,
    isPromo: false,
    showOnRegistration: true,
    displayOrder: 2,
    description: '10 class concession valid for 9 months'
  },
  'promo-8-class': {
    name: 'PROMO - 8 Classes',
    price: 60,
    numberOfClasses: 8,
    expiryMonths: 6,
    isActive: true,
    isPromo: true,
    showOnRegistration: false,
    displayOrder: 3,
    description: 'Promotional package'
  },
  'inactive-package': {
    name: 'Inactive Package',
    price: 50,
    numberOfClasses: 5,
    expiryMonths: 6,
    isActive: false,
    isPromo: false,
    showOnRegistration: false,
    displayOrder: 4
  }
};

// Expected pricing format (after fetchPricing())
const expectedPricing = {
  'casual-standard': {
    price: 1500, // in cents
    name: 'Casual Entry',
    type: 'casual-rate',
    description: 'Standard casual entry'
  },
  'casual-student': {
    price: 1200,
    name: 'Student Casual Entry',
    type: 'casual-rate',
    description: 'Casual entry for students with valid student ID'
  },
  '5-class': {
    price: 5500,
    name: '5 Classes',
    type: 'concession-package',
    numberOfClasses: 5,
    expiryMonths: 6,
    description: '5 class concession valid for 6 months'
  },
  '10-class': {
    price: 10000,
    name: '10 Classes',
    type: 'concession-package',
    numberOfClasses: 10,
    expiryMonths: 9,
    description: '10 class concession valid for 9 months'
  },
  'promo-8-class': {
    price: 6000,
    name: 'PROMO - 8 Classes',
    type: 'concession-package',
    numberOfClasses: 8,
    expiryMonths: 6,
    description: 'Promotional package'
  }
};

// Stripe test card numbers
const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficientFunds: '4000000000009995',
  requiresAuth: '4000002500003155',
  expiredCard: '4000000000000069'
};

module.exports = {
  testStudent,
  testCasualRates,
  testConcessionPackages,
  expectedPricing,
  STRIPE_TEST_CARDS
};
