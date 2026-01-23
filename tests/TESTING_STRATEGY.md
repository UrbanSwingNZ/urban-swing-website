# Urban Swing Testing Strategy

**Created:** January 23, 2026  
**Last Updated:** January 24, 2026  
**Status:** Phase 1 Complete - Unit Tests Implemented ✅

---

## Implementation Status

### ✅ Phase 1: Unit Tests - COMPLETE
- **39 unit tests** implemented and passing ✅
- **3 test suites** covering critical payment utilities
- Located in `functions/__tests__/`
- Run via `npm test` from root or functions directory
- Test coverage includes:
  - Transaction type determination (8 tests)
  - Stripe configuration and pricing (10 tests)
  - Payment processing and refunds (21 tests)
- **Note**: Complex HTTP/Callable Cloud Functions deferred to Phase 2 (Integration Tests)

### 🔄 Phase 2: Integration Tests - PLANNED
- Integration tests with Firebase Emulator - Planned
- Will test: process-casual-payment, process-concession-purchase, create-student-payment, process-refund
- Real HTTP calls to local functions with emulated Firestore

### 🔄 Phase 3-4: E2E & Security - PLANNED
- E2E tests with Playwright - Planned
- Firestore security rules tests - Planned

---

## Executive Summary

The Urban Swing website requires a comprehensive multi-layered testing approach due to:
- **Critical financial transactions** (Stripe payments)
- **Complex business logic** (concessions, check-ins, validations)
- **Multiple user interfaces** (public site, student portal, admin portal)

**Priority Order:** Backend/Cloud Functions → Frontend Integration → E2E

---

## 1. Unit Tests (HIGH PRIORITY ⭐)

### Firebase Cloud Functions - MOST CRITICAL

**Why:** These handle payments, transactions, and data integrity. Bugs here = financial loss and data corruption.

#### Files Requiring Unit Tests

**Payment Processing:**
- ✅ `functions/stripe/stripe-payment.js` - Core payment processing (**21 tests**)
  - Customer creation (4 tests)
  - Payment processing (13 tests)
  - Refund operations (4 tests)
- 🔄 `functions/process-casual-payment.js` - **Integration tests only** (onRequest function)
- 🔄 `functions/process-concession-purchase.js` - **Integration tests only** (onRequest function)
- 🔄 `functions/create-student-payment.js` - **Integration tests only** (onRequest function)
- 🔄 `functions/process-refund.js` - **Integration tests only** (onCall function)

**Configuration & Utilities:**
- ✅ `functions/stripe/stripe-config.js` - Pricing fetch logic from Firestore (**10 tests**)
- ✅ `functions/utils/transaction-utils.js` - Transaction type determination (**8 tests**)
- ⏳ `functions/email-notifications.js` - Email notification logic (TODO - callable function)
- ⏳ `functions/user-management.js` - User CRUD operations (TODO - callable function)

#### Testing Priorities

1. ✅ **Payment validation** - IMPLEMENTED
   - Amount calculations from Firestore pricing
   - Invalid package/rate IDs
   - Missing required fields
   - Stripe payment method attachment

2. ✅ **Pricing calculations** - IMPLEMENTED
   - Fetch from Firestore (active rates/packages only)
   - Filter out inactive and promotional casual rates
   - Include promotional concession packages
   - Price conversion (dollars to cents)
   - Currency configuration (NZD)

3. ✅ **Transaction type determination** - IMPLEMENTED
   - Concession purchase detection
   - Casual vs. student rates
   - Case-insensitive matching
   - Unknown package handling

4. ✅ **Error handling** - IMPLEMENTED
   - Stripe customer creation failures
   - Payment processing errors (card declined, invalid request, network errors)
   - Payment status handling (requires_action, failed)
   - Refund creation errors

5. ⏳ **Data integrity** - REQUIRES INTEGRATION TESTS
   - ✅ Stripe operations mocked and tested
   - ⏳ Transaction records (requires integration tests with Firebase Emulator)
   - ⏳ Student document creation (requires integration tests)
   - ⏳ Concession block creation (requires integration tests)

