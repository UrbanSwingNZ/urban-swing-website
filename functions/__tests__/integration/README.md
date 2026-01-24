# Integration Tests

Integration tests for Cloud Functions using Firebase Emulator Suite.

## Overview

These tests validate the end-to-end behavior of Cloud Functions including:
- HTTP request handling and CORS
- Request validation and error handling
- Database interactions and state changes
- Duplicate detection logic
- Integration between functions and Firestore

## Setup

### Prerequisites

1. Firebase CLI installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. Firebase emulators initialized:
   ```bash
   firebase init emulators
   ```

### Running Tests

#### Option 1: Manual Emulator Start (Recommended for development)

1. Start the emulators in one terminal:
   ```bash
   cd functions
   npm run emulators
   ```

2. In another terminal, run the integration tests:
   ```bash
   cd functions
   npm run test:integration
   ```

#### Option 2: Automatic Emulator (Single command)

Run tests with automatic emulator start/stop:
```bash
cd functions
npm run test:integration:emulator
```

Note: This is slower as it starts/stops emulators for each test run.

### Running All Tests

To run both unit and integration tests:
```bash
cd functions
npm test
```

To run only unit tests:
```bash
cd functions
npm run test:unit
```

## Test Status

**Total Tests**: 343 (294 passing, 49 skipped)
- **Unit Tests**: 243 passing
- **Integration Tests**: 51 passing, 49 skipped

### Coverage by Function

✅ **Fully Tested (51 passing tests)**:
- `process-casual-payment` (11 tests) - Casual entry payments with duplicate detection
- `process-concession-purchase` (14 tests) - Concession package purchases
- `create-student-payment` (19 tests) - Student registration with payment **[Bug fixes validated]**
- `process-refund` (14 tests) - Payment refunds and reversals
- `get-available-packages` (6 tests) - Package availability queries
- `update-class-date` (15 tests, all skipped - v1 onCall auth issues)

⏭️ **Documented but Skipped (36 tests)** - Cannot test in emulator:
- `user-management` (9 tests) - Admin functions to disable/enable accounts
- `send-portal-invitation` (10 tests) - Portal invitation emails
- `manage-auth-users` (17 tests) - Super-admin user management

### Critical Bug Fixes Validated

Integration tests discovered and validated fixes for validation order bugs:

1. **create-student-payment.js**: Now checks duplicate email **before** calling expensive Stripe API
   - Users get helpful 409 "already exists" instead of generic 500 error
   - Prevents unnecessary Stripe API calls

2. **process-casual-payment.js**: Now checks duplicate booking **before** calling Stripe
   - Better UX with immediate feedback
   - Added date format handling (Timestamp and ISO string)

## Test Structure

```
__tests__/
├── integration/
│   ├── setup.js                              # Firebase Test Environment setup
│   ├── helpers/
│   │   ├── http-helpers.js                   # HTTP request helpers
│   │   └── test-data.js                      # Shared test data
│   ├── process-casual-payment.integration.test.js       (11 passing)
│   ├── process-concession-purchase.integration.test.js  (14 passing)
│   ├── create-student-payment.integration.test.js       (19 passing)
│   ├── process-refund.integration.test.js               (14 passing)
│   ├── get-available-packages.integration.test.js       (6 passing)
│   ├── update-class-date.integration.test.js            (15 skipped - auth)
│   ├── user-management.integration.test.js              (9 skipped - auth)
│   ├── send-portal-invitation.integration.test.js       (10 skipped - email/auth)
│   └── manage-auth-users.integration.test.js            (17 skipped - token.email)
├── frontend/                    # Unit tests for frontend code
├── stripe/                      # Unit tests for Stripe utilities
└── utils/                       # Unit tests for utility functions
```

## Writing Integration Tests

### Basic Test Structure

```javascript
const {
  setupTestEnvironment,
  clearFirestore,
  cleanupTestEnvironment,
  seedFirestore,
} = require('../setup');

const { callFunction } = require('../helpers/http-helpers');

describe('My Function Integration Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  beforeEach(async () => {
    await clearFirestore();
    // Seed test data
    await seedFirestore({
      myCollection: {
        'doc-1': { field: 'value' },
      },
    });
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  test('should do something', async () => {
    const response = await callFunction('myFunction', {
      data: 'value',
    });
    
    expect(response.status).toBe(200);
  });
});
```

