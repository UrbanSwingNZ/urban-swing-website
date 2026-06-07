/**
 * process-membership-purchase.js
 * Firebase Callable Function for processing membership purchase for existing students
 * Handles both one-time and recurring membership purchases
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createCustomer, processPayment } = require('./stripe/stripe-payment');
const { stripe, fetchPricing } = require('./stripe/stripe-config');
const cors = require('cors')({ origin: true });

/**
 * Calculate membership expiry date (1 month from start, using "sticky day" approach)
 * @param {Date} startDate - Membership start date
 * @returns {Date} Expiry date (valid through end of day)
 */
function calculateMembershipExpiry(startDate) {
  const expiryDate = new Date(startDate);
  
  // Add 1 month using JavaScript's built-in month arithmetic
  // This automatically handles:
  // - Jan 31 → Feb 28/29 (last day of month)
  // - Feb 28 → Mar 28 (maintains day 28)
  // - Leap years
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  
  // Set to end of day (valid through 23:59:59.999)
  expiryDate.setHours(23, 59, 59, 999);
  
  return expiryDate;
}

/**
 * Process one-time membership purchase (no auto-renew)
 * HTTP Function with CORS support
 * 
 * Expected data structure:
 * {
 *   studentId: string,
 *   membershipTypeId: string (document ID from membershipTypes),
 *   paymentMethodId: string (from Stripe Elements),
 *   startDate?: string (ISO date string, defaults to now)
 * }
 */
