/**
 * membership-expiring-soon.js
 * Email template for membership expiring soon warning (3 days before expiry)
 * Sent to students with non-recurring memberships only
 */

/**
 * Generate membership expiring soon warning email
 * @param {Object} params - Email parameters
 * @param {string} params.studentName - Full name of the student
 * @param {string} params.firstName - Student's first name for personalization
 * @param {string} params.membershipType - Type of membership (e.g., "Improver - Monthly")
 * @param {string} params.expiryDate - Formatted expiry date string
 * @param {number} params.daysUntilExpiry - Number of days until expiry (should be 3)
 * @return {Object} Email with subject, html, and text properties
 */
function generateMembershipExpiringSoonEmail({
  studentName,
  firstName,
  membershipType,
  expiryDate,
  daysUntilExpiry = 3,
}) {
  const subject = `Your ${membershipType} Membership Expires in ${daysUntilExpiry} Days`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #3534fa 0%, #9a16f5 50%, #e800f2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
    }
    .warning-badge {
      display: inline-block;
      background-color: #ff9800;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 12px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333333;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ff9800;
      padding: 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .warning-box p {
      margin: 0;
      color: #856404;
      font-size: 16px;
      line-height: 1.6;
    }
    .warning-box strong {
      color: #664d03;
    }
    .membership-details {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #495057;
    }
    .detail-value {
      color: #212529;
      text-align: right;
    }
    .expiry-highlight {
      font-weight: 700;
      color: #ff9800;
      font-size: 18px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3534fa 0%, #9a16f5 50%, #e800f2 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      text-align: center;
    }
    .info-text {
      font-size: 15px;
      line-height: 1.7;
      color: #495057;
      margin: 16px 0;
    }
    .options-list {
      margin: 20px 0;
      padding-left: 20px;
    }
    .options-list li {
      margin: 12px 0;
      font-size: 15px;
      line-height: 1.6;
      color: #495057;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #6c757d;
    }
    .footer p {
      margin: 8px 0;
    }
    .footer a {
      color: #9a16f5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Membership Expiring Soon</h1>
      <div class="warning-badge">${daysUntilExpiry} Days Remaining</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">
        Hi ${firstName},
      </div>

      <div class="warning-box">
        <p><strong>Your ${membershipType} membership will expire in ${daysUntilExpiry} days.</strong></p>
        <p style="margin-top: 12px;">After your membership expires, you won't be able to attend Improver classes until you purchase a new membership.</p>
      </div>

      <div class="membership-details">
        <div class="detail-row">
          <span class="detail-label">Membership Type:</span>
          <span class="detail-value">${membershipType}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Expires On:</span>
          <span class="detail-value expiry-highlight">${expiryDate}</span>
        </div>
      </div>

      <p class="info-text">
        <strong>Ready to continue your dance journey?</strong> Renew your membership now to avoid any interruption to your classes.
      </p>

      <center>
        <a href="https://urbanswing.co.nz/student-portal/" class="cta-button">
          Renew Membership
        </a>
      </center>

      <p class="info-text">
        When you renew, you can choose to:
      </p>

      <ul class="options-list">
        <li><strong>Set up automatic renewal</strong> so you never have to worry about expiry again</li>
        <li><strong>Make a one-time purchase</strong> if you prefer manual renewals</li>
      </ul>

      <p class="info-text" style="margin-top: 32px;">
        If you have any questions or need assistance, feel free to reach out to us at <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>.
      </p>

      <p class="info-text" style="margin-top: 24px; color: #6c757d; font-size: 14px;">
        <em>Note: This is an automated reminder for memberships not set to auto-renew. If you've already renewed, please disregard this message.</em>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Questions about your membership?</strong><br>
        Visit your <a href="https://urbanswing.co.nz/student-portal/" style="color: #9a16f5;">Student Portal</a> or email us at 
        <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>.
      </p>
      <p><strong>Urban Swing</strong> | Hawkes Bay, New Zealand<br>
        <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
MEMBERSHIP EXPIRING SOON

Hi ${firstName},

Your ${membershipType} membership will expire in ${daysUntilExpiry} days (on ${expiryDate}).

⚠️ IMPORTANT: After your membership expires, you won't be able to attend Improver classes until you purchase a new membership.

RENEW YOUR MEMBERSHIP
Visit: https://urbanswing.co.nz/student-portal/

When you renew, you can:
• Set up automatic renewal so you never have to worry about expiry again
• Make a one-time purchase if you prefer manual renewals

NEED HELP?
Contact us at dance@urbanswing.co.nz

---
Note: This is an automated reminder for memberships not set to auto-renew. If you've already renewed, please disregard this message.

---
QUESTIONS ABOUT YOUR MEMBERSHIP?
Visit your Student Portal: https://urbanswing.co.nz/student-portal/
Email us: dance@urbanswing.co.nz

Urban Swing | Hawkes Bay, New Zealand
dance@urbanswing.co.nz
  `.trim();

  return {subject, html, text};
}

module.exports = {
  generateMembershipExpiringSoonEmail,
};
