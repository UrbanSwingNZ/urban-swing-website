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

// Define secrets for email configuration
const emailPassword = defineSecret("EMAIL_APP_PASSWORD");

// Get Firestore with explicit settings
const getFirestore = () => {
  return admin.firestore();
};

/**
 * Fetches an email template from Firestore and renders it with variables
 * @param {string} templateId - The template document ID (e.g., 'admin-notification')
 * @param {Object} variables - Key-value pairs to replace in the template
 * @returns {Promise<{subject: string, text: string, html: string}>}
 */
async function renderEmailTemplate(templateId, variables) {
  const db = getFirestore();
  const templateDoc = await db.collection('emailTemplates').doc(templateId).get();
  
  if (!templateDoc.exists) {
    throw new Error(`Email template '${templateId}' not found`);
  }
  
  const template = templateDoc.data();
  let subject = template.subject || '';
  let textContent = template.textTemplate || template.textContent || '';
  let htmlContent = template.htmlTemplate || template.htmlContent || '';
  
  // Replace all variables - handles both {{var}} and ${var} formats
  Object.entries(variables).forEach(([key, value]) => {
    // Handle both placeholder formats
    const doubleBracePlaceholder = `{{${key}}}`;
    const dollarBracePlaceholder = `\${${key}}`;
    
    let stringValue;
    if (typeof value === 'boolean') {
      stringValue = value;
    } else {
      stringValue = value !== null && value !== undefined ? String(value) : '';
    }
    
    // Replace simple placeholders
    subject = subject.split(doubleBracePlaceholder).join(stringValue);
    subject = subject.split(dollarBracePlaceholder).join(stringValue);
    
    textContent = textContent.split(doubleBracePlaceholder).join(stringValue);
    textContent = textContent.split(dollarBracePlaceholder).join(stringValue);
    
    htmlContent = htmlContent.split(doubleBracePlaceholder).join(stringValue);
    htmlContent = htmlContent.split(dollarBracePlaceholder).join(stringValue);
  });
  
  // Handle conditional expressions ${var ? 'yes' : 'no'}
  Object.entries(variables).forEach(([key, value]) => {
    // Ternary with single quotes
    const ternaryRegex = new RegExp(`\\$\\{${key.replace(/\./g, '\\.')}\\s*\\?\\s*'([^']*)'\\s*:\\s*'([^']*)'\\}`, 'g');
    const ternaryReplacement = value ? '$1' : '$2';
    htmlContent = htmlContent.replace(ternaryRegex, (match, trueVal, falseVal) => value ? trueVal : falseVal);
    textContent = textContent.replace(ternaryRegex, (match, trueVal, falseVal) => value ? trueVal : falseVal);
    
    // OR operator with single quotes
    const orRegex = new RegExp(`\\$\\{${key.replace(/\./g, '\\.')}\\s*\\|\\|\\s*'([^']*)'\\}`, 'g');
    htmlContent = htmlContent.replace(orRegex, (match, defaultVal) => value || defaultVal);
    textContent = textContent.replace(orRegex, (match, defaultVal) => value || defaultVal);
  });
  
  // Handle math expressions like ${casualRate * 5 - fiveClassPrice}
  const mathRegex = /\$\{([^}]+)\}/g;
  htmlContent = htmlContent.replace(mathRegex, (match, expression) => {
    try {
      // Create a safe evaluation context with only the variables
      const evalContext = {...variables};
      // Replace variable names in the expression with their values
      let evalExpression = expression;
      Object.entries(variables).forEach(([key, value]) => {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${key.replace(/\./g, '\\.')}\\b`, 'g');
        evalExpression = evalExpression.replace(regex, JSON.stringify(value));
      });
      // Evaluate the expression
      const result = eval(evalExpression);
      return result;
    } catch (e) {
      // If evaluation fails, return the original match
      return match;
    }
  });
  
  return {
    subject,
    text: textContent,
    html: htmlContent
  };
}

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

      // Generate email content using Firestore templates
      const adminEmail = await renderEmailTemplate('admin-notification', {
        'student.firstName': student.firstName,
        'student.lastName': student.lastName,
        'student.email': student.email,
        'student.phoneNumber': student.phoneNumber || student.phone || 'N/A',
        'student.pronouns': student.pronouns || 'Not specified',
        'student.emailConsent': student.emailConsent,
        studentId: studentId,
        registeredAt: registeredAt,
        casualRate: casualRate,
        studentRate: studentRate,
        fiveClassPrice: fiveClassPrice,
        tenClassPrice: tenClassPrice
      });
      
      const welcomeEmail = await renderEmailTemplate('welcome-student', {
        'student.firstName': student.firstName,
        firstName: student.firstName,
        casualRate: casualRate,
        studentRate: studentRate,
        fiveClassPrice: fiveClassPrice,
        tenClassPrice: tenClassPrice,
        portalAccess: hasUserAccount ? 'Yes - you can log in at urbanswing.co.nz/student-portal' : 'Not yet - you\'ll receive login details after your first payment'
      });

      // Send admin notification email
      try {
        await transporter.sendMail({
          from: '"Urban Swing" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: adminEmail.subject,
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
        subject: welcomeEmail.subject,
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
        
        const errorEmail = await renderEmailTemplate('error-notification', {
          'student.firstName': student.firstName,
          'student.lastName': student.lastName,
          'student.email': student.email,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          studentId: studentId,
          errorType: 'Failed to send student welcome email',
          errorMessage: error.message,
          errorStack: error.stack || 'No stack trace available',
          timestamp: new Date().toLocaleString('en-NZ', {
            dateStyle: 'full',
            timeStyle: 'long',
            timeZone: 'Pacific/Auckland'
          })
        });
        
        await transporter.sendMail({
          from: '"Urban Swing System" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: errorEmail.subject,
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
      
      const accountSetupEmail = await renderEmailTemplate('account-setup', {
        'student.firstName': student.firstName,
        'student.lastName': student.lastName,
        'user.email': user.email,
        firstName: student.firstName,
        lastName: student.lastName,
        email: user.email,
        setupDate: setupDate,
        portalUrl: 'https://urbanswing.co.nz/student-portal'
      });
      
      await transporter.sendMail({
        from: '"Urban Swing" <dance@urbanswing.co.nz>',
        to: user.email,
        subject: accountSetupEmail.subject,
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
 * Send test email from admin email template manager
 * Restricted to dance@urbanswing.co.nz only
 */
exports.sendTestEmail = onCall(
  { 
    region: 'us-central1',
    cors: true,
    invoker: 'public',
    secrets: [emailPassword]
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new Error('Authentication required');
      }

      if (request.auth.token.email !== 'dance@urbanswing.co.nz') {
        throw new Error('Unauthorized: This function is restricted to dance@urbanswing.co.nz');
      }

      const { to, subject, html, text, templateId } = request.data;

      if (!to || !subject || !html) {
        throw new Error('Missing required fields: to, subject, html');
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'dance@urbanswing.co.nz',
          pass: emailPassword.value()
        }
      });

      await transporter.sendMail({
        from: 'Urban Swing <dance@urbanswing.co.nz>',
        to: to,
        subject: subject,
        text: text || 'This is a test email from Urban Swing email template manager.',
        html: html
      });

      logger.info(`Test email sent successfully for template: ${templateId}`);

      return {
        success: true,
        message: 'Test email sent successfully'
      };
    } catch (error) {
      logger.error('Error sending test email:', error);
      throw new Error(`Failed to send test email: ${error.message}`);
    }
  }
);
