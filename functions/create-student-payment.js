/**
 * create-student-payment.js
 * Firebase Callable Function for student registration with payment
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createCustomer, processPayment } = require('./stripe/stripe-payment');
const { fetchPricing } = require('./stripe/stripe-config');

/**
 * Create a new student with payment processing
 * Callable Firebase Function
 * 
 * Expected data structure:
 * {
 *   email: string,
 *   firstName: string,
 *   lastName: string,
 *   phone: string,
 *   packageId: string (document ID from casualRates or concessionPackages),
 *   paymentMethodId: string (from Stripe Elements)
 * }
 */
exports.createStudentWithPayment = onCall(
  { 
    region: 'us-central1',
    cors: true,
    invoker: 'public' // Allow unauthenticated calls from student portal
  },
  async (request) => {
    const data = request.data;
    
    // Validate required fields
    if (!data.email || !data.firstName || !data.lastName) {
      throw new HttpsError('invalid-argument', 'Missing required fields: email, firstName, lastName');
    }
    
    if (!data.packageId) {
      throw new HttpsError('invalid-argument', 'Missing package ID');
    }
    
    // Fetch current pricing to validate package ID
    let packages;
    try {
      packages = await fetchPricing();
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      throw new HttpsError('internal', 'Failed to fetch pricing information');
    }
    
    if (!packages[data.packageId]) {
      throw new HttpsError('invalid-argument', 'Invalid package ID');
    }
    
    const packageInfo = packages[data.packageId];
    
    if (!data.paymentMethodId) {
      throw new HttpsError('invalid-argument', 'Missing payment method');
    }
    
    // Normalize email
    const email = data.email.toLowerCase().trim();
    
    try {
      // Step 1: Check if student already exists
      const db = admin.firestore();
      const studentSnapshot = await db.collection('students')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!studentSnapshot.empty) {
        throw new HttpsError('already-exists', 'A student with this email already exists');
      }
      
      // Step 2: Prepare student data
      const studentData = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: email,
        phone: data.phone?.trim() || null,
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
        throw new HttpsError('internal', 'Failed to create payment customer');
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
        throw new HttpsError('failed-precondition', paymentResult.error || 'Payment processing failed');
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
      
      const studentRef = await db.collection('students').add(studentData);
      const studentId = studentRef.id;
      
      console.log('Student document created:', studentId);
      
      // Step 7: Create user account with Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().createUser({
          email: email,
          displayName: `${studentData.firstName} ${studentData.lastName}`,
          disabled: false
        });
        
        console.log('Firebase Auth user created:', userRecord.uid);
      } catch (authError) {
        console.error('Error creating Firebase Auth user:', authError);
        // Continue - student document is created, they can contact support
      }
      
      // Step 8: Create user document in Firestore (if auth user was created)
      if (userRecord) {
        await db.collection('users').doc(userRecord.uid).set({
          email: email,
          studentId: studentId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          registrationSource: 'student-portal-with-payment'
        });
        
        console.log('User document created for:', userRecord.uid);
      }
      
      // Step 9: Send password reset link for account setup
      if (userRecord) {
        try {
          const resetLink = await admin.auth().generatePasswordResetLink(email);
          console.log('Password reset link generated:', resetLink);
          // Note: The user document creation will trigger sendAccountSetupEmail
          // which will send an email with the portal access button
        } catch (linkError) {
          console.error('Error generating password reset link:', linkError);
          // Continue - they can request reset from login page
        }
      }
      
      // Step 10: Return success
      // Note: The student document creation will trigger sendNewStudentEmail
      // The user document creation will trigger sendAccountSetupEmail
      return {
        success: true,
        studentId: studentId,
        userId: userRecord?.uid,
        customerId: customer.id,
        paymentIntentId: paymentResult.paymentIntentId,
        receiptUrl: paymentResult.receiptUrl,
        message: 'Registration successful! Check your email for login instructions.'
      };
      
    } catch (error) {
      console.error('Error in createStudentWithPayment:', error);
      
      // If it's already an HttpsError, rethrow it
      if (error instanceof HttpsError) {
        throw error;
      }
      
      // Otherwise wrap in internal error
      throw new HttpsError('internal', error.message || 'An error occurred during registration');
    }
  }
);