#### ⚠️ CRITICAL LESSON LEARNED - Unit Test Scope

**What Happened (January 24, 2026):**
- Attempted to write unit tests that verified database state changes (transaction creation, student document updates, concession blocks)
- Tests failed because mock Firebase Admin SDK doesn't persist writes to the mock database
- Root cause: Unit test mocks are designed to verify behavior (function calls, return values), not state changes

**The Correct Approach:**

**UNIT TESTS** (Mock Firebase, Mock Stripe):
- ✅ **Input validation** - Required fields, data types, valid ranges
- ✅ **Business logic** - Calculations, duplicate detection, conditional logic
- ✅ **API interactions** - Verify correct calls to Stripe API with correct parameters
- ✅ **Error handling** - Error messages, status codes, error propagation
- ✅ **Return values** - Response format, success indicators
- ❌ **Database state** - Do NOT verify documents created/updated/deleted in unit tests

**INTEGRATION TESTS** (Firebase Emulator, Mock Stripe):
- ✅ **Database state** - Verify transactions, students, concessions created correctly
- ✅ **Firestore queries** - Test actual query behavior
- ✅ **Security rules** - Test permissions and access control
- ✅ **End-to-end flows** - Complete function execution with real local database

**When Writing Unit Tests:**
1. Mock Firebase Admin SDK (read-only mocks are fine)
2. Mock all external APIs (Stripe, email, etc.)
3. Test the function's logic and behavior
4. Verify function calls with `expect(mockFunction).toHaveBeenCalledWith(...)`
5. Verify return values and response formats
6. DO NOT try to read from mock database to verify writes occurred

**When Writing Integration Tests:**
1. Use Firebase Emulator Suite (real local Firestore)
2. Mock external APIs only (Stripe, email) to avoid real charges
3. Test complete flows including database reads/writes
4. Verify actual database state after operations
5. Clean up test data in `afterEach` hooks

#### ⚠️ Testing onRequest HTTP Functions

**Challenge Identified (January 24, 2026):**
- `onRequest` functions (HTTP endpoints) with CORS middleware are complex to unit test
- They require proper HTTP request/response objects with many properties
- The CORS middleware wraps the handler, making direct testing difficult

**Solution:**
- **Unit tests**: Test the underlying utilities (stripe-payment.js, stripe-config.js) ✅
- **Integration tests**: Test onRequest functions via Firebase Emulator with real HTTP calls
- This provides better test coverage and is closer to production behavior

**Functions Deferred to Integration Tests:**
- `process-casual-payment.js` - onRequest with CORS
- `process-concession-purchase.js` - onRequest with CORS  
- `create-student-payment.js` - onRequest with CORS
- `process-refund.js` - onCall (also complex to mock properly)

These functions will be fully tested when Phase 2 (Integration Tests) is implemented.

#### Implemented Framework

**Jest + firebase-functions-test** ✅

All tests located in `functions/__tests__/`:
- `__tests__/setup.js` - Test environment configuration
- `__tests__/test-helpers/` - Mock implementations for Firebase and Stripe
- `__tests__/utils/transaction-utils.test.js` - 8 tests
- `__tests__/stripe/stripe-config.test.js` - 10 tests
- `__tests__/stripe/stripe-payment.test.js` - 21 tests

