/**
 * error-notification-email.js
 * Email template for system error notifications to admin
 */

/**
 * Generate error notification email for admin
 * @param {Object} student - Student data
 * @param {string} studentId - Student document ID
 * @param {Error} error - The error that occurred
 * @returns {Object} Object with html and text versions
 */
function generateErrorNotificationEmail(student, studentId, error) {
  const html = `
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
  `;

  const text = `
⚠️ SYSTEM ERROR: Failed to send student welcome email

An error occurred while processing the registration for:

Name: ${student.firstName} ${student.lastName}
Email: ${student.email}
Student ID: ${studentId}

Error Message:
${error.message}

ACTION REQUIRED:
- Check the pricing configuration in Admin Tools > Concession Types Manager
- Ensure all casual rates are active (Casual Entry and Student Casual Entry)
- Ensure 5-class and 10-class concession packages are active
- Manually send the welcome email to the student once pricing is fixed

View Function Logs: https://console.firebase.google.com/project/directed-curve-447204-j4/functions/logs
Fix Pricing Configuration: https://urbanswing.co.nz/admin/admin-tools/concession-types.html

This is an automated error notification from Urban Swing student registration system.
  `;

  return { html, text };
}

module.exports = {
  generateErrorNotificationEmail
};
