/**
 * scheduled-membership-expiry.js
 * Cloud Scheduler Function - Checks for expired memberships daily
 * Runs at 8:00 AM NZ time daily
 * 
 * For non-recurring memberships that have passed their expiry date:
 * - Updates membership status to 'expired'
 * - Updates student activeMembershipId to null
 * - Updates student membershipStatus to 'expired'
 * 
 * For non-recurring memberships expiring in 3 days:
 * - Sends warning email to student with BCC to admin
 * 
 * Note: Recurring memberships are handled by Stripe webhooks (customer.subscription.deleted)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { getFunctions } = require('firebase-admin/functions');
const { httpsCallable } = require('firebase-admin/functions');

/**
 * Check for expired memberships and update status
 * Scheduled to run daily at 8:00 AM NZ time
 */
exports.checkExpiredMemberships = onSchedule({
  schedule: '0 8 * * *', // Cron: 8:00 AM daily
  timeZone: 'Pacific/Auckland',
  region: 'us-central1'
}, async (event) => {
  console.log('Starting daily membership check (activation, expiry, warnings)...');
  
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const activatedList = [];
  const expiredList = [];
  
  // Calculate 3 days from now for expiry warnings
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  threeDaysFromNow.setHours(23, 59, 59, 999); // End of day
  const threeDaysTimestamp = admin.firestore.Timestamp.fromDate(threeDaysFromNow);
  
  // Calculate start of 3 days from now (for range query)
  const threeDaysStart = new Date(threeDaysFromNow);
  threeDaysStart.setHours(0, 0, 0, 0);
  const threeDaysStartTimestamp = admin.firestore.Timestamp.fromDate(threeDaysStart);
  
  try {
    // ========================================
    // 1. ACTIVATE SCHEDULED MEMBERSHIPS
    // ========================================
    console.log('Checking for scheduled memberships to activate...');
    
    const scheduledMemberships = await db.collection('memberships')
      .where('status', '==', 'scheduled')
      .where('startDate', '<=', now)
      .get();
    
    console.log(`Found ${scheduledMemberships.size} scheduled memberships ready to activate`);
    
    for (const doc of scheduledMemberships.docs) {
      const membershipData = doc.data();
      const membershipId = doc.id;
      
      console.log(`Activating scheduled membership: ${membershipId}`);
      
      try {
        // Update membership status to active
        await db.collection('memberships').doc(membershipId).update({
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update student document
        await db.collection('students').doc(membershipData.studentId).update({
          activeMembershipId: membershipId,
          membershipStatus: 'active',
          membershipExpiryDate: membershipData.currentPeriodEnd,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        activatedList.push({
          studentId: membershipData.studentId,
          studentName: membershipData.studentName,
          membershipType: membershipData.typeName,
          startDate: membershipData.startDate.toDate().toLocaleDateString('en-NZ'),
          expiryDate: membershipData.currentPeriodEnd.toDate().toLocaleDateString('en-NZ')
        });
        
        console.log(`Successfully activated membership ${membershipId} for ${membershipData.studentName}`);
      } catch (error) {
        console.error(`Error activating membership ${membershipId}:`, error);
      }
    }
    
    console.log(`Scheduled membership activation complete: ${activatedList.length} memberships activated`);
    
    // ========================================
    // 2. EXPIRE ACTIVE MEMBERSHIPS
    // ========================================
    console.log('Checking for expired memberships...');
    
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
    
    // ========================================
    // CHECK FOR MEMBERSHIPS EXPIRING IN 3 DAYS
    // ========================================
    console.log('Checking for memberships expiring in 3 days...');
    
    const expiringList = [];
    
    // Query for non-recurring memberships expiring in 3 days
    // Range: between start of 3 days from now and end of 3 days from now
    const expiringMemberships = await db.collection('memberships')
      .where('status', '==', 'active')
      .where('currentPeriodEnd', '>=', threeDaysStartTimestamp)
      .where('currentPeriodEnd', '<=', threeDaysTimestamp)
      .get();
    
    console.log(`Found ${expiringMemberships.size} memberships expiring in 3 days`);
    
    // Process each expiring membership
    for (const doc of expiringMemberships.docs) {
      const membershipData = doc.data();
      const membershipId = doc.id;
      
      // Only send emails to non-recurring memberships
      // (recurring memberships will get payment failure emails if there's an issue)
      if (membershipData.isRecurring) {
        console.log(`Skipping ${membershipId} - is recurring (auto-renew enabled)`);
        continue;
      }
      
      console.log(`Processing expiring membership: ${membershipId}`);
      
      try {
        // Fetch student data to get email
        const studentDoc = await db.collection('students').doc(membershipData.studentId).get();
        
        if (!studentDoc.exists) {
          console.error(`Student not found: ${membershipData.studentId}`);
          continue;
        }
        
        const studentData = studentDoc.data();
        
        if (!studentData.email) {
          console.error(`No email for student: ${membershipData.studentId}`);
          continue;
        }
        
        // Send expiring soon email
        try {
          const sendExpiringSoonEmail = httpsCallable(getFunctions(), 'sendMembershipExpiringSoonEmail');
          
          await sendExpiringSoonEmail({
            studentEmail: studentData.email,
            studentName: membershipData.studentName,
            firstName: studentData.firstName || membershipData.studentName.split(' ')[0],
            membershipType: membershipData.typeName,
            expiryDate: membershipData.currentPeriodEnd.toDate().toISOString(),
            daysUntilExpiry: 3
          });
          
          console.log(`Expiring soon email sent to ${studentData.email}`);
          
          expiringList.push({
            studentId: membershipData.studentId,
            studentName: membershipData.studentName,
            membershipType: membershipData.typeName,
            expiryDate: membershipData.currentPeriodEnd.toDate().toLocaleDateString('en-NZ')
          });
        } catch (emailError) {
          console.error(`Error sending expiring soon email for ${membershipId}:`, emailError);
          // Don't fail the entire job if one email fails
        }
      } catch (error) {
        console.error(`Error processing expiring membership ${membershipId}:`, error);
      }
    }
    
    console.log(`Expiring soon check complete: ${expiringList.length} emails sent`);
    
    // TODO: Phase 9.7 - Send admin email with expired memberships
    // if (expiredList.length > 0) {
    //   await sendMembershipExpiredAdminAlert(expiredList);
    // }
    
    return {
      success: true,
      activatedCount: activatedList.length,
      activatedMemberships: activatedList,
      expiredCount: expiredList.length,
      expiredMemberships: expiredList,
      expiringCount: expiringList.length,
      expiringMemberships: expiringList
    };
    
  } catch (error) {
    console.error('Error in checkExpiredMemberships:', error);
    throw error;
  }
});