**Run tests:**
```bash
npm test                    # From root directory
cd functions && npm test    # From functions directory
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage repor)

```bash
cd functions
npm install --save-dev jest @types/jest firebase-functions-test
```

---

### Frontend Business Logic (MEDIUM PRIORITY)

**Why:** Complex validation and calculation logic prone to edge cases.

#### Files Requiring Unit Tests

**Validation & Business Logic:**
- `js/casual-rates-utils.js` - Rate fetching/caching (158 lines)
- `student-portal/prepay/validation-service.js` - Date validation, duplicate checking
- `student-portal/js/audit-logger.js` - Audit log generation
- `admin/admin-tools/casual-rates/rates-actions.js` - Rate CRUD operations
- `admin/admin-tools/concession-types/modal-handlers.js` - Package CRUD operations

#### Testing Priorities

1. ✅ **Date validation**
   - Thursdays only
   - No past dates
   - Duplicate class detection
   - Expiry calculations

2. ✅ **Cache expiration logic**
   - Cache duration (5 minutes)
   - Force refresh
   - Fallback on error

3. ✅ **Audit log generation**
   - Diff calculation between old/new data
   - NZ date formatting
   - Admin vs. student context

4. ✅ **Form validation**
   - Required fields
   - Email validation
   - Phone validation
   - Price validation (non-negative)

#### Recommended Framework

**Jest** or **Vitest** (for pure JavaScript functions)

---

## 2. Integration Tests (HIGH PRIORITY ⭐)

### Stripe Payment Flow - CRITICAL

**Why:** End-to-end payment testing with Stripe test mode ensures data flows correctly.

#### Test Scenarios

1. ✅ **New student registration + payment**
   - Creates student document
   - Creates Stripe customer
   - Processes payment
   - Creates transaction record
   - Creates concession block (if applicable)
   - Sends welcome email

2. ✅ **Casual payment (existing student)**
   - Validates student exists
   - Checks for duplicate on same date
   - Processes payment
   - Creates transaction
   - Updates student balance

3. ✅ **Concession package purchase**
   - Validates package ID
   - Creates/updates Stripe customer
   - Processes payment
   - Creates concessionBlock document
   - Updates student concessionBalance
   - Calculates expiry date correctly

4. ✅ **Failed payment scenarios**
   - Payment declined → no Firestore data created
   - Invalid card → proper error message
   - Network error → rollback handling

5. ✅ **Duplicate payment detection**
   - Same student + same date + casual rate → blocked
   - Appropriate error message returned

6. ✅ **Refund processing**
   - Updates transaction document
   - Updates refund history
   - Partial vs. full refund calculation
   - Stripe refund API call succeeds

#### Recommended Approach

- Use **Firebase Local Emulator Suite** for Firestore/Functions
- Use **Stripe test mode** for payment testing
- Test against local functions with real operations
- Validate final database state after each flow
- Mock external APIs (email service) where appropriate

```bash
# Start emulators
firebase emulators:start

