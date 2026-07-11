/**
 * membership-management.js
 * Firebase Callable Functions for managing memberships
 * Handles auto-renew toggle and membership cancellation
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {stripe} = require("./stripe/stripe-config");
const cors = require("cors")({origin: true});

/**
 * Toggle auto-renew for a recurring membership
 * HTTP Function with CORS support
 *
 * Expected data structure:
 * {
 *   membershipId: string,
 *   enabled: boolean (true to turn on auto-renew, false to turn off)
 * }
 */
exports.toggleMembershipAutoRenew = onRequest(
    {
      region: "us-central1",
      invoker: "public", // Allow unauthenticated calls from student portal
      secrets: ["STRIPE_SECRET_KEY"],
    },
    async (request, response) => {
    // Handle CORS
      return cors(request, response, async () => {
        try {
        // Only accept POST requests
          if (request.method !== "POST") {
            response.status(405).json({error: "Method not allowed"});
            return;
          }

          const data = request.body;

          // Validate required fields
          if (!data.membershipId) {
            response.status(400).json({error: "Missing membership ID"});
            return;
          }

          if (typeof data.enabled !== "boolean") {
            response.status(400).json({error: "Missing or invalid enabled flag (must be boolean)"});
            return;
          }

          const db = admin.firestore();

          // Step 1: Get membership document
          const membershipDoc = await db.collection("memberships").doc(data.membershipId).get();

          if (!membershipDoc.exists) {
            response.status(404).json({error: "Membership not found"});
            return;
          }

          const membershipData = membershipDoc.data();

          // Validate membership is recurring
          if (!membershipData.isRecurring || !membershipData.stripeSubscriptionId) {
            response.status(400).json({error: "This membership does not have auto-renew (one-time purchase)"});
            return;
          }

          // Validate membership is active
          if (membershipData.status !== "active") {
            response.status(400).json({error: "Cannot modify auto-renew for expired or cancelled membership"});
            return;
          }

          // Step 2: Update Stripe subscription
          try {
            await stripe.subscriptions.update(
                membershipData.stripeSubscriptionId,
                {
                  cancel_at_period_end: !data.enabled, // If enabling auto-renew, set to false; if disabling, set to true
                },
            );

            console.log(`Stripe subscription ${membershipData.stripeSubscriptionId} updated: cancel_at_period_end=${!data.enabled}`);
          } catch (error) {
            console.error("Error updating Stripe subscription:", error);
            response.status(500).json({error: "Failed to update subscription: " + error.message});
            return;
          }

          // Step 3: Update membership document
          const updateData = {
            autoRenew: data.enabled, // Update the autoRenew field
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (!data.enabled) {
          // Disabling auto-renew: Mark when it will expire
            updateData.willExpireAt = membershipData.currentPeriodEnd;
          // Status remains 'active' - membership continues through current period
          } else {
          // Enabling auto-renew: Remove expiry marker
            updateData.willExpireAt = admin.firestore.FieldValue.delete();
            // Remove any cancellation info if present
            if (membershipData.cancelledAt) {
              updateData.cancelledAt = null;
              updateData.cancelledBy = null;
            }
          }

          await db.collection("memberships").doc(data.membershipId).update(updateData);

          // Step 4: Get updated membership data
          const updatedMembershipDoc = await db.collection("memberships").doc(data.membershipId).get();
          const updatedMembership = updatedMembershipDoc.data();

          // Step 5: Return success
          const message = data.enabled ?
          "Auto-renew enabled. Your membership will automatically renew at the end of the current period." :
          "Auto-renew disabled. Your membership will remain active until " +
            membershipData.currentPeriodEnd.toDate().toLocaleDateString("en-NZ", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "Pacific/Auckland",
            });

          response.status(200).json({
            success: true,
            membership: {
              id: data.membershipId,
              status: updatedMembership.status,
              isRecurring: updatedMembership.isRecurring,
              currentPeriodEnd: updatedMembership.currentPeriodEnd.toDate().toISOString(),
              willExpireAt: updatedMembership.willExpireAt ? updatedMembership.willExpireAt.toDate().toISOString() : null,
              autoRenewEnabled: data.enabled,
            },
            message: message,
          });
        } catch (error) {
          console.error("Error in toggleMembershipAutoRenew:", error);
          response.status(500).json({
            error: error.message || "An error occurred toggling auto-renew",
          });
        }
      });
    },
);

/**
 * Cancel a membership
 * HTTP Function with CORS support
 *
 * For recurring memberships: Cancels Stripe subscription at period end
 * For one-time memberships: Marks as cancelled immediately (no refund)
 *
 * Expected data structure:
 * {
 *   membershipId: string,
 *   cancelledBy: string (e.g., "student", "admin", or user ID)
 * }
 */