### Testing Database State

```javascript
const { getAdminFirestore } = require('../setup');

test('should create transaction in Firestore', async () => {
  const response = await callFunction('myFunction', { ... });
  
  // Verify database state using admin Firestore
  const db = getAdminFirestore();
  const doc = await db.collection('transactions').doc('trans-1').get();
  
  expect(doc.exists).toBe(true);
  expect(doc.data().amount).toBe(100);
});
```

### Adding Data Mid-Test (Preserving Existing Collections)

When you need to add data during a test without clearing existing seeded data:

```javascript
const { getAdminFirestore } = require('../setup');

test('should handle existing data', async () => {
  // Don't use seedFirestore() mid-test - it replaces ALL collections!
  // Instead, use getAdminFirestore() to add documents:
  const db = getAdminFirestore();
  
  await db.collection('students').doc('new-student').set({
    email: 'test@example.com',
    firstName: 'Test',
  });
  
  // Now test with the additional data
  const response = await callFunction('myFunction', {
    studentId: 'new-student',
  });
  
  expect(response.status).toBe(200);
});
```

**Important**: Never call `seedFirestore()` during a test (after beforeEach) unless you include ALL collections you need. It replaces the entire database, not just the collections you specify.

## Emulator Ports

- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Emulator UI: http://localhost:4000

## Important Notes

1. **Emulator Required**: Integration tests will not work without the Firebase emulator running
2. **Test Isolation**: Each test clears Firestore to ensure isolation
3. **Serial Execution**: Integration tests run serially to avoid conflicts
4. **Stripe Mocking**: Real Stripe API calls are not made; payment tests focus on validation and flow
5. **Security Rules**: Tests use `withSecurityRulesDisabled()` for seeding data
6. **Skipped Tests**: 49 tests are skipped due to Firebase Emulator limitations:
   - Auth operations (`admin.auth()`) don't work fully in emulator
   - Email sending not available in emulator
   - Token email verification (`context.auth.token.email`) not available in v2 callable functions
   - v1 `onCall` auth context doesn't work properly in emulator

### Why Some Tests Are Skipped

The Firebase Emulator has limitations that prevent testing certain functions:

**Auth Operations** (`user-management`, `manage-auth-users`):
- `admin.auth().updateUser()`, `disableUser()`, etc. don't work properly
- These require end-to-end testing in a staging environment

**Email Sending** (`send-portal-invitation`):
- Email services (SendGrid, Firebase Extensions) don't work in emulator
- Requires integration testing with real email provider

**Token Email Verification** (`manage-auth-users`):
- v2 callable functions can't verify `context.auth.token.email` in emulator
- Super-admin email restriction (dance@urbanswing.co.nz) can't be tested

**v1 onCall Auth Context** (`update-class-date`):
- v1 `functions.https.onCall` auth context not working in emulator
- Function works in production but can't be integration tested locally

## Troubleshooting

### Emulator Not Starting

```bash
# Check if port is in use
netstat -ano | findstr :5001
netstat -ano | findstr :8080

# Kill process if needed
taskkill /PID <pid> /F
```

### Tests Timeout

- Increase timeout in jest.config.js
- Check emulator is running: http://localhost:4000
- Verify function is deployed to emulator

### Connection Refused

- Ensure emulators are running before tests
- Check ports in firebase.json match test configuration
- Verify FIREBASE_PROJECT_ID environment variable

## Future Enhancements

- [x] ~~Add Auth emulator for testing authenticated calls~~ (Limited by emulator capabilities)
- [x] Test duplicate detection logic (Validated - bug fixes applied!)
- [ ] Add Stripe test mode integration for actual payment flow testing
- [ ] End-to-end testing in staging environment for Auth/email functions
- [ ] Add email verification tests (requires real email service)
- [ ] Test rate limiting and throttling
- [ ] Add performance benchmarks
- [ ] Fix v1 onCall auth context issues or migrate to v2
- [ ] Investigate test isolation issues causing flaky tests
