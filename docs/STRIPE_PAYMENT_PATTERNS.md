# Stripe Payment Implementation Patterns

## Overview
This document describes the consistent patterns used across Urban Swing's Stripe payment implementations. All new payment features (including memberships) MUST follow these exact patterns to ensure consistency and reliability.

---

## Pattern 1: Cloud Function Structure

### Template
```javascript
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createCustomer, processPayment } = require('./stripe/stripe-payment');
const { fetchPricing } = require('./stripe/stripe-config');
const cors = require('cors')({ origin: true });

exports.functionName = onRequest(
  { 
    region: 'us-central1',
    invoker: 'public' // Allow unauthenticated calls
  },
  async (request, response) => {
    return cors(request, response, async () => {
      try {
        if (request.method !== 'POST') {
          response.status(405).json({ error: 'Method not allowed' });
          return;
        }
        
        const data = request.body;
        
        // Validate required fields
        if (!data.requiredField) {
          response.status(400).json({ error: 'Missing required field' });
          return;
        }
        
        // Process payment...
        
        response.status(200).json({ success: true, ...result });
      } catch (error) {
        console.error('Error:', error);
        response.status(500).json({ error: error.message });
      }
    });
  }
);
```

### Key Points:
- **Region**: Always `us-central1`
- **Invoker**: `public` for student portal calls
- **CORS**: Enabled with `cors({ origin: true })`
- **Method**: POST only
- **Error Handling**: Proper HTTP status codes (400, 404, 405, 500)
- **Validation**: Check all required fields before processing

---

## Pattern 2: Stripe Customer Management

### Implementation
```javascript
// Step 1: Get existing customer ID
let customerId = studentData.stripeCustomerId;

// Step 2: Verify customer exists in Stripe (might be from test mode or deleted)
if (customerId) {
  try {
    const { stripe } = require('./stripe/stripe-config');
    await stripe.customers.retrieve(customerId);
    console.log('Using existing Stripe customer:', customerId);
  } catch (error) {
    console.log('Existing customer ID invalid, will create new:', error.message);
    customerId = null;
  }
}

// Step 3: Create new customer if needed
if (!customerId) {
  console.log('Creating Stripe customer for student:', studentId);
  const customer = await createCustomer({
    firstName: studentData.firstName,
    lastName: studentData.lastName,
    email: studentData.email,
    phone: studentData.phoneNumber || studentData.phone
  });
  
  if (!customer || !customer.id) {
    response.status(500).json({ error: 'Failed to create payment customer' });
    return;
  }
  
  customerId = customer.id;
  
  // Step 4: Update student document
  await db.collection('students').doc(studentId).update({
    stripeCustomerId: customerId
  });
}
```

### Key Points:
- **Always verify** existing customer IDs before use
- **Handle test/live mode** migration gracefully
- **Update Firestore** when creating new customer
- **Consistent customer creation** using `createCustomer()` helper

---

## Pattern 3: Payment Intent Processing (One-Time Payments)

### Used For:
- Casual class payments
- Concession purchases
- One-time membership purchases

### Implementation
```javascript
// Use processPayment() from stripe-payment.js
const paymentResult = await processPayment({
  customerId: customerId,
  paymentMethodId: data.paymentMethodId,
  packageId: data.packageId,
  studentData: studentData,
  returnUrl: data.returnUrl
});

// Check result
if (!paymentResult.success) {
  console.error('Payment failed:', paymentResult.error);
  response.status(402).json({ 
    error: paymentResult.error || 'Payment processing failed',
    details: paymentResult.stripeError || null
  });
  return;
}

console.log('Payment succeeded:', paymentResult.paymentIntentId);
```

### processPayment() Details:
- **Attaches** payment method to customer
- **Sets** as default payment method
- **Creates** Payment Intent with `confirm: true`
- **Handles** 3D Secure authentication (`requires_action`)
- **Returns** structured result object:
  ```javascript
  {
    success: true,
    paymentIntentId: string,
    amount: number, // in cents
    currency: string,
    receiptUrl: string | null
  }
  ```

---

## Pattern 4: Transaction Record Creation

### Template
```javascript
// Generate transaction ID
const timestamp = Date.now();
const firstNameClean = studentData.firstName.toLowerCase()
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const lastNameClean = studentData.lastName.toLowerCase()
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const transactionId = `${firstNameClean}-${lastNameClean}-${packageId}-${timestamp}`;

// Create transaction document
const transactionData = {
  studentId: studentId,
  transactionDate: admin.firestore.FieldValue.serverTimestamp(),
  type: 'transaction-type', // e.g., 'concession-purchase', 'casual', etc.
  packageId: packageId,
  packageName: packageInfo.name,
  packageType: packageInfo.type,
  amountPaid: paymentResult.amount / 100, // Convert cents to dollars
  paymentMethod: 'online',
  paymentIntentId: paymentResult.paymentIntentId,
  stripeCustomerId: customerId,
  receiptUrl: paymentResult.receiptUrl,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  createdBy: 'source-identifier' // e.g., 'student-portal-purchase'
};

await db.collection('transactions').doc(transactionId).set(transactionData);
```

