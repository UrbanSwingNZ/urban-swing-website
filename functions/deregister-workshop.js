/**
 * deregister-workshop.js
 * Firebase Cloud Function for cancelling a student's workshop registration
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

/**
 * Deregister a student from a workshop
 * HTTP Function with CORS support
 *
 * Expected body:
 * {
 *   studentId: string,
 *   workshopId: string
 * }
 */
exports.deregisterWorkshop = onRequest(
  {
    region: 'us-central1',
    invoker: 'public'
  },
  async (request, response) => {
    return cors(request, response, async () => {
      try {
        if (request.method !== 'POST') {
          response.status(405).json({ error: 'Method not allowed' });
          return;
        }

        const { studentId, workshopId } = request.body;

        if (!studentId) {
          response.status(400).json({ error: 'Missing student ID' });
          return;
        }

        if (!workshopId) {
          response.status(400).json({ error: 'Missing workshop ID' });
          return;
        }

        // Verify the caller is authenticated as either:
        // 1. The student themselves (Authorization header with their Firebase ID token)
        // 2. An admin (checked via their user document role)
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          response.status(401).json({ error: 'Unauthorised' });
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (err) {
          response.status(401).json({ error: 'Invalid or expired token' });
          return;
        }

        const db = admin.firestore();

        // Authorisation: caller must be the student themselves OR an admin/front-desk
        const callerUid = decodedToken.uid;
        const callerUserDoc = await db.collection('users').doc(callerUid).get();
        const callerRole = callerUserDoc.exists ? callerUserDoc.data().role : null;
        const isAdmin = callerRole === 'admin' || callerRole === 'front-desk';

        // If not an admin, confirm the caller owns the studentId
        if (!isAdmin) {
          const callerStudentId = callerUserDoc.exists ? callerUserDoc.data().studentId : null;
          if (callerStudentId !== studentId) {
            response.status(403).json({ error: 'Forbidden: cannot de-register another student' });
            return;
          }
        }

        // Fetch the workshop
        const workshopRef = db.collection('workshops').doc(workshopId);
        const workshopSnap = await workshopRef.get();

        if (!workshopSnap.exists) {
          response.status(404).json({ error: 'Workshop not found' });
          return;
        }

        const workshopData = workshopSnap.data();

        // Confirm the student is actually registered
        const registeredStudents = workshopData.registeredStudents || [];
        const isRegistered = registeredStudents.some(r => r.studentId === studentId);

        if (!isRegistered) {
          response.status(409).json({ error: 'Student is not registered for this workshop' });
          return;
        }

        // Prevent de-registering if already checked in
        const checkedInStudents = workshopData.checkedInStudents || [];
        if (checkedInStudents.includes(studentId)) {
          response.status(409).json({ error: 'Cannot de-register: student has already been checked in' });
          return;
        }

        // Remove student from registeredStudents (filter out by studentId)
        const updatedRegisteredStudents = registeredStudents.filter(
          r => r.studentId !== studentId
        );

        await workshopRef.update({ registeredStudents: updatedRegisteredStudents });

        response.status(200).json({ success: true });

      } catch (error) {
        console.error('De-register workshop error:', error);
        response.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });
  }
);
