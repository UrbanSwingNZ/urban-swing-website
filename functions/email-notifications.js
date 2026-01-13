/**
 * Email Notifications Cloud Functions
 * Handles automated email sending for student registration and account setup
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const {generateMerchOrderEmail} = require("./emails/merch-order-notification");
const {generateAdminNotificationEmail, generateWelcomeEmail} = require("./emails/new-student-emails");
const {generateAccountSetupEmail} = require("./emails/student-portal-setup-email");
const {generatePortalInvitationEmail} = require("./emails/student-portal-invitation");
const {generateErrorNotificationEmail} = require("./emails/error-notification-email");
const {generateLowBalanceEmail, generateExpiringConcessionsEmail} = require("./emails/concession-notifications");

// Define secrets for email configuration
const emailPassword = defineSecret("EMAIL_APP_PASSWORD");

// Get Firestore with explicit settings
const getFirestore = () => {
  return admin.firestore();
};

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
      
      const db = getFirestore();
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
      
      // Fetch concession packages from Firestore
      logger.info('Fetching concession packages from Firestore...');
      const concessionPackagesSnapshot = await db.collection('concessionPackages').get();
      
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
      const userSnapshot = await db.collection('users')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      const hasUserAccount = !userSnapshot.empty;
      logger.info(`User account exists for student ${studentId}: ${hasUserAccount}`);

      // Fetch transaction data if student made a purchase (to get firstClassDate for casual entries)
      let purchaseData = null;
      if (student.initialPayment) {
        const transactionSnapshot = await db.collection('transactions')
          .where('studentId', '==', studentId)
          .limit(1)
          .get();
        
        if (!transactionSnapshot.empty) {
          const txData = transactionSnapshot.docs[0].data();
          purchaseData = {
            amount: txData.amountPaid, // Use transaction's amountPaid field
            packageType: txData.packageType,
            packageName: txData.packageName,
            firstClassDate: txData.classDate ? txData.classDate.toDate() : null
          };
          logger.info(`Purchase data found for student ${studentId}:`, purchaseData);
        }
      }

      // Generate admin notification email using JavaScript generator
      const adminEmail = generateAdminNotificationEmail(
        student, 
        studentId, 
        registeredAt,
        casualRate,
        studentRate,
        fiveClassPrice,
        tenClassPrice,
        purchaseData
      );
      
      // Generate welcome email using JavaScript generator
      const welcomeEmail = generateWelcomeEmail(
        student,
        casualRate,
        studentRate,
        fiveClassPrice,
        tenClassPrice,
        hasUserAccount
      );

      // Send admin notification email
      try {
        await transporter.sendMail({
          from: '"Urban Swing" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: "New Student Registration",
          text: adminEmail.text,
          html: adminEmail.html,
        });

        logger.info("Admin notification sent for student:", studentId);
      } catch (emailError) {
        logger.error("Failed to send admin notification email:", emailError);
      }

      // Send welcome email to student
      await transporter.sendMail({
        from: '"Urban Swing" <dance@urbanswing.co.nz>',
        to: student.email,
        subject: "Welcome to Urban Swing!",
        text: welcomeEmail.text,
        html: welcomeEmail.html,
      });

      logger.info("Welcome email sent to student:", student.email);
      
      return null;
    } catch (error) {
      logger.error("Error sending student registration email:", error);
      
      // Send error notification email to admin
      try {
        const transporter = nodemailer.createTransporter({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: "dance@urbanswing.co.nz",
            pass: emailPassword.value(),
          },
        });
        
        const errorEmail = generateErrorNotificationEmail(
          student,
          studentId,
          {
            type: 'Failed to send student welcome email',
            message: error.message,
            stack: error.stack || 'No stack trace available'
          }
        );
        
        await transporter.sendMail({
          from: '"Urban Swing System" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: "Email Error Notification",
          text: errorEmail.text,
          html: errorEmail.html,
        });
        
        logger.info("Error notification email sent to admin");
      } catch (emailError) {
        logger.error("Failed to send error notification email:", emailError);
      }
      
      return null;
    }
  }
);

/**
 * Send account setup confirmation email when a user creates their portal account
 * Triggers on new document creation in the 'users' collection
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
      const db = getFirestore();
      const studentDoc = await db.collection('students').doc(user.studentId).get();
      
      if (!studentDoc.exists) {
        logger.error("Student document not found for user:", userId);
        return null;
      }
      
      const student = studentDoc.data();
      
      // Check if student was just created (within last 5 minutes)
      const studentCreatedAt = student.createdAt?.toDate() || new Date(student.registeredAt);
      const now = new Date();
      const timeDiff = (now - studentCreatedAt) / 1000 / 60;
      
      if (timeDiff < 5) {
        logger.info("Student was just created, skipping account setup email");
        return null;
      }
      
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
      
      const accountSetupEmail = generateAccountSetupEmail(student, user, setupDate);
      
      await transporter.sendMail({
        from: '"Urban Swing" <dance@urbanswing.co.nz>',
        to: user.email,
        subject: "Student Portal Account Setup",
        text: accountSetupEmail.text,
        html: accountSetupEmail.html,
      });

      logger.info("Account setup confirmation email sent to:", user.email);
      
      return null;
    } catch (error) {
      logger.error("Error sending account setup email:", error);
      return null;
    }
  }
);

/**
 * Cloud Function: Send Merchandise Order Notification Email
 * Triggers when a new merchandise order is created in the merchOrders collection
 * Sends email to dance@urbanswing.co.nz (admin notification)
 */
