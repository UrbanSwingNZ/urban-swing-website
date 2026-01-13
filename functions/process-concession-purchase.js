/**
 * process-concession-purchase.js
 * Firebase Callable Function for processing concession package purchase for existing students
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createCustomer, processPayment } = require('./stripe/stripe-payment');
const { fetchPricing } = require('./stripe/stripe-config');
const { determineTransactionType } = require('./utils/transaction-utils');
const cors = require('cors')({ origin: true });

/**
 * Process concession package purchase for existing student
 * HTTP Function with CORS support
 * 
 * Expected data structure:
 * {
 *   studentId: string,
 *   packageId: string (document ID from concessionPackages),
 *   paymentMethodId: string (from Stripe Elements)
 * }
 */
exports.processConcessionPurchase = onRequest(
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
        
        if (!data.packageId) {
          response.status(400).json({ error: 'Missing package ID' });
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
        
        // Step 2: Fetch pricing to validate package ID
        let packages;
        try {
          packages = await fetchPricing();
        } catch (error) {
          console.error('Failed to fetch pricing:', error);
          response.status(500).json({ error: 'Failed to fetch pricing information' });
          return;
        }
        
        if (!packages[data.packageId]) {
          response.status(400).json({ error: 'Invalid package ID' });
          return;
        }
        
        const packageInfo = packages[data.packageId];
        
        // Validate it's a concession package
        if (packageInfo.type !== 'concession-package') {
          response.status(400).json({ error: 'Invalid package type. Must be a concession package.' });
          return;
        }
        
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
        console.log('Processing concession purchase for customer:', customerId);
        const paymentResult = await processPayment({
          customerId: customerId,
          paymentMethodId: data.paymentMethodId,
          packageId: data.packageId,
          studentData: studentData
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
        
        // Step 6: Create concession block
        const purchaseDate = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + packageInfo.expiryMonths);
        
        const blockId = `${data.studentId}-${data.packageId}-${Date.now()}`;
        
        const blockData = {
          studentId: data.studentId,
          packageId: data.packageId,
          packageName: packageInfo.name,
          initialQuantity: packageInfo.numberOfClasses,
          remainingQuantity: packageInfo.numberOfClasses,
          purchaseDate: admin.firestore.Timestamp.fromDate(purchaseDate),
          expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
          amountPaid: paymentResult.amount / 100,
          paymentIntentId: paymentResult.paymentIntentId,
          stripeCustomerId: customerId,
          receiptUrl: paymentResult.receiptUrl,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'student-portal-purchase'
        };
        
        await db.collection('concessionBlocks').doc(blockId).set(blockData);
        console.log('Concession block created:', blockId);
        
        // Step 7: Create transaction record
        const timestamp = Date.now();
        const firstNameClean = studentData.firstName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const lastNameClean = studentData.lastName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const transactionId = `${firstNameClean}-${lastNameClean}-${data.packageId}-${timestamp}`;
        
        console.log('Creating transaction with ID:', transactionId);
        
        const transactionData = {
          studentId: data.studentId,
          transactionDate: admin.firestore.FieldValue.serverTimestamp(),
          type: 'concession-purchase',
          packageId: data.packageId,
          packageName: packageInfo.name,
          packageType: packageInfo.type,
          numberOfClasses: packageInfo.numberOfClasses,
          concessionBlockId: blockId,
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
        
        // Step 8: Return success
        response.status(200).json({
          success: true,
          transactionId: transactionId,
          concessionBlockId: blockId,
          paymentIntentId: paymentResult.paymentIntentId,
          receiptUrl: paymentResult.receiptUrl,
          amount: paymentResult.amount / 100,
          numberOfClasses: packageInfo.numberOfClasses,
          expiryDate: expiryDate.toISOString(),
          message: 'Purchase successful! Your concession block has been created.'
        });
        
      } catch (error) {
        console.error('Error in processConcessionPurchase:', error);
        response.status(500).json({ 
          error: error.message || 'An error occurred processing purchase' 
        });
      }
    });
  }
);