exports.cancelMembership = onRequest(
    {
      region: "us-central1",
      invoker: "public", // Allow unauthenticated calls from student portal
      secrets: ["STRIPE_SECRET_KEY"],
    },
    async (request, response) => {
    // Handle CORS
      return cors(request, response, async () => {
        try {
        // Only accept POST requests
          if (request.method !== "POST") {
            response.status(405).json({error: "Method not allowed"});
            return;
          }

          const data = request.body;

          // Validate required fields
          if (!data.membershipId) {
            response.status(400).json({error: "Missing membership ID"});
            return;
          }

          if (!data.cancelledBy) {
            response.status(400).json({error: "Missing cancelledBy field"});
            return;
          }

          const db = admin.firestore();

          // Step 1: Get membership document
          const membershipDoc = await db.collection("memberships").doc(data.membershipId).get();

          if (!membershipDoc.exists) {
            response.status(404).json({error: "Membership not found"});
            return;
          }

          const membershipData = membershipDoc.data();

          // Validate membership is active
          if (membershipData.status === "cancelled" || membershipData.status === "expired") {
            response.status(400).json({error: "Membership is already cancelled or expired"});
            return;
          }

          // Step 2: Handle recurring membership (cancel Stripe subscription)
          if (membershipData.isRecurring && membershipData.stripeSubscriptionId) {
            try {
              await stripe.subscriptions.update(
                  membershipData.stripeSubscriptionId,
                  {
                    cancel_at_period_end: true,
                  },
              );

              console.log(`Stripe subscription ${membershipData.stripeSubscriptionId} set to cancel at period end`);
            } catch (error) {
              console.error("Error cancelling Stripe subscription:", error);
              response.status(500).json({error: "Failed to cancel subscription: " + error.message});
              return;
            }
          }

          // Step 3: Update membership document
          // Note: Status remains 'active' until period ends - student keeps access
          await db.collection("memberships").doc(data.membershipId).update({
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: data.cancelledBy,
            willExpireAt: membershipData.currentPeriodEnd, // Will expire at end of current period
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Step 4: Create transaction record for audit trail
          const timestamp = Date.now();
          const transactionId = `${membershipData.studentId}-membership-cancel-${timestamp}`;

          const transactionData = {
            studentId: membershipData.studentId,
            transactionDate: admin.firestore.FieldValue.serverTimestamp(),
            type: "membership-cancellation",
            membershipId: data.membershipId,
            membershipTypeId: membershipData.typeId,
            membershipTypeName: membershipData.typeName,
            cancelledBy: data.cancelledBy,
            expiresAt: membershipData.currentPeriodEnd,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: data.cancelledBy,
          };

          await db.collection("transactions").doc(transactionId).set(transactionData);
          console.log("Cancellation transaction created:", transactionId);

          // Step 5: Return success
          const expiryDate = membershipData.currentPeriodEnd.toDate();
          const message = membershipData.isRecurring ?
          `Membership cancelled. You will have access until ${expiryDate.toLocaleDateString("en-NZ", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Pacific/Auckland",
          })}. Your subscription will not renew.` :
          `Membership cancellation recorded. You will have access until ${expiryDate.toLocaleDateString("en-NZ", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Pacific/Auckland",
          })}.`;

          response.status(200).json({
            success: true,
            transactionId: transactionId,
            expiresAt: expiryDate.toISOString(),
            message: message,
          });
        } catch (error) {
          console.error("Error in cancelMembership:", error);
          response.status(500).json({
            error: error.message || "An error occurred cancelling membership",
          });
        }
      });
    },
);

/**
 * Update payment method for a recurring membership
 * HTTP Function with CORS support
 *
 * Expected data structure:
 * {
 *   membershipId: string,
 *   paymentMethodId: string (Stripe payment method ID from client)
 * }
 */
exports.updateMembershipPaymentMethod = onRequest(
    {
      region: "us-central1",
      invoker: "public", // Allow unauthenticated calls from student portal
      secrets: ["STRIPE_SECRET_KEY"],
    },
    async (request, response) => {
    // Handle CORS
      return cors(request, response, async () => {
        try {
          console.log("updateMembershipPaymentMethod called");
          console.log("Stripe key exists:", !!process.env.STRIPE_SECRET_KEY);
          console.log("Stripe key prefix:", process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) : "undefined");

          // Test Stripe connection with a simple API call
          try {
            const balance = await stripe.balance.retrieve();
            console.log("Stripe connection test successful, balance retrieved");
          } catch (stripeTestError) {
            console.error("Stripe connection test failed:", {
              message: stripeTestError.message,
              type: stripeTestError.type,
              code: stripeTestError.code,
            });
          }

          // Only accept POST requests
          if (request.method !== "POST") {
            response.status(405).json({error: "Method not allowed"});
            return;
          }

          const data = request.body;
          console.log("Request data:", {membershipId: data.membershipId, hasPaymentMethod: !!data.paymentMethodId});

          // Validate required fields
          if (!data.membershipId) {
            response.status(400).json({error: "Missing membership ID"});
            return;
          }

          if (!data.paymentMethodId) {
            response.status(400).json({error: "Missing payment method ID"});
            return;
          }

          const db = admin.firestore();

          // Step 1: Get membership document
          const membershipDoc = await db.collection("memberships").doc(data.membershipId).get();

          if (!membershipDoc.exists) {
            response.status(404).json({error: "Membership not found"});
            return;
          }

          const membershipData = membershipDoc.data();

          // Validate membership is recurring
          if (!membershipData.isRecurring || !membershipData.stripeSubscriptionId) {
            response.status(400).json({error: "This membership does not have recurring payments"});
            return;
          }

          // Validate membership is active
          if (membershipData.status !== "active") {
            response.status(400).json({error: "Cannot update payment method for inactive membership"});
            return;
          }

          // Step 2: Get student document for Stripe customer ID
          const studentDoc = await db.collection("students").doc(membershipData.studentId).get();

          if (!studentDoc.exists) {
            response.status(404).json({error: "Student not found"});
            return;
          }

          const studentData = studentDoc.data();

          let customerId = studentData.stripeCustomerId;

          // Verify the customer exists in Stripe (might be from different mode or deleted)
          if (customerId) {
            console.log("Checking if customer exists in Stripe:", customerId);
            try {
              const existingCustomer = await stripe.customers.retrieve(customerId);
              console.log("Using existing Stripe customer:", customerId);
            } catch (error) {
              console.log("Existing customer ID invalid, will create new. Error:", error.message);
              customerId = null;
            }
          }

          // Create new customer if needed
          if (!customerId) {
            console.log("Creating new Stripe customer for student:", membershipData.studentId);
            console.log("Student data:", {
              firstName: studentData.firstName,
              lastName: studentData.lastName,
              email: studentData.email,
            });

            try {
              console.log("Calling stripe.customers.create...");
              const customer = await stripe.customers.create({
                name: `${studentData.firstName} ${studentData.lastName}`,
                email: studentData.email,
                phone: studentData.phoneNumber || studentData.phone || undefined,
                metadata: {
                  studentId: membershipData.studentId,
                  source: "update-payment-method",
                },
              });
              console.log("Stripe customer created successfully:", customer.id);

              customerId = customer.id;

              // Update student document with new customer ID
              await db.collection("students").doc(membershipData.studentId).update({
                stripeCustomerId: customerId,
              });

              console.log("Student document updated with customer ID");
            } catch (error) {
              console.error("Error creating Stripe customer:", {
                message: error.message,
                type: error.type,
                code: error.code,
                statusCode: error.statusCode,
                raw: error.raw,
              });
              response.status(500).json({error: "Failed to create customer: " + error.message});
              return;
            }
          }

          // Step 3: Attach payment method to customer
          console.log("Attaching payment method to customer...");
          try {
            await stripe.paymentMethods.attach(data.paymentMethodId, {
              customer: customerId,
            });

            console.log(`Payment method ${data.paymentMethodId} attached to customer ${customerId}`);
          } catch (error) {
            console.error("Error attaching payment method:", error);
            response.status(500).json({error: "Failed to attach payment method: " + error.message});
            return;
          }

          // Step 4: Set as default payment method on customer
          try {
            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: data.paymentMethodId,
              },
            });

            console.log(`Default payment method updated for customer ${customerId}`);
          } catch (error) {
            console.error("Error setting default payment method:", error);
            response.status(500).json({error: "Failed to set default payment method: " + error.message});
            return;
          }

          // Step 5: Update subscription to use new payment method
          try {
            await stripe.subscriptions.update(
                membershipData.stripeSubscriptionId,
                {
                  default_payment_method: data.paymentMethodId,
                },
            );

            console.log(`Subscription ${membershipData.stripeSubscriptionId} updated with new payment method`);
          } catch (error) {
            console.error("Error updating subscription payment method:", error);
            response.status(500).json({error: "Failed to update subscription: " + error.message});
            return;
          }

          // Step 6: Get payment method details for card last4
          let cardLast4 = "****";
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(data.paymentMethodId);
            if (paymentMethod.card && paymentMethod.card.last4) {
              cardLast4 = paymentMethod.card.last4;
            }
          } catch (error) {
            console.error("Error retrieving payment method details:", error);
          // Non-fatal - continue with default last4
          }

          // Step 7: Update membership document with new card info
          await db.collection("memberships").doc(data.membershipId).update({
            paymentMethodLast4: cardLast4,
            stripePaymentMethodId: data.paymentMethodId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Step 8: Return success
          response.status(200).json({
            success: true,
            cardLast4: cardLast4,
            message: "Payment method updated successfully",
          });
        } catch (error) {
          console.error("Error in updateMembershipPaymentMethod:", error);
          response.status(500).json({
            error: error.message || "An error occurred updating payment method",
          });
        }
      });
    },
);
