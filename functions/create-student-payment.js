/**
 * create-student-payment.js
 * Firebase Callable Function for student registration with payment
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createCustomer, processPayment } = require('./stripe/stripe-payment');
const { fetchPricing } = require('./stripe/stripe-config');
const { determineTransactionType } = require('./utils/transaction-utils');
const cors = require('cors')({ origin: true });

/**
 * Generate human-readable student ID
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Generated ID in format: firstname-lastname-abc123
 */
function generateStudentId(firstName, lastName) {
  // Normalize names: lowercase, remove special characters, replace spaces with hyphens
  const cleanFirst = firstName.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const cleanLast = lastName.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Generate a short random suffix (6 characters)
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${cleanFirst}-${cleanLast}-${randomSuffix}`;
}

/**
 * Create a new student with payment processing
 * HTTP Function with CORS support
 * 
 * Expected data structure:
 * {
 *   email: string,
 *   firstName: string,
 *   lastName: string,
 *   phone: string,
 *   packageId: string (document ID from casualRates or concessionPackages),
 *   paymentMethodId: string (from Stripe Elements),
 *   firstClassDate: string (ISO date string - required for casual-rate packages)
 * }
 * 
 * Note: Auth user and user document are created by frontend after successful payment
 */
exports.createStudentWithPayment = onRequest(
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
        if (!data.email || !data.firstName || !data.lastName) {
          response.status(400).json({ error: 'Missing required fields: email, firstName, lastName' });
          return;
        }
        
        if (!data.packageId) {
          response.status(400).json({ error: 'Missing package ID' });
          return;
        }
        
        // Fetch current pricing to validate package ID
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
        
        // Validate classDate for casual-rate packages
        if (packageInfo.type === 'casual-rate' && (!data.firstClassDate || data.firstClassDate === 'null')) {
          response.status(400).json({ error: 'Missing class date for casual entry' });
          return;
        }
        
        if (!data.paymentMethodId) {
          response.status(400).json({ error: 'Missing payment method' });
          return;
        }
        
        // Normalize email
        const email = data.email.toLowerCase().trim();
        
        // Step 1: Check if student already exists
        const db = admin.firestore();
        const studentSnapshot = await db.collection('students')
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (!studentSnapshot.empty) {
          // Student exists - check for duplicate casual class purchase if this is a casual rate
          if (packageInfo.type === 'casual-rate' && data.firstClassDate) {
            const existingStudent = studentSnapshot.docs[0];
            const existingStudentId = existingStudent.id;
            
            const classDateObj = new Date(data.firstClassDate);
            const startOfDay = new Date(classDateObj);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(classDateObj);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Query for existing casual transactions for this student on this date
            const existingTransactions = await db.collection('transactions')
              .where('studentId', '==', existingStudentId)
              .where('classDate', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
              .where('classDate', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
              .get();
            
            // Check if any non-reversed casual/casual-student transactions exist
            const hasCasualClass = existingTransactions.docs.some(doc => {
              const txData = doc.data();
              return (txData.type === 'casual' || txData.type === 'casual-student') && 
                     !txData.reversed;
            });
            
            if (hasCasualClass) {
              console.log('Duplicate casual class purchase prevented for existing student:', existingStudentId, 'on', data.firstClassDate);
              response.status(409).json({ 
                error: 'You already have a class booked for this date. Please select a different date.' 
              });
              return;
            }
          }
          
          response.status(409).json({ error: 'A student with this email already exists' });
          return;
        }
        
        // Step 1.5: Generate student ID using the naming convention
        const studentId = generateStudentId(data.firstName.trim(), data.lastName.trim());
        console.log('Generated student ID:', studentId);
        
        // Step 2: Prepare student data
        const studentData = {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: email,
          phoneNumber: data.phoneNumber?.trim() || null,
          pronouns: data.pronouns?.trim() || '',
          referral: data.referral?.trim() || '',
          over16Confirmed: data.over16Confirmed || false,
          termsAccepted: data.termsAccepted || false,
          emailConsent: data.emailConsent !== undefined ? data.emailConsent : true,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          registrationSource: 'student-portal-with-payment',
          packageId: data.packageId,
          packageName: packageInfo.name,
          packageType: packageInfo.type
        };
        
        // Step 3: Create Stripe Customer
        console.log('Creating Stripe customer for:', email);
        const customer = await createCustomer(studentData);
        
        if (!customer || !customer.id) {
          response.status(500).json({ error: 'Failed to create payment customer' });
          return;
        }
        
        // Step 4: Process Payment
        console.log('Processing payment for customer:', customer.id);
        const paymentResult = await processPayment({
          customerId: customer.id,
          paymentMethodId: data.paymentMethodId,
          packageId: data.packageId,
          studentData: studentData
        });
        
        // Step 5: Check payment result
        if (!paymentResult.success) {
          console.error('Payment failed:', paymentResult.error);
          console.error('Full payment result:', JSON.stringify(paymentResult));
          response.status(402).json({ 
            error: paymentResult.error || 'Payment processing failed',
            details: paymentResult.stripeError || null
          });
          return;
        }
        
        console.log('Payment succeeded:', paymentResult.paymentIntentId);
        
        // Step 6: Create student document in Firestore
        // Add Stripe customer ID and payment info to student data
        studentData.stripeCustomerId = customer.id;
        studentData.initialPayment = {
          paymentIntentId: paymentResult.paymentIntentId,
          amount: paymentResult.amount,
          currency: paymentResult.currency,
          packageId: data.packageId,
          packageName: packageInfo.name,
          packageType: packageInfo.type,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          receiptUrl: paymentResult.receiptUrl
        };
        
        // Create student document with the generated ID
        await db.collection('students').doc(studentId).set(studentData);
        console.log('Student document created:', studentId);
        
        // Note: User document and auth user will be created by frontend after payment
        // This avoids IAM permission issues with backend creating auth users
        
        // Step 6.6: Create transaction record
        const timestamp = new Date().getTime();
        const firstNameClean = data.firstName.trim().toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const lastNameClean = data.lastName.trim().toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const transactionId = `${firstNameClean}-${lastNameClean}-${data.packageId}-${timestamp}`;
        
        console.log('Creating transaction with ID:', transactionId);
        
        // Determine transaction type based on package type
        const transactionType = determineTransactionType(packageInfo, data.packageId);
        
        const transactionData = {
          studentId: studentId,
          transactionDate: admin.firestore.FieldValue.serverTimestamp(),
          type: transactionType,
          packageId: data.packageId,
          packageName: packageInfo.name,
          packageType: packageInfo.type,
          amountPaid: paymentResult.amount / 100, // Convert from cents to dollars
          paymentMethod: 'stripe',
          checkinId: null,
          paymentIntentId: paymentResult.paymentIntentId,
          stripeCustomerId: customer.id,
          receiptUrl: paymentResult.receiptUrl,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Add classDate for casual-rate purchases
        if (packageInfo.type === 'casual-rate' && data.firstClassDate && data.firstClassDate !== 'null') {
          transactionData.classDate = admin.firestore.Timestamp.fromDate(new Date(data.firstClassDate));
        }
        
        await db.collection('transactions').doc(transactionId).set(transactionData);
        console.log('Transaction document created:', transactionId);
        
        // Step 7: Return success with all document IDs
        response.status(200).json({
          success: true,
          studentId: studentId,
          userId: studentId,
          transactionId: transactionId,
          customerId: customer.id,
          paymentIntentId: paymentResult.paymentIntentId,
          receiptUrl: paymentResult.receiptUrl,
          message: 'Payment successful! Completing registration...'
        });
        
      } catch (error) {
        console.error('Error in createStudentWithPayment:', error);
        response.status(500).json({ 
          error: error.message || 'An error occurred during registration' 
        });
      }
    });
  }
);