# Run integration tests against emulators
npm run test:integration
```

---

### Firestore Security Rules Testing (MEDIUM PRIORITY)

**Why:** Protect student data and admin operations from unauthorized access.

#### Test Scenarios

1. ✅ **Unauthenticated users**
   - Cannot read students collection
   - Cannot write to students collection
   - Cannot read transactions
   - Cannot read concessionBlocks

2. ✅ **Authenticated students**
   - Can read their own student document
   - Can read their own transactions
   - Can read their own concessionBlocks
   - Cannot read other students' data
   - Cannot write to protected fields (balance, email, etc.)

3. ✅ **Admin users**
   - Can read all students
   - Can write all students
   - Can read/write check-ins
   - Can read/write transactions
   - Can read/write concession data

4. ✅ **Check-ins**
   - Require admin authentication
   - Cannot be created by students
   - Cannot be edited by students

#### Recommended Framework

`@firebase/rules-unit-testing`

```bash
npm install --save-dev @firebase/rules-unit-testing
```

---

## 3. E2E/Frontend Tests (MEDIUM PRIORITY)

### Playwright for Critical User Flows

**Why:** Complex multi-step forms require end-to-end validation.

#### Student Portal Test Scenarios

**Priority 1: Core Flows**

1. ✅ **New student registration**
   - Fill registration form
   - Select package
   - Enter payment details (Stripe test card)
   - Submit form
   - Verify confirmation page
   - Verify email sent
   - Verify student document created in Firestore

2. ✅ **Existing student login**
   - Enter email/password
   - Successful authentication
   - Dashboard loads with correct data
   - Navigation works

3. ✅ **Prepay for class**
   - Navigate to prepay page
   - Select date from date picker
   - Validation: Thursday only
   - Validation: No past dates
   - Validation: No duplicate prepayments
   - Enter payment details
   - Submit
   - Verify transaction created

4. ✅ **Purchase concession package**
   - View available packages
   - Select package
   - Enter payment details
   - Submit
   - Verify concession block created
   - Verify balance updated

5. ✅ **Profile updates**
   - Update profile fields
   - Save changes
   - Verify audit log created
   - Verify changes persisted

6. ✅ **View transaction history**
   - Navigate to transactions page
   - Verify transactions display correctly
   - Filter/sort functionality
   - Export functionality (if applicable)

**Priority 2: Edge Cases**

7. ✅ **Password reset flow**
8. ✅ **Form validation errors**
9. ✅ **Network error handling**
10. ✅ **Mobile responsive behavior**

#### Admin Portal Test Scenarios

**Priority 1: Core Flows**

1. ✅ **Check-in flow**
   - Search for student
   - Select student from results
   - Choose entry type (concession/casual/free)
   - Enter payment method (if applicable)
   - Save check-in
   - Verify check-in document created

2. ✅ **Create concession package**
   - Navigate to concession types manager
   - Open create modal
   - Fill form (name, classes, price, expiry)
   - Save
   - Verify package appears in list
   - Verify package available in student portal

3. ✅ **Create casual rate**
   - Navigate to casual rates manager
   - Create new rate
   - Set price and properties
   - Save
   - Verify rate appears in public pricing

4. ✅ **Process refund**
   - Find transaction
   - Open refund modal
   - Enter refund details
   - Process refund
   - Verify transaction updated
   - Verify Stripe refund processed

5. ✅ **View student dashboard (admin view)**
   - Search for student
   - Select student
   - View dashboard as admin
   - Verify all data displays correctly

6. ✅ **Database backup/export**
   - Navigate to backup tool
   - Select collections
   - Export to ZIP
   - Verify ZIP contains JSON/CSV files

**Priority 2: Admin-Specific Features**

7. ✅ **Bulk operations**
8. ✅ **User management**
9. ✅ **Email notifications**

#### Public Site Test Scenarios

1. ✅ **Navigation works**
   - All menu links functional
   - Mobile navigation works
   - Page transitions smooth

2. ✅ **Pricing loads correctly**
   - Casual rates display from Firestore
   - Concession packages display
   - Error handling for missing prices

3. ✅ **Mobile responsive**
   - Mobile drawer works
   - Forms usable on mobile
   - Touch interactions work

#### Recommended Framework

**Playwright** (preferred)
- Better for multi-page flows
- TypeScript support
- Modern tooling
- Built-in test reports
- Cross-browser testing

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Alternative: **Cypress** (more established, larger community)

---

## 4. Component/Visual Tests (LOW PRIORITY)

### Storybook for UI Components (Optional)

Reusable components in `/components/`:
- Loading spinner
- Snackbar notifications
- Modals (confirmation, error)
- Mobile drawer

**If time permits:** Set up Storybook for visual regression testing and component documentation.

---

## What NOT to Test (Low Value)

- ❌ Simple utility functions (formatCurrency, formatDate) unless complex logic
- ❌ Firebase SDK methods themselves
- ❌ Third-party libraries (Stripe.js, Firebase)
- ❌ Static HTML pages without interactive logic
- ❌ CSS/styling (unless using visual regression)

---

## Implementation Roadmap

### Phase 1: Unit Tests for Critical Functions - ✅ COMPLETE

**Goal:** Test payment processing logic and utilities

1. ✅ Set up Jest in `functions/` directory
2. ✅ Create mock Firebase admin and Stripe objects
   - Comprehensive Firebase Firestore mocking (MockFirestore, MockDocumentSnapshot, MockQuerySnapshot)
   - Stripe SDK mocking (customers, paymentMethods, paymentIntents, refunds)
3. ✅ Write tests for:
   - ✅ `stripe/stripe-payment.js` - 21 tests (customer creation, payment processing, refunds)
   - ✅ `stripe/stripe-config.js` - 10 tests (pricing fetch, filtering, currency)
   - ✅ `utils/transaction-utils.js` - 8 tests (transaction type determination)
4. ✅ Achieved 100% test pass rate on implemented functions
5. ✅ Set up test scripts in package.json (test, test:watch, test:coverage)
6. ✅ Created test structure in `functions/__tests__/` with helpers and fixtures

**Success Criteria:**
- ✅ 39 unit tests passing (exceeded 30+ target)
- ✅ Critical payment functions covered
- ✅ Tests run in ~1-2 seconds (well under 30 second target)
- ✅ Can run tests locally from root or functions directory
- ✅ Test data fixtures and reusable test helpers implemented

**Completed:** January 23, 2026

---

### Phase 2: Integration Tests (Weeks 3-4) - PLANNED

**Goal:** Protect revenue and data integrity

1. Set up Jest + firebase-functions-test
2. Create test structure:
   ```
   functions/
     __tests__/
       stripe/
         stripe-payment.test.js
         stripe-config.test.js
       process-casual-payment.test.js
       process-concession-purchase.test.js
       utils/
         transaction-utils.test.js
       integration/
         payment-flow.test.js
   ```
3. Write unit tests for Cloud Functions payment processing
4. Add integration tests for Stripe payment flows using emulators
5. Set up CI/CD to run tests on every commit

**Success Criteria:**
- 80%+ coverage on payment functions
- All payment edge cases tested
- Integration tests passing with emulators

---

### Phase 2: Frontend Logic (Weeks 3-4)

**Goal:** Validate business logic correctness

1. Set up Jest/Vitest for frontend JavaScript
2. Unit test validation services
   - `casual-rates-utils.js`
   - `validation-service.js`
   - `audit-logger.js`
3. Test rate/package CRUD operations
4. Mock Firebase calls appropriately

**Success Criteria:**
- 70%+ coverage on business logic files
- All validation edge cases covered
- Cache behavior tested

---

### Phase 3: E2E Critical Paths (Weeks 5-6)

**Goal:** Ensure user flows work end-to-end

1. Set up Playwright
2. Configure test environment (test Firebase project, Stripe test mode)
3. Write E2E tests for:
   - Student registration + payment
   - Admin check-in flow
   - Student prepay flow
4. Set up test data fixtures
5. Add to CI/CD pipeline

**Success Criteria:**
- 5-10 critical user flows tested
- Tests run in CI on every PR
- <5 minute test execution time

---

### Phase 4: Expand Coverage (Ongoing)

**Goal:** Increase confidence and catch regressions

1. Add more E2E scenarios (refunds, profile updates, etc.)
2. Firestore rules testing
3. Consider visual regression tests
4. Performance testing (if needed)
5. Load testing for Cloud Functions

---

## Test Data Management

### Fixtures & Seed Data

Create reusable test data:

```javascript
// Test student data
const testStudent = {
  firstName: 'Test',
  lastName: 'Student',
  email: 'test@urbanswing.co.nz',
  phone: '021 123 4567',
  // ...
};

