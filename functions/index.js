/**
 * Urban Swing - Spotify Token Exchange Functions
 * Securely exchanges Spotify authorization codes for access tokens
 */

const {onCall} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const axios = require("axios");
const nodemailer = require("nodemailer");

// Load environment variables
require('dotenv').config();

// Import email templates
const { generateAdminNotificationEmail, generateWelcomeEmail } = require('./emails/new-student-emails');
const { generateAccountSetupEmail } = require('./emails/account-setup-email');
const { generateErrorNotificationEmail } = require('./emails/error-notification-email');

// Import Stripe payment functions
const { createStudentWithPayment } = require('./create-student-payment');
const { getAvailablePackages } = require('./get-available-packages');

// Define secrets for email configuration
const emailPassword = defineSecret("EMAIL_APP_PASSWORD");

// Initialize Firebase Admin
admin.initializeApp();

// Get Firestore with explicit settings
const getFirestore = () => {
  return admin.firestore();
};

// Set global options
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

/**
 * Exchange Spotify authorization code for access and refresh tokens
 */
exports.exchangeSpotifyToken = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to exchangeSpotifyToken");
    throw new Error("Authentication required");
  }

  const {code, redirectUri} = request.data;

  if (!code) {
    logger.error("Missing authorization code");
    throw new Error("Authorization code required");
  }

  logger.info("Exchanging Spotify token for user:", request.auth.uid);

  try {
    // Get Spotify credentials from environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("Spotify credentials not configured");
      throw new Error("Spotify credentials not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post("https://accounts.spotify.com/api/token", 
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
      }
    );

    const tokens = tokenResponse.data;

    // Store refresh token in Firestore
    await admin.firestore()
        .collection("admin_tokens")
        .doc(request.auth.uid)
        .set({
          refreshToken: tokens.refresh_token,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

    logger.info("Successfully exchanged and stored Spotify tokens for user:", request.auth.uid);

    // Return access token (short-lived) to client
    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    };
  } catch (error) {
    logger.error("Error exchanging Spotify token:", error);
    throw new Error(`Token exchange failed: ${error.message}`);
  }
});

/**
 * Refresh Spotify access token using refresh token
 */
exports.refreshSpotifyToken = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to refreshSpotifyToken");
    throw new Error("Authentication required");
  }

  const {refreshToken} = request.data;

  if (!refreshToken) {
    logger.error("Missing refresh token");
    throw new Error("Refresh token required");
  }

  logger.info("Refreshing Spotify token for user:", request.auth.uid);

  try {
    // Get Spotify credentials from environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("Spotify credentials not configured");
      throw new Error("Spotify credentials not configured");
    }

    // Refresh the access token
    const tokenResponse = await axios.post("https://accounts.spotify.com/api/token", 
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
      }
    );

    const tokens = tokenResponse.data;

    logger.info("Successfully refreshed Spotify token");

    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    };
  } catch (error) {
    logger.error("Error refreshing Spotify token:", error);
    throw new Error(`Token refresh failed: ${error.message}`);
  }
});

/**
 * Send email notification when a new student registers
 * Triggers on new document creation in the 'students' collection
 */