exports.sendMerchOrderEmail = onDocumentCreated(
  {
    document: "merchOrders/{orderId}",
    secrets: [emailPassword],
  },
  async (event) => {
    const order = event.data.data();
    const orderId = event.params.orderId;

    logger.info("New merchandise order received:", orderId);

    try {
      // Generate email content using hardcoded template
      const emailContent = generateMerchOrderEmail(order, orderId);
      
      // Send email to admin
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'dance@urbanswing.co.nz',
          pass: emailPassword.value()
        }
      });
      
      await transporter.sendMail({
        from: 'Urban Swing <dance@urbanswing.co.nz>',
        to: 'dance@urbanswing.co.nz',
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
      
      logger.info(`Merchandise order notification email sent for order ${orderId}`);
      
      return {
        success: true,
        emailSent: 'dance@urbanswing.co.nz'
      };
    } catch (error) {
      logger.error('Error sending merchandise order email:', error);
      // Don't throw - we don't want to fail the order creation if email fails
      return {
        success: false,
        error: error.message
      };
    }
  }
);

/**
 * Cloud Function: Send Student Portal Invitation Email
 * Callable function to invite existing students to join the student portal
 * @param {Object} data - Function parameters
 * @param {string} data.studentId - Student ID to send invitation to
 */
exports.sendPortalInvitationEmail = onCall(
  {
    secrets: [emailPassword],
    cors: true,
    invoker: 'public',
  },
  async (request) => {
    const {studentId} = request.data;
    
    logger.info("Portal invitation requested for student:", studentId);

    if (!studentId) {
      logger.error("No student ID provided");
      throw new Error("Student ID is required");
    }

    try {
      const db = getFirestore();
      
      // Get student document
      const studentDoc = await db.collection('students').doc(studentId).get();
      
      if (!studentDoc.exists) {
        logger.error("Student not found:", studentId);
        throw new Error("Student not found");
      }
      
      const student = studentDoc.data();
      logger.info("Student data retrieved:", {
        id: studentId,
        email: student.email,
        firstName: student.firstName
      });
      
      if (!student.email) {
        logger.error("Student has no email:", studentId);
        throw new Error("Student does not have an email address");
      }
      
      // Check if student already has a users document
      const usersSnapshot = await db.collection('users')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        logger.warn("Student already has users document:", studentId);
        throw new Error("Student already has a portal account");
      }
      
      logger.info("Student does not have users document, proceeding with invitation");
      
      // Check if auth user exists for this email
      let authUserExists = false;
      try {
        await admin.auth().getUserByEmail(student.email.toLowerCase());
        authUserExists = true;
        logger.warn("Auth user already exists for email:", student.email);
        throw new Error("An auth account already exists for this email");
      } catch (authError) {
        // If error is 'user not found', that's what we want - continue
        if (authError.code === 'auth/user-not-found') {
          logger.info("No auth user found for email (as expected):", student.email);
        } else {
          // Re-throw if it's a different error
          logger.error("Error checking auth user:", authError);
          throw authError;
        }
      }
      
      // Generate invitation email
      logger.info("Generating invitation email for:", student.email);
      const invitationEmail = generatePortalInvitationEmail(
        student,
        'https://urbanswing.co.nz/student-portal'
      );
      
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
      
      // Send invitation email
      logger.info("Sending invitation email to:", student.email);
      await transporter.sendMail({
        from: '"Urban Swing" <dance@urbanswing.co.nz>',
        to: student.email,
        subject: "Join the Urban Swing Student Portal!",
        text: invitationEmail.text,
        html: invitationEmail.html,
      });

      logger.info("Portal invitation email sent successfully to:", student.email);
      
      return {
        success: true,
        message: "Invitation email sent successfully",
        email: student.email
      };
    } catch (error) {
      logger.error("Error sending portal invitation email:", {
        studentId,
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(error.message || "Failed to send invitation email");
    }
  }
);

/**
 * Send low balance email when student has 1 concession remaining
 * Callable function to be invoked from client-side when balance drops to 1
 */
exports.sendLowBalanceEmail = onCall(
  {
    secrets: [emailPassword],
  },
  async (request) => {
    const {studentId} = request.data;

    if (!studentId) {
      throw new Error("studentId is required");
    }

    logger.info("Low balance email requested for student:", studentId);

    try {
      const db = getFirestore();

      // Get student document
      const studentDoc = await db.collection('students').doc(studentId).get();

      if (!studentDoc.exists) {
        logger.error("Student not found:", studentId);
        throw new Error("Student not found");
      }

      const student = studentDoc.data();

      // Check email consent (send if true, null, undefined, or missing)
      if (student.emailConsent === false) {
        logger.info("Student has opted out of emails, skipping:", studentId);
        return {
          success: false,
          message: "Student has opted out of emails",
          skipped: true
        };
      }

      if (!student.email) {
        logger.error("Student has no email:", studentId);
        throw new Error("Student does not have an email address");
      }

      // Query active concession blocks to verify balance is actually 1
      const blocksSnapshot = await db.collection('concessionBlocks')
        .where('studentId', '==', studentId)
        .where('status', '==', 'active')
        .where('remainingQuantity', '>', 0)
        .get();

      const totalBalance = blocksSnapshot.docs.reduce((sum, doc) => {
        return sum + doc.data().remainingQuantity;
      }, 0);

      logger.info(`Student ${studentId} active balance: ${totalBalance}`);

      if (totalBalance !== 1) {
        logger.warn(`Balance is not 1 (actual: ${totalBalance}), skipping email`);
        return {
          success: false,
          message: `Balance is ${totalBalance}, not 1`,
          skipped: true
        };
      }

      // Generate email
      const emailContent = generateLowBalanceEmail(student, totalBalance);

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

      // Send email
      await transporter.sendMail({
        from: '"Urban Swing" <dance@urbanswing.co.nz>',
        to: student.email,
        bcc: 'dance@urbanswing.co.nz',
        subject: "🎫 Your Concessions Are Running Low",
        text: emailContent.text,
        html: emailContent.html,
      });

      logger.info("Low balance email sent successfully to:", student.email);

      return {
        success: true,
        message: "Low balance email sent successfully",
        email: student.email
      };
    } catch (error) {
      logger.error("Error sending low balance email:", {
        studentId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(error.message || "Failed to send low balance email");
    }
  }
);

/**
 * Scheduled function to send expiry warning emails
 * Runs every Thursday at 10:00 AM NZ time
 * Checks for concessions expiring within 4 weeks and sends notification emails
 */
exports.sendExpiryWarningEmails = onSchedule(
  {
    schedule: "0 10 * * 4", // Every Thursday at 10 AM (server time - need to adjust for NZ timezone)
    timeZone: "Pacific/Auckland", // NZ timezone
    secrets: [emailPassword],
  },
  async (event) => {
    logger.info("Starting expiry warning email job");

    try {
      const db = getFirestore();

      // Calculate date range: 4 weeks from now (28 days) to 5 weeks from now (35 days)
      const now = new Date();
      const fourWeeksFromNow = new Date(now.getTime() + (28 * 24 * 60 * 60 * 1000));
      const fiveWeeksFromNow = new Date(now.getTime() + (35 * 24 * 60 * 60 * 1000));

      logger.info(`Checking for blocks expiring between ${fourWeeksFromNow.toISOString()} and ${fiveWeeksFromNow.toISOString()}`);

      // Query blocks that:
      // 1. Are active
      // 2. Have remaining quantity > 0
      // 3. Have expiry date within the 4-5 week window
      // 4. Haven't been notified yet (expiryWarningEmailSent is not true)
      const blocksSnapshot = await db.collection('concessionBlocks')
        .where('status', '==', 'active')
        .where('remainingQuantity', '>', 0)
        .where('expiryDate', '>=', admin.firestore.Timestamp.fromDate(fourWeeksFromNow))
        .where('expiryDate', '<=', admin.firestore.Timestamp.fromDate(fiveWeeksFromNow))
        .get();

      logger.info(`Found ${blocksSnapshot.size} blocks in expiry window`);

      // Filter out blocks that have already been notified
      const blocksToNotify = blocksSnapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.expiryWarningEmailSent;
      });

      logger.info(`${blocksToNotify.length} blocks need notification`);

      if (blocksToNotify.length === 0) {
        logger.info("No blocks to notify, job complete");
        return {success: true, emailsSent: 0};
      }

      // Group blocks by student
      const blocksByStudent = {};
      blocksToNotify.forEach(doc => {
        const data = doc.data();
        if (!blocksByStudent[data.studentId]) {
          blocksByStudent[data.studentId] = [];
        }
        blocksByStudent[data.studentId].push({
          id: doc.id,
          ...data
        });
      });

      logger.info(`Grouped into ${Object.keys(blocksByStudent).length} students`);

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

      let emailsSent = 0;
      let emailsSkipped = 0;
      const errors = [];

      // Process each student
      for (const [studentId, blocks] of Object.entries(blocksByStudent)) {
        try {
          // Get student document
          const studentDoc = await db.collection('students').doc(studentId).get();

          if (!studentDoc.exists) {
            logger.error(`Student not found: ${studentId}`);
            errors.push({studentId, error: "Student not found"});
            continue;
          }

          const student = studentDoc.data();

          // Check email consent (send if true, null, undefined, or missing)
          if (student.emailConsent === false) {
            logger.info(`Student ${studentId} has opted out of emails, skipping`);
            emailsSkipped++;
            // Still mark blocks as notified so we don't keep trying
            for (const block of blocks) {
              await db.collection('concessionBlocks').doc(block.id).update({
                expiryWarningEmailSent: true,
                expiryWarningEmailSkipped: true,
                expiryWarningEmailDate: admin.firestore.FieldValue.serverTimestamp()
              });
            }
            continue;
          }

          if (!student.email) {
            logger.error(`Student ${studentId} has no email`);
            errors.push({studentId, error: "No email address"});
            continue;
          }

          // Prepare block data for email
          const expiringBlocks = blocks.map(block => ({
            remainingQuantity: block.remainingQuantity,
            expiryDate: block.expiryDate.toDate(),
            packageName: block.packageName
          }));

          // Generate email
          const emailContent = generateExpiringConcessionsEmail(student, expiringBlocks);

          // Send email
          await transporter.sendMail({
            from: '"Urban Swing" <dance@urbanswing.co.nz>',
            to: student.email,
            bcc: 'dance@urbanswing.co.nz',
            subject: "⏰ Your Concessions Are Expiring Soon",
            text: emailContent.text,
            html: emailContent.html,
          });

          logger.info(`Expiry warning email sent to ${student.email} for ${blocks.length} block(s)`);
          emailsSent++;

          // Mark blocks as notified
          for (const block of blocks) {
            await db.collection('concessionBlocks').doc(block.id).update({
              expiryWarningEmailSent: true,
              expiryWarningEmailDate: admin.firestore.FieldValue.serverTimestamp()
            });
          }

        } catch (error) {
          logger.error(`Error processing student ${studentId}:`, error);
          errors.push({studentId, error: error.message});
        }
      }

      logger.info(`Expiry warning job complete: ${emailsSent} sent, ${emailsSkipped} skipped, ${errors.length} errors`);

      return {
        success: true,
        emailsSent,
        emailsSkipped,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      logger.error("Error in expiry warning job:", {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
);