// Test packages
const testPackages = {
  'casual-standard': { name: 'Casual Entry', price: 1500, type: 'casual-rate' },
  '5-class': { name: '5 Classes', price: 5500, numberOfClasses: 5 },
};

// Stripe test cards
const TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  requiresAuth: '4000002500003155',
};
```

### Cleanup Strategy

- Use Firebase emulator for isolation
- Clear data between test runs
- Use unique IDs for test data
- Implement `beforeEach` and `afterEach` hooks

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - name: Install dependencies
        working-directory: ./functions
        run: npm ci
      - name: Run unit tests
        working-directory: ./functions
        run: npm test

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install Firebase tools
        run: npm install -g firebase-tools
      - name: Start emulators
        run: firebase emulators:exec --only firestore,functions "npm run test:integration"

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Key Metrics to Track

### Test Coverage
- Functions: Target 80%+
- Business logic: Target 70%+
- Overall: Target 60%+

### Business Metrics (Monitor in Production)
- Payment success rate: >99%
- Duplicate transaction prevention: 100%
- Data consistency after payment failures: 100%
- Form validation catch rate
- Admin operation success rates
- Email delivery rate

### Test Performance
- Unit tests: <30 seconds
- Integration tests: <2 minutes
- E2E tests: <5 minutes
- Total CI pipeline: <10 minutes

---

## Quick Start Commands

### Setup Testing Infrastructure

```bash
# Functions unit tests
cd functions
npm install --save-dev jest @types/jest firebase-functions-test
mkdir -p __tests__/stripe __tests__/utils __tests__/integration