exports.sendNewStudentEmail = onDocumentCreated(
  {
    document: "students/{studentId}",
    secrets: [emailPassword],
  },
  async (event) => {
    const student = event.data.data();
    const studentId = event.params.studentId;

    logger.info("New student registered:", studentId);

    try {
      // Fetch casual rates from Firestore
      logger.info('Fetching casual rates from Firestore...');
      logger.info('Project ID:', process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'unknown');
      
      const db = getFirestore();
      logger.info('Firestore instance obtained');
      
      const casualRatesSnapshot = await db.collection('casualRates').get();
      
      logger.info(`Found ${casualRatesSnapshot.size} total casual rates`);
      
      let casualRate = null;
      let studentRate = null;
      
      casualRatesSnapshot.forEach(doc => {
        const rate = doc.data();
        // Only process active, non-promo rates
        if (rate.isActive && !rate.isPromo) {
          logger.info(`Processing rate: ${rate.name} - $${rate.price}`);
          if (rate.name && rate.name.toLowerCase().includes('student')) {
            studentRate = rate.price;
          } else if (rate.name) {
            casualRate = rate.price;
          }
        }
      });
      
      if (casualRate === null) {
        throw new Error('Casual rate not found in Firestore. Please check Admin Tools > Concession Types Manager and ensure "Casual Entry" is active.');
      }
      if (studentRate === null) {
        throw new Error('Student rate not found in Firestore. Please check Admin Tools > Concession Types Manager and ensure "Student Casual Entry" is active.');
      }
      
      logger.info(`Using casual rates: standard=$${casualRate}, student=$${studentRate}`);
      
      // Fetch concession packages from Firestore - fetch all then filter in code
      logger.info('Fetching concession packages from Firestore...');
      const concessionPackagesSnapshot = await admin.firestore()
        .collection('concessionPackages')
        .get();
      
      logger.info(`Found ${concessionPackagesSnapshot.size} total concession packages`);
      
      let fiveClassPrice = null;
      let tenClassPrice = null;
      
      concessionPackagesSnapshot.forEach(doc => {
        const pkg = doc.data();
        // Only process active packages
        if (pkg.isActive) {
          logger.info(`Processing package: ${pkg.numberOfClasses} classes - $${pkg.price}`);
          if (pkg.numberOfClasses === 5) {
            fiveClassPrice = pkg.price;
          } else if (pkg.numberOfClasses === 10) {
            tenClassPrice = pkg.price;
          }
        }
      });
      
      if (fiveClassPrice === null) {
        throw new Error('5-class concession package not found in Firestore. Please check Admin Tools > Concession Types Manager and ensure the 5-class package is active.');
      }
      if (tenClassPrice === null) {
        throw new Error('10-class concession package not found in Firestore. Please check Admin Tools > Concession Types Manager and ensure the 10-class package is active.');
      }
      
      logger.info(`Using concession prices: 5-class=$${fiveClassPrice}, 10-class=$${tenClassPrice}`);
      
      // Create email transporter
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "dance@urbanswing.co.nz",
          pass: emailPassword.value(),
        },
      });

      // Format the registration date
      const registeredAt = student.registeredAt 
        ? new Date(student.registeredAt.seconds * 1000).toLocaleString('en-NZ', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Pacific/Auckland'
          })
        : 'N/A';

      // Check if user document exists (to determine if they have portal access)
      // Query by studentId field since document ID is authUid
      const userSnapshot = await db.collection('users')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      const hasUserAccount = !userSnapshot.empty;
      logger.info(`User account exists for student ${studentId}: ${hasUserAccount}`);

      // Generate email content using templates
      const adminEmail = generateAdminNotificationEmail(student, studentId, registeredAt);
      const welcomeEmail = generateWelcomeEmail(student, casualRate, studentRate, fiveClassPrice, tenClassPrice, hasUserAccount);

      // Send admin notification email
      try {
        await transporter.sendMail({
          from: '"Urban Swing" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: `New Student Registration: ${student.firstName} ${student.lastName}`,
          text: adminEmail.text,
          html: adminEmail.html,
        });

        logger.info("Admin notification sent for student:", studentId);
      } catch (emailError) {
        logger.error("Failed to send admin notification email:", emailError);
        // Continue to attempt welcome email even if admin notification fails
      }

      // Send welcome email to student
      await transporter.sendMail({
        from: '"Urban Swing" <dance@urbanswing.co.nz>',
        to: student.email,
        subject: "Welcome to Urban Swing! 🎉",
        text: welcomeEmail.text,
        html: welcomeEmail.html,
      });

      logger.info("Welcome email sent to student:", student.email);
      
      return null;
    } catch (error) {
      logger.error("Error sending student registration email:", error);
      
      // Send error notification email to admin
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: "dance@urbanswing.co.nz",
            pass: emailPassword.value(),
          },
        });
        
        const errorEmail = generateErrorNotificationEmail(student, studentId, error);
        
        await transporter.sendMail({
          from: '"Urban Swing System" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: "⚠️ ERROR: Failed to send student welcome email",
          text: errorEmail.text,
          html: errorEmail.html,
        });
        
        logger.info("Error notification email sent to admin");
      } catch (emailError) {
        logger.error("Failed to send error notification email:", emailError);
      }
      
      // Don't throw - we don't want to fail the registration if email fails
      return null;
    }
  }
);

