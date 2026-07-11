/**
 * Test script to send a welcome email
 * Usage: node test-send-email.js
 */

const nodemailer = require('nodemailer');
const { generateWelcomeEmail } = require('./emails/new-student-emails');

// Test student data
const testStudent = {
  firstName: 'Lance',
  lastName: 'Jenner',
  email: 'lance.jenner1980@gmail.com',
  phoneNumber: '021 123 4567',
  pronouns: 'he/him',
  emailConsent: true
};

// Pricing (typical Urban Swing rates)
const casualRate = 20;
const studentRate = 15;
const fiveClassPrice = 90;
const tenClassPrice = 170;
const hasUserAccount = false; // Set to true if testing with portal access

async function sendTestEmail() {
  try {
    console.log('Generating welcome email...');
    
    // Generate the email content
    const emailContent = generateWelcomeEmail(
      testStudent,
      casualRate,
      studentRate,
      fiveClassPrice,
      tenClassPrice,
      hasUserAccount
    );

    console.log('Email generated successfully!');
    console.log('\nTo send this email, you need to provide the EMAIL_APP_PASSWORD.');
    console.log('\nExample usage:');
    console.log('  $env:EMAIL_APP_PASSWORD="your-password"; node test-send-email.js');

    // Check if EMAIL_APP_PASSWORD is set
    const emailPassword = process.env.EMAIL_APP_PASSWORD;
    
    if (!emailPassword) {
      console.log('\n❌ EMAIL_APP_PASSWORD not found. Email not sent.');
      console.log('\nGenerated email preview (text version):');
      console.log('----------------------------------------');
      console.log(emailContent.text);
      return;
    }

    console.log('\n📧 Sending email from: dance@urbanswing.co.nz');
    console.log('📧 Sending email to:', testStudent.email);

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "dance@urbanswing.co.nz",
        pass: emailPassword,
      },
      tls: {
        // Don't fail on invalid certificates (for testing purposes)
        rejectUnauthorized: false
      }
    });

    // Send email
    await transporter.sendMail({
      from: '"Urban Swing" <dance@urbanswing.co.nz>',
      to: testStudent.email,
      subject: "Welcome to Urban Swing! 🎉",
      text: emailContent.text,
      html: emailContent.html,
    });

    console.log('✅ Email sent successfully to:', testStudent.email);
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the function
sendTestEmail();