# Frontend tests
npm install --save-dev jest @jest/globals

# E2E tests (at root)
npm install --save-dev @playwright/test
npx playwright install

# Firestore rules testing
npm install --save-dev @firebase/rules-unit-testing
```

### Run Tests

```bash
# Unit tests
cd functions && npm test

# Integration tests (with emulators)
firebase emulators:exec --only firestore,functions "npm run test:integration"

# E2E tests
npm run test:e2e

# Watch mode (during development)
npm test -- --watch
```

---

## Testing Best Practices

### General Principles

1. **Test behavior, not implementation** - Focus on inputs/outputs, not internal details
2. **Test behavior, not state (in unit tests)** - Mock databases don't persist writes
3. **One assertion per test** (when possible) - Easier to debug
4. **Arrange-Act-Assert pattern** - Clear test structure
5. **Descriptive test names** - `it('should reject duplicate casual payment on same date')`
6. **Independent tests** - No shared state between tests
7. **Fast tests** - Mock external services, use emulators for integration tests

### Unit Test Guidelines

1. **Mock all external dependencies** - Firebase, Stripe, email services
2. **Focus on function behavior** - Validation logic, calculations, error handling
3. **Verify function calls** - Use `expect(mockFn).toHaveBeenCalledWith(...)` to verify API calls
4. **Test return values** - Check response format, success/error states
5. **DO NOT verify database state** - Mock databases don't persist writes; use integration tests for state verification
6. **Keep tests fast** - No real network calls, no real database operations

### Firebase-Specific

1. **Unit tests: Mock Firebase Admin SDK** - Use read-only mocks for database queries
2. **Integration tests: Use Firebase Emulator** - Test actual database operations
3. **Never test against production** - Always use test environment or emulator
4. **Mock external API calls in unit tests** - Email, Stripe
5. **Test security rules separately** - Use Emulator Suite with rules testing
6. **Clean up test data** - Use `afterEach` hooks in integration tests
7. **Test offline scenarios** - Network failures, timeouts

### Stripe-Specific

1. **Use test mode keys** - Never production keys in tests
2. **Use test card numbers** - 4242424242424242, etc.
3. **Test webhook handling** - Simulate Stripe events
4. **Test idempotency** - Same request twice should be safe
5. **Test 3D Secure flows** - If applicable

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Firebase Testing Guide](https://firebase.google.com/docs/functions/unit-testing)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

### Test Card Numbers (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`
- Requires authentication: `4000 0025 0000 3155`

### Firebase Emulator Suite
```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,functions

# Export data from emulators
firebase emulators:export ./emulator-data

# Import data to emulators
firebase emulators:start --import=./emulator-data
```

---

## Next Steps

1. ✅ **Review this strategy with team** - Complete
2. ✅ **Set up basic test infrastructure (Phase 1)** - Complete
3. ✅ **Write first payment function tests** - Complete (39 tests)
4. ⏳ **Set up CI/CD pipeline** - Next priority
   - Add GitHub Actions workflow for automated testing
   - Run tests on every push/PR
5. ⏳ **Gradually expand test coverage** - Ongoing
   - Add tests for remaining Cloud Functions
   - Implement integration tests with Firebase emulators
   - Add E2E tests for critical user flows
6. ⏳ **Monitor test metrics and adjust strategy** - Ongoing
   - Track test execution time
   - Monitor test reliability
   - Adjust coverage goals as needed

---

## Notes

- Testing is an investment that pays off through reduced bugs and faster development
- Start small (critical paths) and expand gradually
- Don't aim for 100% coverage - focus on high-value areas
- Keep tests maintainable - refactor test code like production code
- Run tests in CI/CD to catch issues early

**Remember:** The goal isn't perfect coverage, it's confidence that critical features work correctly.