/**
 * Send account setup confirmation email when a user creates their portal account
 * Triggers on new document creation in the 'users' collection
 * This handles existing students who are setting up their portal account
 */
exports.sendAccountSetupEmail = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [emailPassword],
  },
  async (event) => {
    const user = event.data.data();
    const userId = event.params.userId;

    logger.info("User account created:", userId);

    try {
      // Check if this is a new student or existing student
      const db = getFirestore();
      const studentDoc = await db.collection('students').doc(user.studentId).get();
      
      if (!studentDoc.exists) {
        logger.error("Student document not found for user:", userId);
        return null;
      }
      
      const student = studentDoc.data();
      
      // Check if student document was just created (within last 5 minutes)
      // If so, the sendNewStudentEmail function will handle the emails
      const studentCreatedAt = student.createdAt?.toDate() || new Date(student.registeredAt);
      const now = new Date();
      const timeDiff = (now - studentCreatedAt) / 1000 / 60; // difference in minutes
      
      if (timeDiff < 5) {
        logger.info("Student was just created, skipping account setup email (will be sent by sendNewStudentEmail)");
        return null;
      }
      
      // This is an existing student setting up their account - send account setup confirmation
      logger.info("Existing student setting up portal account:", user.studentId);
      
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "dance@urbanswing.co.nz",
          pass: emailPassword.value(),
        },
      });
      
      const setupDate = new Date().toLocaleString('en-NZ', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Generate account setup email using template
      const accountSetupEmail = generateAccountSetupEmail(student, user, setupDate);
      
      // Send account setup confirmation email to student
      await transporter.sendMail({
        from: '"Urban Swing" <dance@urbanswing.co.nz>',
        to: user.email,
        subject: "Your Urban Swing Portal Account is Ready! 🎉",
        text: accountSetupEmail.text,
        html: accountSetupEmail.html,
      });

      logger.info("Account setup confirmation email sent to:", user.email);
      
      return null;
    } catch (error) {
      logger.error("Error sending account setup email:", error);
      
      // Send error notification email to admin
      try {
        const errorTransporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: "dance@urbanswing.co.nz",
            pass: emailPassword.value(),
          },
        });
        
        // Fetch student data for error email
        const db = getFirestore();
        const studentDoc = await db.collection('students').doc(user.studentId).get();
        const student = studentDoc.exists ? studentDoc.data() : { firstName: 'Unknown', lastName: 'Unknown', email: user.email };
        
        const errorEmail = generateErrorNotificationEmail(student, user.studentId, error);
        
        await errorTransporter.sendMail({
          from: '"Urban Swing System" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: "⚠️ ERROR: Failed to send account setup email",
          text: errorEmail.text,
          html: errorEmail.html,
        });
        
        logger.info("Error notification email sent to admin");
      } catch (emailError) {
        logger.error("Failed to send error notification email:", emailError);
      }
      
      // Don't throw - we don't want to fail the account creation if email fails
      return null;
    }
  }
);

/**
 * Export all Firebase Authentication users
 * Returns list of all auth users with their UIDs and profile data
 * Requires admin authentication
 */
exports.exportAuthUsers = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to exportAuthUsers");
    throw new Error("Authentication required");
  }

  logger.info("Exporting auth users for admin:", request.auth.uid);

  try {
    // Verify the requesting user is an admin
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!userDoc.exists) {
      logger.error("User document not found:", request.auth.uid);
      throw new Error("User not authorized");
    }

    const userData = userDoc.data();
    if (!userData.isAdmin) {
      logger.error("Non-admin user attempted to export auth users:", request.auth.uid);
      throw new Error("Admin privileges required");
    }

    // List all auth users
    const listUsersResult = await admin.auth().listUsers();
    const authUsers = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
      providerData: userRecord.providerData,
    }));

    logger.info(`Exported ${authUsers.length} auth users`);

    return {
      users: authUsers,
      count: authUsers.length,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error exporting auth users:", error);
    throw new Error(`Auth export failed: ${error.message}`);
  }
});

// Export Stripe payment functions
exports.createStudentWithPayment = createStudentWithPayment;
exports.getAvailablePackages = getAvailablePackages;
