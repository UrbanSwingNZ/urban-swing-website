/**
 * account-setup-email.js
 * Email template for existing students setting up portal accounts
 */

/**
 * Generate account setup confirmation email
 * @param {Object} student - Student data
 * @param {Object} user - User data
 * @param {string} setupDate - Formatted setup date
 * @returns {Object} Object with html and text versions
 */
function generateAccountSetupEmail(student, user, setupDate) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #9a16f5 0%, #ed217c 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 2rem;">Welcome Back! 🎉</h1>
      </div>
      
      <div style="padding: 40px 30px; background: #fff;">
        <h2 style="color: #333; margin-top: 0;">Your Urban Swing Portal Account is Ready!</h2>
        
        <p style="font-size: 1.1rem; line-height: 1.6; color: #333;">
          Hi ${student.firstName},
        </p>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          Great news! You've successfully set up your Urban Swing Student Portal account. 
          You can now access your account to view your class history, manage your concessions, 
          and stay up to date with everything Urban Swing.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #9a16f5;">
          <h3 style="color: #9a16f5; margin-top: 0;">Account Details</h3>
          <p style="margin: 5px 0; color: #333;"><strong>Name:</strong> ${student.firstName} ${student.lastName}</p>
          <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 5px 0; color: #333;"><strong>Setup Date:</strong> ${setupDate}</p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://urbanswing.co.nz/student-portal/" 
             style="display: inline-block; padding: 16px 32px; background: #9a16f5; 
                    color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem;">
            Access Your Portal
          </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #0c5aa6; margin-top: 0;">What You Can Do in the Portal:</h3>
          <ul style="line-height: 1.8; color: #333;">
            <li>View your class check-in history</li>
            <li>Manage your concession packages</li>
            <li>Update your profile information</li>
            <li>View transaction history</li>
            <li>Purchase new concessions</li>
          </ul>
        </div>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333; margin-top: 30px;">
          If you have any questions or need help with your account, don't hesitate to reach out to us at 
          <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>.
        </p>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333; margin-top: 20px;">
          See you on the dance floor! 💃🕺
        </p>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          The Urban Swing Team
        </p>
      </div>
      
      <div style="padding: 30px; text-align: center; background: #f8f9fa; border-top: 1px solid #dee2e6;">
        <h3 style="color: #333; margin-top: 0; font-size: 1.1rem;">Stay Connected</h3>
        <p style="margin: 10px 0;">
          <a href="https://www.facebook.com/UrbanSwingNZ" style="color: #9a16f5; text-decoration: none; margin: 0 10px;">Facebook</a> | 
          <a href="https://www.instagram.com/urbanswingnz" style="color: #9a16f5; text-decoration: none; margin: 0 10px;">Instagram</a> | 
          <a href="https://urbanswing.co.nz" style="color: #9a16f5; text-decoration: none; margin: 0 10px;">Website</a>
        </p>
        <p style="color: #666; font-size: 0.9rem; margin-top: 20px;">
          Urban Swing Dance School<br>
          Auckland, New Zealand<br>
          <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>
        </p>
      </div>
    </div>
  `;

  const text = `
Welcome Back to Urban Swing! 🎉

Hi ${student.firstName},

Great news! You've successfully set up your Urban Swing Student Portal account.

Account Details:
- Name: ${student.firstName} ${student.lastName}
- Email: ${user.email}
- Setup Date: ${setupDate}

You can now access your portal at: https://urbanswing.co.nz/student-portal/

What You Can Do in the Portal:
- View your class check-in history
- Manage your concession packages
- Update your profile information
- View transaction history
- Purchase new concessions

If you have any questions or need help with your account, don't hesitate to reach out to us at dance@urbanswing.co.nz.

See you on the dance floor! 💃🕺

The Urban Swing Team

---
Follow us:
Facebook: https://www.facebook.com/UrbanSwingNZ
Instagram: https://www.instagram.com/urbanswingnz
Website: https://urbanswing.co.nz
Email: dance@urbanswing.co.nz
  `;

  return { html, text };
}

module.exports = {
  generateAccountSetupEmail
};
