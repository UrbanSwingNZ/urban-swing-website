/**
 * Email Notifications Cloud Functions
 * Handles automated email sending for student registration and account setup
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const {generateMerchOrderEmail} = require("./emails/merch-order-notification");
const {generateAdminNotificationEmail, generateWelcomeEmail} = require("./emails/new-student-emails");
const {generateAccountSetupEmail} = require("./emails/student-portal-setup-email");
const {generateErrorNotificationEmail} = require("./emails/error-notification-email");

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

      // Generate admin notification email using JavaScript generator
      const adminEmail = generateAdminNotificationEmail(
        student, 
        studentId, 
        registeredAt,
        casualRate,
        studentRate,
        fiveClassPrice,
        tenClassPrice
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
