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

// Define secrets for email configuration
const emailPassword = defineSecret("EMAIL_APP_PASSWORD");

// Initialize Firebase Admin
admin.initializeApp();

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
      const casualRatesSnapshot = await admin.firestore()
        .collection('casualRates')
        .where('isActive', '==', true)
        .orderBy('displayOrder', 'asc')
        .get();
      
      logger.info(`Found ${casualRatesSnapshot.size} casual rates`);
      
      let casualRate = null;
      let studentRate = null;
      
      casualRatesSnapshot.forEach(doc => {
        const rate = doc.data();
        logger.info(`Processing rate: ${rate.name} - $${rate.price} (isPromo: ${rate.isPromo})`);
        if (rate.name && rate.name.toLowerCase().includes('student') && !rate.isPromo) {
          studentRate = rate.price;
        } else if (rate.name && !rate.name.toLowerCase().includes('student') && !rate.isPromo) {
          casualRate = rate.price;
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
      const concessionPackagesSnapshot = await admin.firestore()
        .collection('concessionPackages')
        .where('isActive', '==', true)
        .orderBy('numberOfClasses', 'asc')
        .get();
      
      logger.info(`Found ${concessionPackagesSnapshot.size} concession packages`);
      
      let fiveClassPrice = null;
      let tenClassPrice = null;
      
      concessionPackagesSnapshot.forEach(doc => {
        const pkg = doc.data();
        logger.info(`Processing package: ${pkg.numberOfClasses} classes - $${pkg.price}`);
        if (pkg.numberOfClasses === 5) {
          fiveClassPrice = pkg.price;
        } else if (pkg.numberOfClasses === 10) {
          tenClassPrice = pkg.price;
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

      // --- EMAIL 1: Admin Notification ---
      const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3534Fa 0%, #9a16f5 50%, #e800f2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Student Registration</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #9a16f5; margin-top: 0;">Student Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${student.firstName} ${student.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="mailto:${student.email}">${student.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${student.phoneNumber || 'N/A'}</td>
              </tr>
              ${student.pronouns ? `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Pronouns:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${student.pronouns}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Registered:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${registeredAt}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email Consent:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${student.emailConsent ? '✅ Yes' : '❌ No'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Student ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><code>${studentId}</code></td>
              </tr>
            </table>
            
            ${student.adminNotes ? `
            <div style="margin-top: 20px; padding: 15px; background: #fff; border-left: 4px solid #9a16f5;">
              <strong>Admin Notes:</strong><br>
              ${student.adminNotes}
            </div>
            ` : ''}
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #666;">View this student in the admin database:</p>
              <a href="https://urbanswing.co.nz/admin/student-database/" 
                 style="display: inline-block; padding: 12px 24px; background: #9a16f5; color: white; text-decoration: none; border-radius: 6px;">
                Open Student Database
              </a>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px; background: #e9ecef;">
            <p>This is an automated notification from Urban Swing student registration system.</p>
          </div>
        </div>
      `;

      const adminEmailText = `
New Student Registration

Name: ${student.firstName} ${student.lastName}
Email: ${student.email}
Phone: ${student.phoneNumber || 'N/A'}
${student.pronouns ? `Pronouns: ${student.pronouns}\n` : ''}
Registered: ${registeredAt}
Email Consent: ${student.emailConsent ? 'Yes' : 'No'}
Student ID: ${studentId}
${student.adminNotes ? `\nAdmin Notes:\n${student.adminNotes}` : ''}

View in admin database: https://urbanswing.co.nz/admin/student-database/
      `;

      // --- EMAIL 2: Welcome Email to Student ---
      const welcomeEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3534Fa 0%, #9a16f5 50%, #e800f2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0;">Welcome to Urban Swing!</h1>
            <p style="color: white; margin: 0; font-size: 1.1rem;">Get ready to dance</p>
          </div>
          
          <div style="padding: 30px; background: #fff;">
            <h2 style="color: #9a16f5; margin-top: 0;">Hi ${student.firstName}! 👋</h2>
            
            <p style="font-size: 1rem; line-height: 1.6; color: #333;">
              Thank you for registering with Urban Swing! We're excited to have you join our dance community.
            </p>
            
            <h3 style="color: #9a16f5; margin-top: 30px;">📅 Class Information</h3>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 15px 0; font-size: 1rem; color: #333;">
                <strong style="color: #9a16f5;">When:</strong> Every Thursday, 7:15 PM - 9:15 PM
              </p>
              <p style="margin: 0; font-size: 1rem; color: #333;">
                <strong style="color: #9a16f5;">Where:</strong> Dance Express Studios, Cnr Taradale Rd & Austin St, Onekawa, Napier
              </p>
            </div>

            <h3 style="color: #9a16f5; margin-top: 30px;">💰 Pricing</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 12px; border-bottom: 2px solid #e0e0e0; font-weight: bold; color: #9a16f5;">Option</td>
                <td style="padding: 12px; border-bottom: 2px solid #e0e0e0; font-weight: bold; color: #9a16f5;">Price</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">Single Class</td>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${casualRate}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">Single Class (Student)</td>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${studentRate}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">5 Class Concession</td>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${fiveClassPrice}</strong> <span style="color: #28a745; font-size: 0.9rem;">(Save $${casualRate * 5 - fiveClassPrice}!)</span></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">10 Class Concession</td>
                <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${tenClassPrice}</strong> <span style="color: #28a745; font-size: 0.9rem;">(Save $${casualRate * 10 - tenClassPrice}!)</span></td>
              </tr>
            </table>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin-top: 20px;">
              <p style="margin: 0; color: #1b5e20; font-size: 0.95rem;">
                <strong>💡 Tip:</strong> 5 Class Concessions are valid for 6 months, and 10 Class Concessions are valid for 9 months from date of purchase.
              </p>
            </div>

            <h3 style="color: #9a16f5; margin-top: 30px;">🎉 What to Expect</h3>
            
            <ul style="line-height: 1.8; color: #333;">
              <li>Fun, energetic West Coast Swing classes for all levels</li>
              <li>Welcoming community of dancers</li>
              <li>No partner required - we rotate partners during class</li>
              <li>Beginner-friendly instruction</li>
            </ul>

            <div style="margin-top: 30px; text-align: center;">
              <a href="https://urbanswing.co.nz/pages/classes.html" 
                 style="display: inline-block; padding: 14px 28px; background: #9a16f5; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold;">
                View Full Class Schedule
              </a>
            </div>

            <p style="margin-top: 30px; font-size: 0.95rem; color: #666; line-height: 1.6;">
              If you have any questions, feel free to reply to this email or contact us at 
              <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>.
            </p>

            <p style="font-size: 1rem; color: #333; margin-top: 20px;">
              See you on the dance floor!<br>
              <strong style="color: #9a16f5;">The Urban Swing Team</strong>
            </p>
          </div>
          
          <div style="padding: 20px; text-align: center; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 15px 0; font-size: 0.9rem; color: #666;">
              Follow us for updates and events:
            </p>
            
            <!-- Social Media Icons -->
            <div style="margin-bottom: 15px;">
              <a href="https://www.facebook.com/UrbanSwingNZ" style="display: inline-block; margin: 0 8px; color: #3b5998; text-decoration: none; font-size: 24px;" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 32px; height: 32px; vertical-align: middle;">
              </a>
              <a href="https://www.instagram.com/urbanswingnz" style="display: inline-block; margin: 0 8px; color: #E1306C; text-decoration: none; font-size: 24px;" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" style="width: 32px; height: 32px; vertical-align: middle;">
              </a>
              <a href="https://urbanswing.co.nz" style="display: inline-block; margin: 0 8px; color: #9a16f5; text-decoration: none; font-size: 24px;" target="_blank">
                <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 32px; height: 32px; vertical-align: middle;">
              </a>
              <a href="mailto:dance@urbanswing.co.nz" style="display: inline-block; margin: 0 8px; color: #9a16f5; text-decoration: none; font-size: 24px;">
                <img src="https://cdn-icons-png.flaticon.com/512/732/732200.png" alt="Email" style="width: 32px; height: 32px; vertical-align: middle;">
              </a>
            </div>
          </div>
        </div>
      `;

      const welcomeEmailText = `
Welcome to Urban Swing!

Hi ${student.firstName}!

Thank you for registering with Urban Swing! We're excited to have you join our dance community.

CLASS INFORMATION
When: Every Thursday, 7:15 PM - 9:15 PM
Where: Dance Express Studios, Cnr Taradale Rd & Austin St, Onekawa, Napier

PRICING
- Single Class: $${casualRate}
- Single Class (Student): $${studentRate}
- 5 Class Concession: $${fiveClassPrice} (Save $${casualRate * 5 - fiveClassPrice}!) - valid for 6 months
- 10 Class Concession: $${tenClassPrice} (Save $${casualRate * 10 - tenClassPrice}!) - valid for 9 months

WHAT TO EXPECT
- Fun, energetic West Coast Swing classes for all levels
- Welcoming community of dancers
- No partner required - we rotate partners during class
- Beginner-friendly instruction

View full class schedule: https://urbanswing.co.nz/pages/classes.html

If you have any questions, feel free to reply to this email or contact us at dance@urbanswing.co.nz.

See you on the dance floor!
The Urban Swing Team

---
Follow us:
Facebook: https://www.facebook.com/UrbanSwingNZ
Instagram: https://www.instagram.com/urbanswingnz
Website: https://urbanswing.co.nz
Email: dance@urbanswing.co.nz
      `;

      // Send admin notification email
      try {
        await transporter.sendMail({
          from: '"Urban Swing" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: `New Student Registration: ${student.firstName} ${student.lastName}`,
          text: adminEmailText,
          html: adminEmailHtml,
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
        text: welcomeEmailText,
        html: welcomeEmailHtml,
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
        
        await transporter.sendMail({
          from: '"Urban Swing System" <dance@urbanswing.co.nz>',
          to: "dance@urbanswing.co.nz",
          subject: "⚠️ ERROR: Failed to send student welcome email",
          text: `Error occurred while processing registration for ${student.firstName} ${student.lastName} (${student.email}):\n\nError: ${error.message}\n\nStudent ID: ${studentId}\n\nPlease check the pricing configuration in Admin Tools > Concession Types Manager and ensure all casual rates and concession packages are properly configured.\n\nView Firebase Functions logs: https://console.firebase.google.com/project/directed-curve-447204-j4/functions/logs`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc3545; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">⚠️ System Error</h1>
              </div>
              
              <div style="padding: 30px; background: #fff;">
                <h2 style="color: #dc3545; margin-top: 0;">Failed to send student welcome email</h2>
                
                <p style="font-size: 1rem; line-height: 1.6; color: #333;">
                  An error occurred while processing the registration for:
                </p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${student.firstName} ${student.lastName}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${student.email}</p>
                  <p style="margin: 5px 0;"><strong>Student ID:</strong> ${studentId}</p>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                  <p style="margin: 0; color: #856404;">
                    <strong>Error Message:</strong><br>
                    ${error.message}
                  </p>
                </div>
                
                <h3 style="color: #dc3545;">Action Required:</h3>
                <ul style="line-height: 1.8; color: #333;">
                  <li>Check the pricing configuration in <strong>Admin Tools > Concession Types Manager</strong></li>
                  <li>Ensure all casual rates are active (Casual Entry and Student Casual Entry)</li>
                  <li>Ensure 5-class and 10-class concession packages are active</li>
                  <li>Manually send the welcome email to the student once pricing is fixed</li>
                </ul>
                
                <div style="margin-top: 30px; text-align: center;">
                  <a href="https://console.firebase.google.com/project/directed-curve-447204-j4/functions/logs" 
                     style="display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px;">
                    View Function Logs
                  </a>
                  <a href="https://urbanswing.co.nz/admin/admin-tools/concession-types.html" 
                     style="display: inline-block; padding: 12px 24px; background: #9a16f5; color: white; text-decoration: none; border-radius: 6px;">
                    Fix Pricing Configuration
                  </a>
                </div>
              </div>
              
              <div style="padding: 20px; text-align: center; color: #666; font-size: 12px; background: #e9ecef;">
                <p>This is an automated error notification from Urban Swing student registration system.</p>
              </div>
            </div>
          `,
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
