/**
 * process-workshop-payment.js
 * Firebase Callable Function for processing workshop registration payments
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createCustomer } = require('./stripe/stripe-payment');
const { stripe, CURRENCY } = require('./stripe/stripe-config');
const cors = require('cors')({ origin: true });

/**
 * Process workshop registration payment
 * HTTP Function with CORS support
 * 
 * Expected data structure:
 * {
 *   studentId: string,
 *   workshopId: string,
 *   paymentMethodId: string (from Stripe Elements)
 * }
 */
exports.processWorkshopPayment = onRequest(
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
        
        if (!data.workshopId) {
          response.status(400).json({ error: 'Missing workshop ID' });
          return;
        }
        
        if (!data.paymentMethodId && data.paidOnline) {
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
        const studentName = `${studentData.firstName} ${studentData.lastName}`;
        
        // Step 2: Get workshop document
        const workshopDoc = await db.collection('workshops').doc(data.workshopId).get();
        
        if (!workshopDoc.exists) {
          response.status(404).json({ error: 'Workshop not found' });
          return;
        }
        
        const workshopData = workshopDoc.data();
        
        // Check if student is already registered
        const isRegistered = workshopData.registeredStudents?.some(
          reg => reg.studentId === data.studentId
        );
        
        if (isRegistered) {
          response.status(409).json({ error: 'You are already registered for this workshop' });
          return;
        }
        
        // Check if student is invited (if not open to all)
        if (!workshopData.openToAll) {
          const isInvited = workshopData.invitedStudents?.includes(data.studentId);
          if (!isInvited) {
            response.status(403).json({ error: 'You are not invited to this workshop' });
            return;
          }
        }
        
        // Step 3: Handle pay-at-door / free registration (no Stripe needed)
        const hasCost = workshopData.cost && workshopData.cost > 0;
        const paidOnline = data.paidOnline && hasCost;

        if (!paidOnline) {
          // Register without payment
          const registration = {
            studentId: data.studentId,
            studentName: studentName,
            registeredAt: admin.firestore.Timestamp.now(),
            paidOnline: false,
            transactionId: null
          };

          await db.collection('workshops').doc(data.workshopId).update({
            registeredStudents: admin.firestore.FieldValue.arrayUnion(registration),
            invitedStudents: admin.firestore.FieldValue.arrayUnion(data.studentId)
          });

          response.status(200).json({
            success: true,
            workshopName: workshopData.name,
            paidOnline: false
          });
          return;
        }

        // Step 3 (continued): Get or create Stripe customer
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
          const customer = await createCustomer(studentData);
          customerId = customer.id;
          
          // Update student document with Stripe customer ID
          await db.collection('students').doc(data.studentId).update({
            stripeCustomerId: customerId
          });
        }
        
        // Step 4: Attach payment method to customer and process payment directly
        // (Ignore error if already attached to this customer)
        try {
          await stripe.paymentMethods.attach(data.paymentMethodId, {
            customer: customerId
          });
        } catch (attachError) {
          if (attachError.code !== 'payment_method_already_attached') {
            throw attachError;
          }
        }

        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: data.paymentMethodId }
        });

        // Step 5: Create and confirm payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(workshopData.cost * 100),
          currency: CURRENCY,
          customer: customerId,
          payment_method: data.paymentMethodId,
          confirm: true,
          off_session: true,
          description: `Urban Swing - ${workshopData.name}`,
          metadata: {
            studentName: studentName,
            studentEmail: studentData.email,
            workshopId: data.workshopId,
            workshopName: workshopData.name,
            type: 'workshop',
            source: 'student-portal'
          },
          receipt_email: studentData.email
        });

        if (paymentIntent.status === 'requires_action') {
          response.status(402).json({
            error: 'Your card requires additional authentication. Please contact us to complete your registration.',
            requiresAction: true,
            clientSecret: paymentIntent.client_secret
          });
          return;
        }

        if (paymentIntent.status !== 'succeeded') {
          response.status(400).json({
            error: `Payment failed (status: ${paymentIntent.status}). Please check your card details and try again.`
          });
          return;
        }

        const paymentIntentId = paymentIntent.id;
        const latestCharge = paymentIntent.latest_charge
          ? await stripe.charges.retrieve(paymentIntent.latest_charge)
          : null;
        const receiptUrl = latestCharge?.receipt_url || null;
        
        // Step 6: Create transaction record
        const transactionRef = await db.collection('transactions').add({
          type: 'workshop-entry',
          workshopId: data.workshopId,
          workshopName: workshopData.name,
          studentId: data.studentId,
          studentName: studentName,
          amount: workshopData.cost,
          paymentMethod: 'online',
          classDate: workshopData.date, // Workshop date
          date: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: data.studentId,
          stripePaymentIntentId: paymentIntentId,
          reversed: false,
          refunded: null
        });
        
        console.log('Workshop transaction created:', transactionRef.id);
        
        // Step 7: Add student to workshop's registeredStudents array
        const registration = {
          studentId: data.studentId,
          studentName: studentName,
          registeredAt: admin.firestore.Timestamp.now(),
          paidOnline: true,
          transactionId: transactionRef.id
        };
        
        await db.collection('workshops').doc(data.workshopId).update({
          registeredStudents: admin.firestore.FieldValue.arrayUnion(registration),
          // Also add to invitedStudents if not already there (for future access)
          invitedStudents: admin.firestore.FieldValue.arrayUnion(data.studentId)
        });
        
        console.log('Student registered for workshop:', data.studentId, workshopData.name);
        
        // Success response
        response.status(200).json({
          success: true,
          transactionId: transactionRef.id,
          paymentIntentId: paymentIntentId,
          receiptUrl: receiptUrl,
          workshopName: workshopData.name,
          amount: workshopData.cost
        });
        
      } catch (error) {
        // Pass Stripe card errors (declined, insufficient funds, etc.) back as 400
        // so the client can show the actual reason to the user
        if (error.type && (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError')) {
          response.status(400).json({ error: error.message });
          return;
        }
        console.error('Workshop payment error:', error);
        response.status(500).json({
          error: 'Something went wrong processing your payment. Please try again or contact us.',
          message: error.message
        });
      }
    });
  }
);
