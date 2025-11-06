# Stripe Payment Backend - Implementation Summary

## Overview
Backend payment processing system for Urban Swing student portal registration with Stripe integration.

## Files Created

### 1. `functions/stripe/stripe-config.js`
- Initializes Stripe with secret key from `.env`
- Defines package pricing (casual: $25, 5-class: $100, 10-class: $180)
- Exports reusable Stripe instance and configuration

### 2. `functions/stripe/stripe-payment.js`
- **`createCustomer()`** - Creates Stripe Customer with student data
- **`processPayment()`** - Creates and confirms Payment Intent
  - Validates package type
  - Attaches metadata (student info, package details)
  - Sends receipt email automatically
  - Handles 3D Secure authentication
  - Returns success/failure with detailed error messages
- **`refundPayment()`** - Issues refunds if needed

### 3. `functions/create-student-payment.js`
- Callable Firebase Function: `createStudentWithPayment`
- **Workflow:**
  1. Validates input (email, name, phone, package, payment method)
  2. Checks if student email already exists
  3. Creates Stripe Customer
  4. Processes payment via Stripe
  5. **Only if payment succeeds:**
     - Creates student document in Firestore
     - Creates Firebase Auth user
     - Creates user document in Firestore
     - Triggers email functions automatically
  6. Returns success with IDs or error message

### 4. `functions/index.js` (updated)
- Imports and exports `createStudentWithPayment`

## Security Features

✅ **Server-side validation** - All data validated before processing
✅ **Atomic transactions** - Payment must succeed before accounts created
✅ **Secret key protection** - Stripe secret key only in `.env` (never exposed)
✅ **Error handling** - Graceful failure with user-friendly messages
✅ **Metadata tracking** - Student info attached to Stripe charges for reconciliation
✅ **Automatic receipts** - Stripe sends email receipts to customers

## Configuration Required

### Environment Variables (functions/.env)
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

### Frontend Config (config/stripe-config.js)
```javascript
publishableKey: 'pk_test_YOUR_KEY_HERE'
```

## Package Pricing

| Package | Price | Stripe Amount |
|---------|-------|---------------|
| Casual | $25 | 2500 cents |
| 5-Class | $100 | 10000 cents |
| 10-Class | $180 | 18000 cents |

## API Response Structure

### Success Response
```javascript
{
  success: true,
  studentId: "abc123",
  userId: "xyz789",
  customerId: "cus_ABC123",
  paymentIntentId: "pi_XYZ789",
  receiptUrl: "https://stripe.com/receipt/...",
  message: "Registration successful! Check your email for login instructions."
}
```

### Error Response
```javascript
{
  code: "already-exists", // or "invalid-argument", "failed-precondition", "internal"
  message: "A student with this email already exists"
}
```

## Testing

### Test Card Numbers
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184

Use any future expiry date, any 3-digit CVC, any ZIP code.

## Email Triggers

When registration succeeds:
1. **Student document created** → `sendNewStudentEmail` fires
   - Admin notification
   - Welcome email to student
2. **User document created** → `sendAccountSetupEmail` fires (if not just created)
   - Account setup confirmation

Both emails include:
- Portal access button
- Package details
- Receipt information

## Next Steps

Ready for frontend implementation:
1. Add Stripe.js to `register.html`
2. Create `payment-handler.js` with Stripe Elements
3. Update `register.js` to call `createStudentWithPayment`
4. Add package selection UI
5. Test with Stripe test cards

## Deployment Status

✅ Function deployed: `createStudentWithPayment(us-central1)`
✅ Invoker: Public (allows unauthenticated calls from student portal)
✅ Region: us-central1
✅ Runtime: Node.js 22
