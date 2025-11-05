/**
 * stripe-payment.js
 * Core Stripe payment processing functions
 */

const { stripe, fetchPricing, CURRENCY } = require('./stripe-config');

/**
 * Create a Stripe Customer
 * @param {Object} studentData - Student information
 * @returns {Promise<Object>} Stripe Customer object
 */
async function createCustomer(studentData) {
  try {
    const customer = await stripe.customers.create({
      email: studentData.email,
      name: `${studentData.firstName} ${studentData.lastName}`,
      phone: studentData.phone || undefined,
      metadata: {
        source: 'student-portal-registration',
        studentId: studentData.studentId || 'pending'
      }
    });
    
    console.log('Stripe customer created:', customer.id);
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
}

/**
 * Process a payment for a student registration
 * @param {Object} paymentData - Payment details
 * @param {string} paymentData.customerId - Stripe Customer ID
 * @param {string} paymentData.paymentMethodId - Stripe Payment Method ID
 * @param {string} paymentData.packageId - Package ID (document ID from Firestore)
 * @param {Object} paymentData.studentData - Student information for metadata
 * @returns {Promise<Object>} Payment Intent result
 */
async function processPayment(paymentData) {
  const { customerId, paymentMethodId, packageId, studentData } = paymentData;
  
  // Fetch current pricing from Firestore
  const packages = await fetchPricing();
  
  // Validate package ID
  if (!packages[packageId]) {
    throw new Error(`Invalid package ID: ${packageId}`);
  }
  
  const packageInfo = packages[packageId];
  const amount = packageInfo.price;
  const packageName = packageInfo.name;
  
  try {
    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: CURRENCY,
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true, // Automatically confirm the payment
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // Don't allow redirect-based payment methods
      },
      description: `Urban Swing - ${packageName}`,
      metadata: {
        studentName: `${studentData.firstName} ${studentData.lastName}`,
        studentEmail: studentData.email,
        packageId: packageId,
        packageName: packageName,
        packageType: packageInfo.type,
        source: 'student-portal-registration'
      },
      receipt_email: studentData.email
    });
    
    console.log('Payment Intent created:', paymentIntent.id, 'Status:', paymentIntent.status);
    
    // Check payment status
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: CURRENCY,
        receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url || null
      };
    } else if (paymentIntent.status === 'requires_action') {
      // 3D Secure or other authentication required
      return {
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        error: 'Payment requires additional authentication'
      };
    } else {
      return {
        success: false,
        error: `Payment failed with status: ${paymentIntent.status}`
      };
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    
    // Parse Stripe error for user-friendly message
    let errorMessage = 'Payment processing failed';
    if (error.type === 'StripeCardError') {
      errorMessage = error.message; // e.g., "Your card was declined"
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment information';
    }
    
    return {
      success: false,
      error: errorMessage,
      stripeError: error.code
    };
  }
}

/**
 * Refund a payment
 * @param {string} paymentIntentId - Stripe Payment Intent ID
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund result
 */
async function refundPayment(paymentIntentId, reason = 'requested_by_customer') {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason
    });
    
    console.log('Refund created:', refund.id);
    return {
      success: true,
      refundId: refund.id,
      status: refund.status
    };
  } catch (error) {
    console.error('Error creating refund:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createCustomer,
  processPayment,
  refundPayment
};
