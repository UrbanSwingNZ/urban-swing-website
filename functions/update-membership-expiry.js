/**
 * Cloud Function: updateMembershipExpiry
 * Updates the expiry date of a membership
 * Updates both the membership document (currentPeriodEnd) and
 * student document (membershipExpiryDate)
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Update membership expiry date
 * Callable function - Admin only
 *
 * @param {Object} data - Request data
 * @param {string} data.membershipId - Membership document ID
 * @param {string} data.newExpiryDate - New expiry date (ISO 8601 format)
 * @param {string} [data.reason] - Optional reason for update (audit trail)
 * @returns {Object} Success status and updated expiry date
 */
exports.updateMembershipExpiry = onCall(
    {
      region: "us-central1",
      cors: true,
      invoker: "public",
    },
    async (request) => {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
      }

      // Check admin permissions
      const adminUid = request.auth.uid;
      const adminDoc = await admin.firestore()
          .collection("users")
          .doc(adminUid)
          .get();

      if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new HttpsError(
            "permission-denied",
            "User must be an admin",
        );
      }

      const {membershipId, newExpiryDate, reason} = request.data;

      // Validate inputs
      if (!membershipId) {
        throw new HttpsError(
            "invalid-argument",
            "membershipId is required",
        );
      }

      if (!newExpiryDate) {
        throw new HttpsError(
            "invalid-argument",
            "newExpiryDate is required",
        );
      }

      // Parse and validate the new expiry date
      // Expect YYYY-MM-DD format and treat as local date
      let expiryDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(newExpiryDate)) {
        const [year, month, day] = newExpiryDate.split("-").map(Number);
        expiryDate = new Date(year, month - 1, day);
      } else {
        expiryDate = new Date(newExpiryDate);
      }

      if (isNaN(expiryDate.getTime())) {
        throw new HttpsError(
            "invalid-argument",
            "Invalid date format for newExpiryDate",
        );
      }

      // Don't allow dates in the past (before today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        throw new HttpsError(
            "invalid-argument",
            "Expiry date cannot be in the past",
        );
      }

      try {
      // Get the membership document
        const membershipRef = admin.firestore()
            .collection("memberships")
            .doc(membershipId);
        const membershipDoc = await membershipRef.get();

        if (!membershipDoc.exists) {
          throw new HttpsError("not-found", "Membership not found");
        }

        const membershipData = membershipDoc.data();
        const studentId = membershipData.studentId;

        if (!studentId) {
          throw new HttpsError(
              "failed-precondition",
              "Membership has no associated student",
          );
        }

        // Get the student document
        const studentRef = admin.firestore()
            .collection("students")
            .doc(studentId);
        const studentDoc = await studentRef.get();

        if (!studentDoc.exists) {
          throw new HttpsError("not-found", "Student not found");
        }

        const studentData = studentDoc.data();

        // Check if this is the student's active membership
        if (studentData.activeMembershipId !== membershipId) {
          throw new HttpsError(
              "failed-precondition",
              "Can only update expiry date for active memberships",
          );
        }

        // Store date at noon UTC to avoid timezone issues
        // This ensures the date portion is correct in all timezones (±12 hours)
        const dateAtNoonUTC = new Date(Date.UTC(
            expiryDate.getFullYear(),
            expiryDate.getMonth(),
            expiryDate.getDate(),
            12, 0, 0, 0,
        ));
        const expiryTimestamp =
          admin.firestore.Timestamp.fromDate(dateAtNoonUTC);

        // Prepare audit data (cannot use serverTimestamp in arrays)
        const now = admin.firestore.Timestamp.now();
        const auditData = {
          updatedAt: now,
          updatedBy: request.auth.uid,
          previousExpiryDate: membershipData.currentPeriodEnd,
          newExpiryDate: expiryTimestamp,
        };

        if (reason) {
          auditData.updateReason = reason;
        }

        // Update membership document
        await membershipRef.update({
          currentPeriodEnd: expiryTimestamp,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          expiryUpdateHistory:
            admin.firestore.FieldValue.arrayUnion(auditData),
        });

        // Update student document (denormalized field)
        await studentRef.update({
          membershipExpiryDate: expiryTimestamp,
        });

        // Log the update
        const reasonText = reason || "Not provided";
        console.log(
            `Membership expiry updated - Membership: ${membershipId}, ` +
          `Student: ${studentId}, New Expiry: ${dateAtNoonUTC.toISOString()}, ` +
          `Reason: ${reasonText}`,
        );

        return {
          success: true,
          membershipId: membershipId,
          studentId: studentId,
          newExpiryDate: dateAtNoonUTC.toISOString(),
          message: "Membership expiry date updated successfully",
        };
      } catch (error) {
        console.error("Error updating membership expiry:", error);

        // Re-throw HttpsErrors as-is
        if (error instanceof HttpsError) {
          throw error;
        }

        throw new HttpsError(
            "internal",
            `Failed to update membership expiry: ${error.message}`,
        );
      }
    },
);
