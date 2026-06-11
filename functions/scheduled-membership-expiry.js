/**
 * scheduled-membership-expiry.js
 * Cloud Scheduler Function - Checks for expired memberships daily
 * Runs at 8:00 AM NZ time daily
 * 
 * For non-recurring memberships that have passed their expiry date:
 * - Updates membership status to 'expired'
 * - Updates student activeMembershipId to null
 * - Updates student membershipStatus to 'expired'
 * - Sends admin email with list of expired memberships
 * 
 * Note: Recurring memberships are handled by Stripe webhooks (customer.subscription.deleted)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

/**
 * Check for expired memberships and update status
 * Scheduled to run daily at 8:00 AM NZ time
 */
exports.checkExpiredMemberships = onSchedule({
  schedule: '0 8 * * *', // Cron: 8:00 AM daily
  timeZone: 'Pacific/Auckland',
  region: 'us-central1'
}, async (event) => {
  console.log('Starting daily expired membership check...');
  
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const expiredList = [];
  
  try {
    // Query for active memberships that have passed their expiry date
    // Only check non-recurring OR recurring without Stripe subscription (manually cancelled)
    const expiredMemberships = await db.collection('memberships')
      .where('status', '==', 'active')
      .where('currentPeriodEnd', '<', now)
      .get();
    
    console.log(`Found ${expiredMemberships.size} potentially expired memberships`);
    
    // Process each expired membership
    for (const doc of expiredMemberships.docs) {
      const membershipData = doc.data();
      const membershipId = doc.id;
      
      // Skip recurring memberships with active Stripe subscriptions
      // (these should be handled by webhooks)
      if (membershipData.isRecurring && membershipData.stripeSubscriptionId) {
        console.log(`Skipping ${membershipId} - has active Stripe subscription`);
        continue;
      }
      
      console.log(`Processing expired membership: ${membershipId}`);
      
      try {
        // Update membership status to expired
        await db.collection('memberships').doc(membershipId).update({
          status: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update student document
        await db.collection('students').doc(membershipData.studentId).update({
          activeMembershipId: null,
          membershipStatus: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Add to expired list for admin notification
        expiredList.push({
          studentId: membershipData.studentId,
          studentName: membershipData.studentName,
          membershipType: membershipData.typeName,
          expiryDate: membershipData.currentPeriodEnd.toDate().toLocaleDateString('en-NZ'),
          isRecurring: membershipData.isRecurring || false
        });
        
        console.log(`Successfully expired membership ${membershipId} for ${membershipData.studentName}`);
      } catch (error) {
        console.error(`Error processing membership ${membershipId}:`, error);
      }
    }
    
    // Log summary
    console.log(`Expired membership check complete: ${expiredList.length} memberships expired`);
    
    // TODO: Phase 9.7 - Send admin email with expired memberships
    // if (expiredList.length > 0) {
    //   await sendMembershipExpiredAdminAlert(expiredList);
    // }
    
    return {
      success: true,
      expiredCount: expiredList.length,
      expiredMemberships: expiredList
    };
    
  } catch (error) {
    console.error('Error in checkExpiredMemberships:', error);
    throw error;
  }
});