### Key Points:
- **Consistent ID format**: `firstname-lastname-packageid-timestamp`
- **ServerTimestamp**: Use for `transactionDate` and `createdAt`
- **Amount conversion**: Store in dollars (divide by 100)
- **Include Stripe IDs**: For audit trail and refunds
- **Type field**: Distinguishes transaction types

---

## Pattern 5: Frontend Payment Service

### Initialization
```javascript
class PaymentService {
  constructor() {
    this.stripe = null;
    this.cardElement = null;
    this.initialized = false;
    this.isCardComplete = false;
  }
  
  initialize(cardElementId, cardErrorsId) {
    // Initialize Stripe
    this.stripe = Stripe(stripeConfig.publishableKey);
    
    // Create card element with consistent styling
    const elements = this.stripe.elements();
    this.cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#333',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          '::placeholder': { color: '#aab7c4' }
        },
        invalid: {
          color: '#e74c3c',
          iconColor: '#e74c3c'
        }
      },
      hidePostalCode: true,
      disableLink: true
    });
    
    // Mount and handle validation
    this.cardElement.mount(`#${cardElementId}`);
    
    this.cardElement.on('change', (event) => {
      this.isCardComplete = event.complete;
      // Handle error display
    });
  }
}
```

### Payment Method Creation
```javascript
async createPaymentMethod() {
  const { paymentMethod, error } = await this.stripe.createPaymentMethod({
    type: 'card',
    card: this.cardElement
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, paymentMethod: paymentMethod };
}
```

### Cloud Function Call
```javascript
async processPayment(studentId, packageId) {
  // Get payment method
  const pmResult = await this.createPaymentMethod();
  if (!pmResult.success) throw new Error(pmResult.error);
  
  // Get auth token (if authenticated)
  const user = firebase.auth().currentUser;
  const token = user ? await user.getIdToken() : null;
  
  // Call Cloud Function
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(API_CONFIG.ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      studentId: studentId,
      packageId: packageId,
      paymentMethodId: pmResult.paymentMethod.id,
      returnUrl: window.location.href
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error);
  }
  
  return await response.json();
}
```

---

## Pattern 6: Pricing Configuration

### fetchPricing() Function
```javascript
async function fetchPricing() {
  const db = admin.firestore();
  const packages = {};
  
  // Fetch casual rates
  const casualRatesSnapshot = await db.collection('casualRates').get();
  casualRatesSnapshot.forEach(doc => {
    const rate = doc.data();
    if (rate.isActive && !rate.isPromo) {
      packages[doc.id] = {
        price: Math.round(rate.price * 100), // Convert to cents
        name: rate.name,
        type: 'casual-rate',
        description: rate.description || null
      };
    }
  });
  
  // Fetch concession packages
  const packagesSnapshot = await db.collection('concessionPackages').get();
  packagesSnapshot.forEach(doc => {
    const pkg = doc.data();
    if (pkg.isActive !== false) {
      packages[doc.id] = {
        price: Math.round(pkg.price * 100),
        name: pkg.name,
        type: 'concession-package',
        numberOfClasses: pkg.numberOfClasses,
        expiryMonths: pkg.expiryMonths,
        description: pkg.description || null
      };
    }
  });
  
  return packages;
}
```

### Key Points:
- **Dynamic pricing**: Always fetch from Firestore
- **Cents conversion**: Multiply by 100 for Stripe
- **Active filtering**: Only include active items
- **Type field**: Identifies package category

---

## Pattern 7: API Configuration

### config/api-config.js
```javascript
const FUNCTIONS_REGION = 'us-central1';
const PROJECT_ID = 'directed-curve-447204-j4';

const API_CONFIG = {
  ENDPOINT_NAME: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/functionName`
};

window.API_CONFIG = API_CONFIG;
```

### Key Points:
- **Consistent format** for all endpoints
- **Global export** via `window.API_CONFIG`
- **Centralized configuration** in single file

---

## Pattern 8: Error Handling

### HTTP Status Codes
- **200**: Success
- **400**: Bad request (missing/invalid fields)
- **402**: Payment failed (Stripe error)
- **404**: Resource not found (student, package)
- **405**: Method not allowed (not POST)
- **409**: Conflict (duplicate purchase)
- **500**: Server error

### Error Response Format
```javascript
response.status(statusCode).json({ 
  error: 'User-friendly error message',
  details: 'Technical details (optional)'
});
```

---

## Summary: What Makes This Pattern Consistent

1. **Same Cloud Function structure** across all payment types
2. **Consistent customer verification** before payments
3. **Unified transaction record format** with predictable IDs
4. **Shared utility functions** (`fetchPricing`, `createCustomer`, `processPayment`)
5. **Consistent frontend service** (`PaymentService` class)
6. **Centralized API configuration**
7. **Standard error handling** with proper HTTP codes
8. **Predictable success/error response formats**

These patterns ensure:
- ✅ Easy maintenance and debugging
- ✅ Consistent user experience
- ✅ Reliable Stripe integration
- ✅ Clear audit trails
- ✅ Graceful error handling
- ✅ Future extensibility
