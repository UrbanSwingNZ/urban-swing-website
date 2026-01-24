/**
 * process-casual-payment.js
 * Firebase Callable Function for processing casual entry payment for existing students
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createCustomer, processPayment } = require('./stripe/stripe-payment');
const { fetchPricing } = require('./stripe/stripe-config');
const { determineTransactionType } = require('./utils/transaction-utils');
const cors = require('cors')({ origin: true });

/**
 * Process casual entry payment for existing student
 * HTTP Function with CORS support
 * 
 * Expected data structure:
 * {
 *   studentId: string,
 *   rateId: string (document ID from casualRates),
 *   classDate: string (ISO date string),
 *   paymentMethodId: string (from Stripe Elements)
 * }
 */
exports.processCasualPayment = onRequest(
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
        
        if (!data.rateId) {
          response.status(400).json({ error: 'Missing rate ID' });
          return;
        }
        
        if (!data.classDate) {
          response.status(400).json({ error: 'Missing class date' });
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
        
        // Step 2: Check for duplicate casual class purchase on same date (BEFORE calling Stripe)
        const classDateObj = new Date(data.classDate);
        const startOfDay = new Date(classDateObj);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(classDateObj);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Query for existing transactions for this student (no compound index required)
        const existingTransactions = await db.collection('transactions')
          .where('studentId', '==', data.studentId)
          .get();
        
        // Filter by date in JavaScript to avoid needing a compound index
        const hasCasualClass = existingTransactions.docs.some(doc => {
          const txData = doc.data();
          
          // Skip if reversed or not a casual type
          if (txData.reversed || (txData.type !== 'casual' && txData.type !== 'casual-student')) {
            return false;
          }
          
          // Check if classDate is on the same day
          if (txData.classDate) {
            const txDate = txData.classDate.toDate();
            const txStartOfDay = new Date(txDate);
            txStartOfDay.setHours(0, 0, 0, 0);
            
            return txStartOfDay.getTime() === startOfDay.getTime();
          }
          
          return false;
        });
        
        if (hasCasualClass) {
          console.log('Duplicate casual class purchase prevented for:', data.studentId, 'on', data.classDate);
          response.status(409).json({ 
            error: 'You already have a class booked for this date. Please select a different date.' 
          });
          return;
        }
        
        // Step 3: Fetch pricing to validate rate ID
        let packages;
        try {
          packages = await fetchPricing();
        } catch (error) {
          console.error('Failed to fetch pricing:', error);
          response.status(500).json({ error: 'Failed to fetch pricing information' });
          return;
        }
        
        if (!packages[data.rateId]) {
          response.status(400).json({ error: 'Invalid rate ID' });
          return;
        }
        
        const rateInfo = packages[data.rateId];
        
        // Step 3: Get or create Stripe customer
        let customerId = studentData.stripeCustomerId;
        
        // Verify the customer exists in Stripe (it might be from test mode or deleted)
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
        console.log('Processing casual payment for customer:', customerId);
        const paymentResult = await processPayment({
          customerId: customerId,
          paymentMethodId: data.paymentMethodId,
          packageId: data.rateId,
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
        
        // Step 6: Create transaction record
        const timestamp = new Date().getTime();
        const firstNameClean = studentData.firstName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const lastNameClean = studentData.lastName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const transactionId = `${firstNameClean}-${lastNameClean}-${data.rateId}-${timestamp}`;
        
        console.log('Creating transaction with ID:', transactionId);
        
        // Determine transaction type based on package type
        const transactionType = determineTransactionType(rateInfo, data.rateId);
        
        const transactionData = {
          studentId: data.studentId,
          transactionDate: admin.firestore.FieldValue.serverTimestamp(),
          type: transactionType,
          entryType: transactionType, // For backwards compatibility
          packageId: data.rateId,
          packageName: rateInfo.name,
          packageType: rateInfo.type,
          classDate: admin.firestore.Timestamp.fromDate(new Date(data.classDate)),
          amountPaid: paymentResult.amount / 100, // Convert from cents to dollars
          paymentMethod: 'online',
          paymentIntentId: paymentResult.paymentIntentId,
          stripeCustomerId: customerId,
          receiptUrl: paymentResult.receiptUrl,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'student-portal-prepay'
        };
        
        await db.collection('transactions').doc(transactionId).set(transactionData);
        console.log('Transaction document created:', transactionId);
        
        // Step 7: Return success
        response.status(200).json({
          success: true,
          transactionId: transactionId,
          paymentIntentId: paymentResult.paymentIntentId,
          receiptUrl: paymentResult.receiptUrl,
          amount: paymentResult.amount / 100,
          message: 'Payment successful! Your class has been pre-paid.'
        });
        
      } catch (error) {
        console.error('Error in processCasualPayment:', error);
        response.status(500).json({ 
          error: error.message || 'An error occurred processing payment' 
        });
      }
    });
  }
);
