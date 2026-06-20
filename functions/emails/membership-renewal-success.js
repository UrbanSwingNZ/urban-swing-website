/**
 * Membership Renewal Success Email
 * Sent to student when their recurring membership successfully renews
 * Acts as a receipt for the renewal payment
 */

const colors = {
    bluePrimary: '#3534fa',
    purplePrimary: '#9a16f5',
    pinkPrimary: '#e800f2',
    white: '#ffffff',
    textLight: '#666',
    textPrimary: '#333',
    bgLight: '#f8f9fa',
    success: '#28a745',
    successLight: '#d4edda',
    borderMedium: '#ddd',
    borderLight: '#e0e0e0'
};

/**
 * Generate membership renewal success email
 * @param {Object} params - Email parameters
 * @param {string} params.studentName - Student's full name
 * @param {string} params.firstName - Student's first name
 * @param {string} params.membershipType - Name of membership type (e.g., "Improver Monthly")
 * @param {number} params.amount - Amount charged (in dollars)
 * @param {Date} params.renewalDate - Date of renewal
 * @param {Date} params.newExpiryDate - New membership expiry date
 * @param {string} params.paymentMethod - Last 4 digits of card (e.g., "4242")
 * @returns {Object} Email content with subject, html, and text
 */
function generateMembershipRenewalSuccessEmail({
    studentName,
    firstName,
    membershipType,
    amount,
    renewalDate,
    newExpiryDate,
    paymentMethod
}) {
    const subject = 'Your Urban Swing Membership Has Renewed ✓';

    // Format dates
    const formatDate = (date) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-NZ', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatShortDate = (date) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-NZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: ${colors.bgLight};">
    <div style="max-width: 600px; margin: 0 auto; background: ${colors.white};">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${colors.bluePrimary} 0%, ${colors.purplePrimary} 50%, ${colors.pinkPrimary} 100%); padding: 30px; text-align: center;">
            <h1 style="color: ${colors.white}; margin: 0; font-size: 24px; font-weight: 600;">
                ✓ Membership Renewed Successfully
            </h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px;">
            
            <!-- Success Message -->
            <div style="background: ${colors.successLight}; border-left: 4px solid ${colors.success}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #155724; font-weight: 600; font-size: 16px;">
                    ✓ Payment Successful
                </p>
            </div>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${firstName},
            </p>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your <strong>${membershipType}</strong> membership has been automatically renewed and you're all set for another month of dancing.
            </p>
            
            <!-- Receipt Details -->
            <h2 style="color: ${colors.purplePrimary}; margin: 30px 0 15px 0; font-size: 18px;">
                Payment Receipt
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: ${colors.bgLight}; border-radius: 8px;">
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Membership Type:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};">${membershipType}</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Amount Charged:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium}; color: ${colors.purplePrimary}; font-weight: 600;">$${amount.toFixed(2)} NZD</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Payment Method:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};">Card ending in ${paymentMethod}</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Renewal Date:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};">${formatShortDate(renewalDate)}</td>
                </tr>
                <tr>
                    <td style="padding: 15px;"><strong>Valid Until:</strong></td>
                    <td style="padding: 15px; color: ${colors.success}; font-weight: 600;">${formatDate(newExpiryDate)}</td>
                </tr>
            </table>
            
            <!-- Next Steps -->
            <h2 style="color: ${colors.purplePrimary}; margin: 30px 0 15px 0; font-size: 18px;">
                Your Membership
            </h2>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your membership will continue to renew automatically on the same day each month. You can turn off auto-renewal at any time from your Student Portal - you'll still have access until ${formatShortDate(newExpiryDate)}.
            </p>
            
            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://urbanswing.co.nz/student-portal/membership/" 
                   style="display: inline-block; background: linear-gradient(135deg, ${colors.bluePrimary} 0%, ${colors.purplePrimary} 50%, ${colors.pinkPrimary} 100%); color: ${colors.white}; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Manage Membership
                </a>
            </div>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                See you on the dance floor!
            </p>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 10px 0 0 0;">
                The Urban Swing Team
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: ${colors.bgLight}; padding: 20px; border-top: 1px solid ${colors.borderMedium};">
            <p style="color: ${colors.textLight}; font-size: 12px; line-height: 1.6; margin: 0 0 10px 0;">
                <strong>Questions about your membership?</strong><br>
                You can update your payment method or turn off auto-renewal in the 
                <a href="https://urbanswing.co.nz/student-portal/membership/" style="color: ${colors.purplePrimary};">Student Portal</a>.
            </p>
            <p style="color: ${colors.textLight}; font-size: 12px; line-height: 1.6; margin: 0;">
                Urban Swing | Hawkes Bay, New Zealand<br>
                <a href="mailto:dance@urbanswing.co.nz" style="color: ${colors.purplePrimary};">dance@urbanswing.co.nz</a>
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();

    const text = `
MEMBERSHIP RENEWED SUCCESSFULLY

Hi ${firstName},

Great news! Your ${membershipType} membership has been automatically renewed and you're all set for another month of dancing.

PAYMENT RECEIPT
---------------
Membership Type: ${membershipType}
Amount Charged: $${amount.toFixed(2)} NZD
Payment Method: Card ending in ${paymentMethod}
Renewal Date: ${formatShortDate(renewalDate)}
Valid Until: ${formatDate(newExpiryDate)}

YOUR MEMBERSHIP
--------------
Your membership will continue to renew automatically on the same day each month. You can turn off auto-renewal at any time from your Student Portal - you'll still have access until ${formatShortDate(newExpiryDate)}.

Manage your membership: https://urbanswing.co.nz/student-portal/membership/

See you on the dance floor!

The Urban Swing Team

---
QUESTIONS ABOUT YOUR MEMBERSHIP?
You can update your payment method or turn off auto-renewal in the Student Portal.
Visit: https://urbanswing.co.nz/student-portal/membership/

Urban Swing | Hawkes Bay, New Zealand
dance@urbanswing.co.nz
    `.trim();

    return { subject, html, text };
}

module.exports = { generateMembershipRenewalSuccessEmail };
