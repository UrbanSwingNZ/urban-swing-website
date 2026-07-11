/**
 * admin-assign-membership.js
 *
 * Cloud Functions for admin to manually assign memberships to students
 * Supports cash, bank transfer, EFTPOS, and online payments
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {getStripeConfig} = require("./stripe/stripe-config");

/**
 * Admin-only function to assign membership to a student
 * Supports in-person payments (cash, bank transfer, EFTPOS) and online
 */
exports.adminAssignMembership = onCall(
    {
      region: "us-central1",
    },
    async (request) => {
    // Check authentication (v2 API uses request.auth)
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
      }

      // Check admin permissions
      const adminUid = request.auth.uid;
      const adminDoc = await admin.firestore().collection("users").doc(adminUid).get();

      if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new HttpsError("permission-denied", "User must be an admin");
      }

      // Get data from request (v2 API uses request.data)
      const {studentId, membershipTypeId, paymentMethod, startDate, isRecurring, notes} = request.data;

      // Validate required fields
      if (!studentId || !membershipTypeId || !paymentMethod) {
        throw new HttpsError("invalid-argument", "Missing required fields: studentId, membershipTypeId, paymentMethod");
      }

      // Validate payment method
      const validPaymentMethods = ["cash", "bank-transfer", "eftpos", "online", "comp"];
      if (!validPaymentMethods.includes(paymentMethod)) {
        throw new HttpsError("invalid-argument", `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`);
      }

      // Force isRecurring to false for non-online payments
      const actualIsRecurring = paymentMethod === "online" ? (isRecurring || false) : false;

      try {
        const db = admin.firestore();

        // Get student document
        const studentDoc = await db.collection("students").doc(studentId).get();
        if (!studentDoc.exists) {
          throw new HttpsError("not-found", "Student not found");
        }
        const studentData = studentDoc.data();

        // Warn if student is not an improver (don't block, just log)
        if (studentData.improver !== true) {
          console.warn(`Admin assigning membership to non-improver student: ${studentId}`);
        }

        // Get membership type
        const membershipTypeDoc = await db.collection("membershipTypes").doc(membershipTypeId).get();
        if (!membershipTypeDoc.exists) {
          throw new HttpsError("not-found", "Membership type not found");
        }
        const membershipType = membershipTypeDoc.data();

        if (membershipType.isActive === false) {
          throw new HttpsError("failed-precondition", "This membership type is not active");
        }

        // Calculate dates
        const now = new Date();
        const purchaseDate = startDate ? new Date(startDate) : now;

        // Calculate expiry date (valid until the day before the 1-month anniversary)
        // e.g., purchased June 8 → expires end of July 7 (31 days, not 32)
        const expiryDate = new Date(purchaseDate);
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        expiryDate.setDate(expiryDate.getDate() - 1); // Subtract 1 day

        // Adjust to last day of month if day doesn't exist (e.g., Jan 31 → Feb 28)
        if (expiryDate.getDate() < purchaseDate.getDate() - 1) {
          expiryDate.setDate(0); // Go to last day of previous month
        }

        // Set to end of day (valid through 23:59:59.999)
        expiryDate.setHours(23, 59, 59, 999);

        // Check for existing active membership
        if (studentData.activeMembershipId) {
          const existingMembershipDoc = await db.collection("memberships").doc(studentData.activeMembershipId).get();
          if (existingMembershipDoc.exists) {
            const existingMembership = existingMembershipDoc.data();
            if (existingMembership.status === "active") {
              console.warn(`Student ${studentId} already has active membership. Replacing with new membership.`);

              // Cancel existing membership
              await db.collection("memberships").doc(studentData.activeMembershipId).update({
                status: "cancelled",
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancelledBy: adminUid,
                cancelReason: "Replaced by admin-assigned membership",
              });
            }
          }
        }

        // Create membership document
        const membershipId = `${studentId}-membership-${Date.now()}`;
        const membershipData = {
          studentId: studentId,
          studentName: `${studentData.firstName} ${studentData.lastName}`,
          typeId: membershipTypeId,
          typeName: membershipType.name,
          price: membershipType.price,
          status: "active",
          isRecurring: actualIsRecurring,
          purchaseDate: admin.firestore.Timestamp.fromDate(purchaseDate),
          currentPeriodStart: admin.firestore.Timestamp.fromDate(purchaseDate),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
          paymentMethod: paymentMethod,
          stripeSubscriptionId: null, // Admin-assigned memberships don't have Stripe subscriptions
          stripeCustomerId: studentData.stripeCustomerId || null,
          transactionId: null, // Will be set after transaction is created
          assignedByAdmin: true,
          assignedBy: adminUid,
          adminNotes: notes || null,
          cancelledAt: null,
          cancelledBy: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("memberships").doc(membershipId).set(membershipData);

        // Update student document
        await db.collection("students").doc(studentId).update({
          activeMembershipId: membershipId,
          membershipStatus: "active",
          membershipExpiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
        });

        // Create transaction record (unless comp)
        let transactionId = null;
        if (paymentMethod !== "comp") {
          // Generate transaction ID: firstname-lastname-membership-timestamp
          const timestamp = Date.now();
          const firstNameClean = studentData.firstName.toLowerCase()
              .replace(/[^a-z0-9]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "");

          const lastNameClean = studentData.lastName.toLowerCase()
              .replace(/[^a-z0-9]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "");

          transactionId = `${firstNameClean}-${lastNameClean}-membership-${timestamp}`;

          const transactionData = {
            studentId: studentId,
            studentName: `${studentData.firstName} ${studentData.lastName}`,
            type: "membership-purchase",
            amount: membershipType.price,
            paymentMethod: paymentMethod,
            status: "completed",
            description: `${membershipType.name} (Admin Assigned)`,
            membershipId: membershipId,
            membershipTypeId: membershipTypeId,
            transactionDate: admin.firestore.Timestamp.fromDate(purchaseDate),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: adminUid,
            adminAssigned: true,
          };

          await db.collection("transactions").doc(transactionId).set(transactionData);

          // Update membership with transaction ID
          await db.collection("memberships").doc(membershipId).update({
            transactionId: transactionId,
          });
        }

        console.log(`Admin ${adminUid} assigned membership ${membershipId} to student ${studentId}`);

        return {
          success: true,
          membershipId: membershipId,
          transactionId: transactionId,
          expiryDate: expiryDate.toISOString(),
          message: `Membership assigned successfully. Valid until ${expiryDate.toLocaleDateString("en-NZ", {year: "numeric", month: "long", day: "numeric", timeZone: "Pacific/Auckland"})}`,
        };
      } catch (error) {
        console.error("Error assigning membership:", error);

        if (error instanceof HttpsError) {
          throw error;
        }

        throw new HttpsError("internal", `Failed to assign membership: ${error.message}`);
      }
    });
