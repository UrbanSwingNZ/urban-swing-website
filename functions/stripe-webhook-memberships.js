/**
 * stripe-webhook-memberships.js
 * Stripe webhook handler for membership subscription events
 * Handles subscription lifecycle events: renewals, failures, cancellations
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { stripe } = require('./stripe/stripe-config');

// Webhook secret for signature verification
// Set this in your Firebase Functions environment: firebase functions:config:set stripe.webhook_secret="whsec_..."
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Calculate membership expiry date (1 month from start, using "sticky day" approach)
 * @param {Date} startDate - Membership start date
 * @returns {Date} Expiry date (valid through end of day)
 */
function calculateMembershipExpiry(startDate) {
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  expiryDate.setHours(23, 59, 59, 999);
  return expiryDate;
}

/**
 * Stripe Webhook Handler for Membership Subscriptions
 * HTTP Function for receiving Stripe webhook events
 * 
 * Handles the following events:
 * - invoice.payment_succeeded: Extend membership on successful renewal
 * - invoice.payment_failed: Mark membership as expired
 * - customer.subscription.updated: Update membership period
 * - customer.subscription.deleted: Mark membership as cancelled
 */
exports.stripeWebhookMemberships = onRequest(
  { 
    region: 'us-central1',
    invoker: 'public' // Stripe needs to call this
  },
  async (request, response) => {
    try {
      // Only accept POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      // Get the signature from the header
      const sig = request.headers['stripe-signature'];
      
      if (!sig) {
        console.error('Missing Stripe signature header');
        response.status(400).json({ error: 'Missing signature' });
        return;
      }
      
      // Verify webhook signature
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          request.rawBody,
          sig,
          WEBHOOK_SECRET
        );
        console.log('Webhook signature verified:', event.type);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        response.status(400).json({ error: 'Invalid signature' });
        return;
      }
      
      const db = admin.firestore();
      
      // Handle the event based on type
      switch (event.type) {
        case 'invoice.payment_succeeded': {
          console.log('Processing invoice.payment_succeeded event');
          const invoice = event.data.object;
          
          // Check if this is for a subscription (not a one-time payment)
          if (!invoice.subscription) {
            console.log('Invoice is not for a subscription, skipping');
            response.status(200).json({ received: true, skipped: true });
            return;
          }
          
          // Find membership by subscription ID
          const membershipsSnapshot = await db.collection('memberships')
            .where('stripeSubscriptionId', '==', invoice.subscription)
            .limit(1)
            .get();
          
          if (membershipsSnapshot.empty) {
            console.log('No membership found for subscription:', invoice.subscription);
            response.status(200).json({ received: true, notFound: true });
            return;
          }
          
          const membershipDoc = membershipsSnapshot.docs[0];
          const membershipData = membershipDoc.data();
          const membershipId = membershipDoc.id;
          
          // Calculate new period dates
          const currentPeriodEnd = membershipData.currentPeriodEnd.toDate();
          const newPeriodStart = new Date(currentPeriodEnd);
          newPeriodStart.setHours(0, 0, 0, 0);
          
          const newPeriodEnd = calculateMembershipExpiry(newPeriodStart);
          
          // Update membership document
          await db.collection('memberships').doc(membershipId).update({
            currentPeriodStart: admin.firestore.Timestamp.fromDate(newPeriodStart),
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(newPeriodEnd),
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Update student document
          await db.collection('students').doc(membershipData.studentId).update({
            membershipExpiryDate: admin.firestore.Timestamp.fromDate(newPeriodEnd),
            membershipStatus: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Create transaction record for renewal
          const timestamp = Date.now();
          const transactionId = `${membershipData.studentId}-membership-renewal-${timestamp}`;
          
          let receiptUrl = null;
          try {
            if (invoice.charge) {
              const charge = await stripe.charges.retrieve(invoice.charge);
              receiptUrl = charge.receipt_url;
            }
          } catch (error) {
            console.warn('Could not retrieve receipt URL:', error.message);
          }
          
          const transactionData = {
            studentId: membershipData.studentId,
            transactionDate: admin.firestore.FieldValue.serverTimestamp(),
            type: 'membership-renewal',
            membershipId: membershipId,
            membershipTypeId: membershipData.typeId,
            membershipTypeName: membershipData.typeName,
            amountPaid: invoice.amount_paid / 100, // Convert cents to dollars
            paymentMethod: 'online',
            stripeSubscriptionId: invoice.subscription,
            stripeInvoiceId: invoice.id,
            stripeCustomerId: membershipData.stripeCustomerId,
            receiptUrl: receiptUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'stripe-webhook'
          };
          
          await db.collection('transactions').doc(transactionId).set(transactionData);
          
          console.log('Membership renewed:', membershipId);
          break;
        }
        
        case 'invoice.payment_failed': {
          console.log('Processing invoice.payment_failed event');
          const invoice = event.data.object;
          
          // Check if this is for a subscription
          if (!invoice.subscription) {
            console.log('Invoice is not for a subscription, skipping');
            response.status(200).json({ received: true, skipped: true });
            return;
          }
          
          // Find membership by subscription ID
          const membershipsSnapshot = await db.collection('memberships')
            .where('stripeSubscriptionId', '==', invoice.subscription)
            .limit(1)
            .get();
          
          if (membershipsSnapshot.empty) {
            console.log('No membership found for subscription:', invoice.subscription);
            response.status(200).json({ received: true, notFound: true });
            return;
          }
          
          const membershipDoc = membershipsSnapshot.docs[0];
          const membershipData = membershipDoc.data();
          const membershipId = membershipDoc.id;
          
          // Mark membership as expired immediately (no grace period)
          await db.collection('memberships').doc(membershipId).update({
            status: 'expired',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Update student document
          await db.collection('students').doc(membershipData.studentId).update({
            activeMembershipId: null,
            membershipStatus: null,
            membershipExpiryDate: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // TODO: Send notification email to student and admin
          console.warn('Payment failed for membership:', membershipId, '- Marked as expired');
          break;
        }
        
        case 'customer.subscription.updated': {
          console.log('Processing customer.subscription.updated event');
          const subscription = event.data.object;
          
          // Find membership by subscription ID
          const membershipsSnapshot = await db.collection('memberships')
            .where('stripeSubscriptionId', '==', subscription.id)
            .limit(1)
            .get();
          
          if (membershipsSnapshot.empty) {
            console.log('No membership found for subscription:', subscription.id);
            response.status(200).json({ received: true, notFound: true });
            return;
          }
          
          const membershipDoc = membershipsSnapshot.docs[0];
          const membershipId = membershipDoc.id;
          
          // Update current period dates from subscription
          const periodEnd = new Date(subscription.current_period_end * 1000);
          periodEnd.setHours(23, 59, 59, 999);
          
          await db.collection('memberships').doc(membershipId).update({
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log('Membership period updated from subscription:', membershipId);
          break;
        }
        
        case 'customer.subscription.deleted': {
          console.log('Processing customer.subscription.deleted event');
          const subscription = event.data.object;
          
          // Find membership by subscription ID
          const membershipsSnapshot = await db.collection('memberships')
            .where('stripeSubscriptionId', '==', subscription.id)
            .limit(1)
            .get();
          
          if (membershipsSnapshot.empty) {
            console.log('No membership found for subscription:', subscription.id);
            response.status(200).json({ received: true, notFound: true });
            return;
          }
          
          const membershipDoc = membershipsSnapshot.docs[0];
          const membershipData = membershipDoc.data();
          const membershipId = membershipDoc.id;
          
          // Mark membership as cancelled
          await db.collection('memberships').doc(membershipId).update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: 'stripe-webhook',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Clear student document if this is the active membership
          if (membershipData.status === 'active') {
            await db.collection('students').doc(membershipData.studentId).update({
              activeMembershipId: null,
              membershipStatus: null,
              membershipExpiryDate: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          
          console.log('Membership cancelled via webhook:', membershipId);
          break;
        }
        
        default:
          console.log('Unhandled event type:', event.type);
      }
      
      // Return 200 to acknowledge receipt
      response.status(200).json({ received: true });
      
    } catch (error) {
      console.error('Error processing webhook:', error);
      response.status(500).json({ error: error.message });
    }
  }
);
