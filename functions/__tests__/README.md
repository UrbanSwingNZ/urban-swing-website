# Functions Unit Tests

This directory contains unit tests for Firebase Cloud Functions.

## Setup

Install dependencies (from the functions directory):

```bash
cd functions
npm install
```

The following test dependencies are configured in `package.json`:
- `jest` - Test framework
- `@types/jest` - TypeScript definitions for Jest
- `firebase-functions-test` - Firebase Functions testing utilities

## Running Tests

```bash
# From the root directory
npm test

# From the functions directory
cd functions
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/unittests/
├── setup.js                    # Jest setup and environment variables
├── test-helpers/
│   ├── mock-firebase.js        # Firebase Admin SDK mocks
│   ├── mock-stripe.js          # Stripe SDK mocks
│   └── test-data.js            # Test fixtures and data
├── stripe/
│   ├── stripe-config.test.js   # Tests for pricing fetch logic
│   └── stripe-payment.test.js  # Tests for payment processing
└── utils/
    └── transaction-utils.test.js # Tests for transaction utilities
```

## Test Coverage

Current test coverage focuses on high-priority areas:

### ✅ Completed (39 tests passing)
- **transaction-utils.js** - Transaction type determination logic (8 tests)
- **stripe-config.js** - Firestore pricing fetch and filtering (10 tests)
- **stripe-payment.js** - Payment processing, customer creation, refunds (21 tests)

### 🔄 In Progress
- process-casual-payment.js
- process-concession-purchase.js
- email-notifications.js

### 📋 Planned
- create-student-payment.js
- process-refund.js
- Integration tests with Firebase emulators

## Writing New Tests

### Basic Test Structure

```javascript
const { functionToTest } = require('../../../functions/path/to/module');
const { createMockFirebaseAdmin } = require('../test-helpers/mock-firebase');
const { createMockStripe } = require('../test-helpers/mock-stripe');

// Mock dependencies
jest.mock('firebase-admin', () => createMockFirebaseAdmin());
jest.mock('stripe', () => jest.fn(() => createMockStripe()));

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should do something', () => {
      const result = functionToTest();
      expect(result).toBe(expected);
    });
  });
});
```

### Using Test Data

```javascript
const { testStudent, testCasualRates, expectedPricing } = require('../test-helpers/test-data');

// Use in tests
const mockAdmin = createMockFirebaseAdmin({
  students: { 'student-123': testStudent },
  casualRates: testCasualRates
});
```

## Mocking Firebase

The test helpers provide comprehensive Firebase mocking:

```javascript
const mockAdmin = createMockFirebaseAdmin({
  // Mock collections with documents
  students: {
    'student-123': { firstName: 'John', lastName: 'Doe' }
  },
  transactions: {
    'trans-456': { amount: 5500, status: 'completed' }
  }
});

// Mock Firestore queries are supported
const snapshot = await mockAdmin.firestore()
  .collection('students')
  .where('email', '==', 'test@example.com')
  .get();
```

## Mocking Stripe

```javascript
const mockStripe = createMockStripe();

// Customize mock behavior
mockStripe.paymentIntents.create.mockResolvedValueOnce({
  id: 'pi_custom',
  status: 'succeeded',
  amount: 1500
});

// Simulate errors
mockStripe.customers.create.mockRejectedValueOnce(
  new Error('Card declined')
);
```

## Best Practices

1. **Clear mocks between tests** - Use `beforeEach(() => jest.clearAllMocks())`
2. **Test edge cases** - Missing data, errors, invalid inputs
3. **Mock external APIs** - Never make real Stripe or Firebase calls in unit tests
4. **Descriptive test names** - Use "should..." format
5. **One assertion per test** - Makes failures easier to debug
6. **Arrange-Act-Assert pattern** - Clear test structure

## Debugging Tests

```bash
# Run a specific test file
npm test -- stripe-config.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="fetchPricing"

# Run with verbose output
npm test -- --verbose

# Run in debug mode (use with Chrome DevTools)
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

Tests run automatically on:
- Every commit (via GitHub Actions)
- Pull requests
- Before deployments

Minimum coverage requirements:
- Overall: 60%
- Critical functions (payment processing): 80%

## Troubleshooting

### "Cannot find module" errors
Tests are now located in `tests/unittests/` and require modules from `functions/`.
The jest config handles the path resolution automatically.

### Mock not working
Ensure mocks are set up BEFORE requiring the module under test:
```javascript
// ✅ Correct
jest.mock('firebase-admin', () => mockAdmin);
const { myFunction } = require('../../../functions/my-module');

// ❌ Wrong
const { myFunction } = require('../../../functions/my-module');
jest.mock('firebase-admin', () => mockAdmin);
```

### Tests timing out
Increase timeout in jest.config.js or for specific tests:
```javascript
it('slow test', async () => {
  // ...
}, 30000); // 30 second timeout
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Firebase Functions Testing Guide](https://firebase.google.com/docs/functions/unit-testing)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Testing Strategy](../TESTING_STRATEGY.md)