exports.processOneTimeMembershipPurchase = onRequest(
  { 
    region: 'us-central1',
    invoker: 'public' // Allow unauthenticated calls from student portal
  },
  async (request, response) => {
    // Handle CORS
    return cors(request, response, async () => {
      try {
        // Only accept POST requests
        if (request.method !== 'POST') {
          response.status(405).json({ error: 'Method not allowed' });
          return;
        }
        
        const data = request.body;
    
        // Validate required fields
        if (!data.studentId) {
          response.status(400).json({ error: 'Missing student ID' });
          return;
        }
        
        if (!data.membershipTypeId) {
          response.status(400).json({ error: 'Missing membership type ID' });
          return;
        }
        
        if (!data.paymentMethodId) {
          response.status(400).json({ error: 'Missing payment method' });
          return;
        }
        
        const db = admin.firestore();
        
        // Step 1: Get student document
        const studentDoc = await db.collection('students').doc(data.studentId).get();
        
        if (!studentDoc.exists) {
          response.status(404).json({ error: 'Student not found' });
          return;
        }
        
        const studentData = studentDoc.data();
        
        // Check if student is an improver
        if (!studentData.improver) {
          response.status(403).json({ error: 'Memberships are only available for improver-level students' });
          return;
        }
        
        // Check for existing active membership
        const existingMemberships = await db.collection('memberships')
          .where('studentId', '==', data.studentId)
          .where('status', '==', 'active')
          .get();
        
        if (!existingMemberships.empty) {
          response.status(409).json({ error: 'You already have an active membership. Please wait until it expires before purchasing a new one.' });
          return;
        }
        
        // Step 2: Fetch pricing to validate membership type ID
        let packages;
        try {
          packages = await fetchPricing();
        } catch (error) {
          console.error('Failed to fetch pricing:', error);
          response.status(500).json({ error: 'Failed to fetch pricing information' });
          return;
        }
        
        if (!packages[data.membershipTypeId]) {
          response.status(400).json({ error: 'Invalid membership type ID' });
          return;
        }
        
        const membershipInfo = packages[data.membershipTypeId];
        
        // Validate it's a membership type
        if (membershipInfo.type !== 'membership') {
          response.status(400).json({ error: 'Invalid package type. Must be a membership.' });
          return;
        }
        
        // Step 3: Get or create Stripe customer
        let customerId = studentData.stripeCustomerId;
        
        // Verify the customer exists in Stripe (it might be from test mode or deleted)
        if (customerId) {
          try {
            await stripe.customers.retrieve(customerId);
            console.log('Using existing Stripe customer:', customerId);
          } catch (error) {
            console.log('Existing customer ID invalid, will create new:', error.message);
            customerId = null;
          }
        }
        
        if (!customerId) {
          console.log('Creating Stripe customer for student:', data.studentId);
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
          
          // Update student document with Stripe customer ID
          await db.collection('students').doc(data.studentId).update({
            stripeCustomerId: customerId
          });
        }
        
        // Step 4: Process Payment
        console.log('Processing one-time membership purchase for customer:', customerId);
        const paymentResult = await processPayment({
          customerId: customerId,
          paymentMethodId: data.paymentMethodId,
          packageId: data.membershipTypeId,
          studentData: studentData,
          returnUrl: data.returnUrl
        });
        
        // Step 5: Check payment result
        if (!paymentResult.success) {
          console.error('Payment failed:', paymentResult.error);
          response.status(402).json({ 
            error: paymentResult.error || 'Payment processing failed',
            details: paymentResult.stripeError || null
          });
          return;
        }
        
        console.log('Payment succeeded:', paymentResult.paymentIntentId);
        
        // Step 6: Calculate membership dates
        const startDate = data.startDate ? new Date(data.startDate) : new Date();
        const currentPeriodStart = new Date(startDate);
        currentPeriodStart.setHours(0, 0, 0, 0); // Start of day
        
        const currentPeriodEnd = calculateMembershipExpiry(currentPeriodStart);
        
        // Step 7: Create membership document
        const membershipId = `${data.studentId}-membership-${Date.now()}`;
        
        const membershipData = {
          studentId: data.studentId,
          studentName: `${studentData.firstName} ${studentData.lastName}`,
          typeId: data.membershipTypeId,
          typeName: membershipInfo.name,
          price: paymentResult.amount / 100, // Convert cents to dollars
          status: 'active',
          isRecurring: false, // One-time purchase
          purchaseDate: admin.firestore.Timestamp.fromDate(new Date()),
          currentPeriodStart: admin.firestore.Timestamp.fromDate(currentPeriodStart),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
          stripeSubscriptionId: null, // No subscription for one-time
          stripeCustomerId: customerId,
          paymentMethod: 'online',
          cancelledAt: null,
          cancelledBy: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'student-portal-purchase'
        };
        
        await db.collection('memberships').doc(membershipId).set(membershipData);
        console.log('Membership created:', membershipId);
        
        // Step 8: Update student document
        await db.collection('students').doc(data.studentId).update({
          activeMembershipId: membershipId,
          membershipStatus: 'active',
          membershipExpiryDate: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Step 9: Create transaction record
        const timestamp = Date.now();
        const firstNameClean = studentData.firstName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const lastNameClean = studentData.lastName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const transactionId = `${firstNameClean}-${lastNameClean}-${data.membershipTypeId}-${timestamp}`;
        
        console.log('Creating transaction with ID:', transactionId);
        
        const transactionData = {
          studentId: data.studentId,
          transactionDate: admin.firestore.FieldValue.serverTimestamp(),
          type: 'membership-purchase',
          membershipId: membershipId,
          membershipTypeId: data.membershipTypeId,
          membershipTypeName: membershipInfo.name,
          amountPaid: paymentResult.amount / 100,
          paymentMethod: 'online',
          paymentIntentId: paymentResult.paymentIntentId,
          stripeCustomerId: customerId,
          receiptUrl: paymentResult.receiptUrl,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'student-portal-purchase'
        };
        
        await db.collection('transactions').doc(transactionId).set(transactionData);
        console.log('Transaction document created:', transactionId);
        
        // Step 10: Return success
        response.status(200).json({
          success: true,
          transactionId: transactionId,
          membershipId: membershipId,
          paymentIntentId: paymentResult.paymentIntentId,
          receiptUrl: paymentResult.receiptUrl,
          amount: paymentResult.amount / 100,
          currentPeriodStart: currentPeriodStart.toISOString(),
          currentPeriodEnd: currentPeriodEnd.toISOString(),
          message: 'Membership purchase successful! Your membership is now active.'
        });
        
      } catch (error) {
        console.error('Error in processOneTimeMembershipPurchase:', error);
        response.status(500).json({ 
          error: error.message || 'An error occurred processing membership purchase' 
        });
      }
    });
  }
);

/**
 * Process recurring membership purchase (auto-renew via Stripe Subscription)
 * HTTP Function with CORS support
 * 
 * Expected data structure:
 * {
 *   studentId: string,
 *   membershipTypeId: string (document ID from membershipTypes),
 *   paymentMethodId: string (from Stripe Elements)
 * }
 */
exports.processRecurringMembershipPurchase = onRequest(
  { 
    region: 'us-central1',
    invoker: 'public' // Allow unauthenticated calls from student portal
  },
  async (request, response) => {
    // Handle CORS
    return cors(request, response, async () => {
      try {
        // Only accept POST requests
        if (request.method !== 'POST') {
          response.status(405).json({ error: 'Method not allowed' });
          return;
        }
        
        const data = request.body;
    
        // Validate required fields
        if (!data.studentId) {
          response.status(400).json({ error: 'Missing student ID' });
          return;
        }
        
        if (!data.membershipTypeId) {
          response.status(400).json({ error: 'Missing membership type ID' });
          return;
        }
        
        if (!data.paymentMethodId) {
          response.status(400).json({ error: 'Missing payment method' });
          return;
        }
        
        const db = admin.firestore();
        
        // Step 1: Get student document
        const studentDoc = await db.collection('students').doc(data.studentId).get();
        
        if (!studentDoc.exists) {
          response.status(404).json({ error: 'Student not found' });
          return;
        }
        
        const studentData = studentDoc.data();
        
        // Check if student is an improver
        if (!studentData.improver) {
          response.status(403).json({ error: 'Memberships are only available for improver-level students' });
          return;
        }
        
        // Check for existing active membership
        const existingMemberships = await db.collection('memberships')
          .where('studentId', '==', data.studentId)
          .where('status', '==', 'active')
          .get();
        
        if (!existingMemberships.empty) {
          response.status(409).json({ error: 'You already have an active membership. Please wait until it expires before purchasing a new one.' });
          return;
        }
        
        // Step 2: Fetch pricing to validate membership type ID
        let packages;
        try {
          packages = await fetchPricing();
        } catch (error) {
          console.error('Failed to fetch pricing:', error);
          response.status(500).json({ error: 'Failed to fetch pricing information' });
          return;
        }
        
        if (!packages[data.membershipTypeId]) {
          response.status(400).json({ error: 'Invalid membership type ID' });
          return;
        }
        
        const membershipInfo = packages[data.membershipTypeId];
        
        // Validate it's a membership type
        if (membershipInfo.type !== 'membership') {
          response.status(400).json({ error: 'Invalid package type. Must be a membership.' });
          return;
        }
        
        // Step 3: Get or create Stripe customer
        let customerId = studentData.stripeCustomerId;
        
        // Verify the customer exists in Stripe (it might be from test mode or deleted)
        if (customerId) {
          try {
            await stripe.customers.retrieve(customerId);
            console.log('Using existing Stripe customer:', customerId);
          } catch (error) {
            console.log('Existing customer ID invalid, will create new:', error.message);
            customerId = null;
          }
        }
        
        if (!customerId) {
          console.log('Creating Stripe customer for student:', data.studentId);
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
          
          // Update student document with Stripe customer ID
          await db.collection('students').doc(data.studentId).update({
            stripeCustomerId: customerId
          });
        }
        
        // Step 4: Attach payment method to customer and set as default
        try {
          await stripe.paymentMethods.attach(data.paymentMethodId, {
            customer: customerId
          });
          
          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: data.paymentMethodId
            }
          });
          
          console.log('Payment method attached and set as default');
        } catch (error) {
          console.error('Error attaching payment method:', error);
          response.status(500).json({ error: 'Failed to attach payment method' });
          return;
        }
        
        // Step 5: Create Stripe Price for the membership (if doesn't exist)
        // Search for existing price with this membership type ID
        const prices = await stripe.prices.list({
          limit: 100,
          active: true
        });
        
        let priceId = null;
        for (const price of prices.data) {
          if (price.metadata && price.metadata.membershipTypeId === data.membershipTypeId) {
            priceId = price.id;
            console.log('Found existing price:', priceId);
            break;
          }
        }
        
        // Create price if it doesn't exist
        if (!priceId) {
          console.log('Creating new Stripe price for membership type:', data.membershipTypeId);
          const newPrice = await stripe.prices.create({
            currency: 'nzd',
            unit_amount: membershipInfo.price, // Already in cents
            recurring: {
              interval: 'month',
              interval_count: 1
            },
            product_data: {
              name: membershipInfo.name,
              metadata: {
                membershipTypeId: data.membershipTypeId
              }
            },
            metadata: {
              membershipTypeId: data.membershipTypeId
            }
          });
          priceId = newPrice.id;
          console.log('Created new price:', priceId);
        }
        
        // Step 6: Calculate billing cycle anchor (start of next period)
        const now = new Date();
        const billingCycleStart = new Date(now);
        billingCycleStart.setHours(0, 0, 0, 0);
        
        const billingCycleEnd = calculateMembershipExpiry(billingCycleStart);
        
        // Calculate Unix timestamp for billing anchor (when first renewal should occur)
        const billingAnchor = Math.floor(billingCycleEnd.getTime() / 1000);
        
        // Step 7: Create Stripe Subscription
        let subscription;
        try {
          subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            billing_cycle_anchor: billingAnchor,
            proration_behavior: 'none',
            metadata: {
              studentId: data.studentId,
              studentName: `${studentData.firstName} ${studentData.lastName}`,
              membershipTypeId: data.membershipTypeId
            }
          });
          
          console.log('Stripe subscription created:', subscription.id);
        } catch (error) {
          console.error('Error creating subscription:', error);
          response.status(500).json({ error: 'Failed to create subscription: ' + error.message });
          return;
        }
        
        // Step 8: Get the initial invoice for receipt URL
        let receiptUrl = null;
        try {
          if (subscription.latest_invoice) {
            const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
            if (invoice.charge) {
              const charge = await stripe.charges.retrieve(invoice.charge);
              receiptUrl = charge.receipt_url;
            }
          }
        } catch (error) {
          console.warn('Could not retrieve receipt URL:', error.message);
        }
        
        // Step 9: Create membership document
        const membershipId = `${data.studentId}-membership-${Date.now()}`;
        
        const membershipData = {
          studentId: data.studentId,
          studentName: `${studentData.firstName} ${studentData.lastName}`,
          typeId: data.membershipTypeId,
          typeName: membershipInfo.name,
          price: membershipInfo.price / 100, // Convert cents to dollars
          status: 'active',
          isRecurring: true, // Recurring subscription
          purchaseDate: admin.firestore.Timestamp.fromDate(new Date()),
          currentPeriodStart: admin.firestore.Timestamp.fromDate(billingCycleStart),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(billingCycleEnd),
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customerId,
          paymentMethod: 'online',
          cancelledAt: null,
          cancelledBy: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'student-portal-purchase'
        };
        
        await db.collection('memberships').doc(membershipId).set(membershipData);
        console.log('Membership created:', membershipId);
        
        // Step 10: Update student document
        await db.collection('students').doc(data.studentId).update({
          activeMembershipId: membershipId,
          membershipStatus: 'active',
          membershipExpiryDate: admin.firestore.Timestamp.fromDate(billingCycleEnd),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Step 11: Create transaction record
        const timestamp = Date.now();
        const firstNameClean = studentData.firstName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const lastNameClean = studentData.lastName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const transactionId = `${firstNameClean}-${lastNameClean}-${data.membershipTypeId}-${timestamp}`;
        
        console.log('Creating transaction with ID:', transactionId);
        
        const transactionData = {
          studentId: data.studentId,
          transactionDate: admin.firestore.FieldValue.serverTimestamp(),
          type: 'membership-purchase',
          membershipId: membershipId,
          membershipTypeId: data.membershipTypeId,
          membershipTypeName: membershipInfo.name,
          amountPaid: membershipInfo.price / 100,
          paymentMethod: 'online',
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customerId,
          receiptUrl: receiptUrl,
          isRecurring: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'student-portal-purchase'
        };
        
        await db.collection('transactions').doc(transactionId).set(transactionData);
        console.log('Transaction document created:', transactionId);
        
        // Step 12: Return success
        response.status(200).json({
          success: true,
          transactionId: transactionId,
          membershipId: membershipId,
          subscriptionId: subscription.id,
          receiptUrl: receiptUrl,
          amount: membershipInfo.price / 100,
          currentPeriodStart: billingCycleStart.toISOString(),
          currentPeriodEnd: billingCycleEnd.toISOString(),
          message: 'Membership purchase successful! Your membership will auto-renew monthly.'
        });
        
      } catch (error) {
        console.error('Error in processRecurringMembershipPurchase:', error);
        response.status(500).json({ 
          error: error.message || 'An error occurred processing recurring membership purchase' 
        });
      }
    });
  }
);
