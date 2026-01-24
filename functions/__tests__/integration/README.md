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

## Test Structure

```
__tests__/
├── integration/
│   ├── setup.js                 # Firebase Test Environment setup
│   ├── helpers/
│   │   ├── http-helpers.js      # HTTP request helpers
│   │   └── test-data.js         # Shared test data
│   ├── process-casual-payment.integration.test.js
│   ├── process-concession-purchase.integration.test.js
│   └── process-refund.integration.test.js
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
const { getAuthenticatedFirestore } = require('../setup');

test('should create transaction in Firestore', async () => {
  const response = await callFunction('myFunction', { ... });
  
  // Verify database state
  const db = getAuthenticatedFirestore();
  const doc = await db.collection('transactions').doc('trans-1').get();
  
  expect(doc.exists).toBe(true);
  expect(doc.data().amount).toBe(100);
});
```

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

- [ ] Add Stripe test mode integration
- [ ] Add Auth emulator for testing authenticated calls
- [ ] Add email verification tests
- [ ] Test rate limiting and throttling
- [ ] Add performance benchmarks
