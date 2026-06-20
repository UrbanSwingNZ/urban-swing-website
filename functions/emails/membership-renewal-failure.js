/**
 * Membership Renewal Failure Email
 * Sent to student when their recurring membership payment fails
 * Explains the issue and next steps
 */

const colors = {
    bluePrimary: '#3534fa',
    purplePrimary: '#9a16f5',
    pinkPrimary: '#e800f2',
    white: '#ffffff',
    textLight: '#666',
    textPrimary: '#333',
    bgLight: '#f8f9fa',
    error: '#dc3545',
    errorLight: '#f8d7da',
    warning: '#ffc107',
    warningLight: '#fff3cd',
    borderMedium: '#ddd',
    borderLight: '#e0e0e0'
};

/**
 * Convert Stripe error code to user-friendly message
 * @param {string} failureCode - Stripe decline/failure code
 * @param {string} failureMessage - Raw Stripe failure message
 * @returns {Object} Object with reason (short) and details (longer explanation)
 */
function getUserFriendlyFailureReason(failureCode, failureMessage) {
    // Map common Stripe decline codes to user-friendly messages
    const errorMap = {
        // Card-specific errors
        'card_declined': {
            reason: 'Card Declined',
            details: 'Your card was declined by your bank. This could be due to insufficient funds, daily spending limits, or security restrictions. Please contact your bank for more information or try a different card.'
        },
        'expired_card': {
            reason: 'Card Expired',
            details: 'The card on file has expired. Please update your payment method with a valid card to continue your membership.'
        },
        'insufficient_funds': {
            reason: 'Insufficient Funds',
            details: 'Your card does not have sufficient funds to process this payment. Please add funds to your account or use a different payment method.'
        },
        'incorrect_cvc': {
            reason: 'Incorrect Security Code',
            details: 'The security code (CVC/CVV) for your card is incorrect. Please update your payment method with the correct card details.'
        },
        'incorrect_number': {
            reason: 'Invalid Card Number',
            details: 'The card number on file is invalid. Please update your payment method with a valid card.'
        },
        'invalid_expiry_year': {
            reason: 'Invalid Expiry Date',
            details: 'The expiry date for your card is invalid. Please update your payment method with the correct card details.'
        },
        'lost_card': {
            reason: 'Card Reported Lost',
            details: 'This card has been reported as lost. Please update your payment method with a different card.'
        },
        'stolen_card': {
            reason: 'Card Reported Stolen',
            details: 'This card has been reported as stolen. Please update your payment method with a different card.'
        },
        
        // Processing errors
        'processing_error': {
            reason: 'Payment Processing Error',
            details: 'There was an error processing your payment. This is usually temporary. Please try updating your payment method, or contact us if the issue persists.'
        },
        'issuer_not_available': {
            reason: 'Bank System Unavailable',
            details: 'Your bank\'s system was temporarily unavailable. This is usually a temporary issue. You can manually renew your membership, or wait and we\'ll try again on your next billing date.'
        },
        
        // Security/fraud
        'do_not_honor': {
            reason: 'Payment Declined by Bank',
            details: 'Your bank declined this payment. This is often due to security measures. Please contact your bank to authorize payments to Urban Swing, or try a different card.'
        },
        'fraudulent': {
            reason: 'Payment Blocked for Security',
            details: 'This payment was flagged by our security systems. Please contact us at dance@urbanswing.co.nz to resolve this issue.'
        },
        'restricted_card': {
            reason: 'Card Restricted',
            details: 'This card cannot be used for this type of payment. Please try a different card or contact your bank for assistance.'
        },
        
        // Other common errors
        'generic_decline': {
            reason: 'Payment Declined',
            details: 'Your payment was declined. Please contact your bank for more information or try a different payment method.'
        },
        'withdrawal_count_limit_exceeded': {
            reason: 'Transaction Limit Exceeded',
            details: 'You have exceeded the number of transactions allowed on this card. Please try again tomorrow or use a different card.'
        }
    };

    // Return mapped error or generic error
    if (errorMap[failureCode]) {
        return errorMap[failureCode];
    }

    // Generic fallback if code not recognized
    return {
        reason: 'Payment Failed',
        details: failureMessage || 'Your payment could not be processed. Please update your payment method or contact your bank for more information. If you continue to have issues, please email us at dance@urbanswing.co.nz.'
    };
}

/**
 * Generate membership renewal failure email
 * @param {Object} params - Email parameters
 * @param {string} params.studentName - Student's full name
 * @param {string} params.firstName - Student's first name
 * @param {string} params.membershipType - Name of membership type (e.g., "Improver Monthly")
 * @param {number} params.amount - Amount that failed to charge (in dollars)
 * @param {Date} params.expiryDate - When membership will expire
 * @param {string} params.failureCode - Stripe decline/failure code
 * @param {string} params.failureMessage - Raw Stripe failure message
 * @param {string} params.paymentMethod - Last 4 digits of card (e.g., "4242")
 * @returns {Object} Email content with subject, html, and text
 */
function generateMembershipRenewalFailureEmail({
    studentName,
    firstName,
    membershipType,
    amount,
    expiryDate,
    failureCode,
    failureMessage,
    paymentMethod
}) {
    const subject = '⚠️ Action Required: Membership Payment Failed';

    // Get user-friendly error message
    const { reason, details } = getUserFriendlyFailureReason(failureCode, failureMessage);

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
                ⚠️ Membership Payment Failed
            </h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px;">
            
            <!-- Alert Message -->
            <div style="background: ${colors.errorLight}; border-left: 4px solid ${colors.error}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #721c24; font-weight: 600; font-size: 16px;">
                    ⚠️ Action Required: Payment Failed
                </p>
            </div>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${firstName},
            </p>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We attempted to renew your <strong>${membershipType}</strong> membership, but unfortunately the payment failed.
            </p>
            
            <!-- Failure Details -->
            <h2 style="color: ${colors.purplePrimary}; margin: 30px 0 15px 0; font-size: 18px;">
                What Happened?
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: ${colors.bgLight}; border-radius: 8px;">
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Reason:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium}; color: ${colors.error}; font-weight: 600;">${reason}</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Amount:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};">$${amount.toFixed(2)} NZD</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Payment Method:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};">Card ending in ${paymentMethod}</td>
                </tr>
                <tr>
                    <td style="padding: 15px;"><strong>Membership Expires:</strong></td>
                    <td style="padding: 15px; color: ${colors.error}; font-weight: 600;">${formatDate(expiryDate)}</td>
                </tr>
            </table>
            
            <div style="background: ${colors.bgLight}; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="color: ${colors.textPrimary}; font-size: 14px; line-height: 1.6; margin: 0;">
                    ${details}
                </p>
            </div>
            
            <!-- Warning About Expiry -->
            <div style="background: ${colors.warningLight}; border-left: 4px solid ${colors.warning}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-weight: 600; font-size: 15px;">
                    ⚠️ Important: Your Membership Will Expire
                </p>
                <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px; line-height: 1.6;">
                    If you don't manually renew your membership, it will expire on <strong>${formatShortDate(expiryDate)}</strong>. After this date, you won't be able to attend Improver classes until you purchase a new membership.
                </p>
            </div>
            
            <!-- Next Steps -->
            <h2 style="color: ${colors.purplePrimary}; margin: 30px 0 15px 0; font-size: 18px;">
                What Should I Do?
            </h2>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                To continue your membership, you have two options:
            </p>
            
            <ol style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li><strong>Update your payment method</strong> - Go to your Student Portal and update your card details. Your membership will automatically renew on your next billing date.</li>
                <li><strong>Purchase a new membership</strong> - You can purchase a new membership immediately from the Student Portal.</li>
            </ol>
            
            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://urbanswing.co.nz/student-portal/membership/" 
                   style="display: inline-block; background: linear-gradient(135deg, ${colors.bluePrimary} 0%, ${colors.purplePrimary} 50%, ${colors.pinkPrimary} 100%); color: ${colors.white}; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Update Payment Method
                </a>
            </div>
            
            <!-- Support -->
            <h2 style="color: ${colors.purplePrimary}; margin: 30px 0 15px 0; font-size: 18px;">
                Need Help?
            </h2>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                If you're having trouble resolving this issue, please don't hesitate to contact us at <a href="mailto:dance@urbanswing.co.nz" style="color: ${colors.purplePrimary};">dance@urbanswing.co.nz</a> and we'll be happy to help.
            </p>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                The Urban Swing Team
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: ${colors.bgLight}; padding: 20px; border-top: 1px solid ${colors.borderMedium};">
            <p style="color: ${colors.textLight}; font-size: 12px; line-height: 1.6; margin: 0 0 10px 0;">
                <strong>Questions about your membership?</strong><br>
                Visit your <a href="https://urbanswing.co.nz/student-portal/membership/" style="color: ${colors.purplePrimary};">Student Portal</a> or email us at 
                <a href="mailto:dance@urbanswing.co.nz" style="color: ${colors.purplePrimary};">dance@urbanswing.co.nz</a>.
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
MEMBERSHIP PAYMENT FAILED - ACTION REQUIRED

Hi ${firstName},

We attempted to renew your ${membershipType} membership, but unfortunately the payment failed.

WHAT HAPPENED?
-------------
Reason: ${reason}
Amount: $${amount.toFixed(2)} NZD
Payment Method: Card ending in ${paymentMethod}
Membership Expires: ${formatDate(expiryDate)}

${details}

⚠️ IMPORTANT: YOUR MEMBERSHIP WILL EXPIRE

If you don't manually renew your membership, it will expire on ${formatShortDate(expiryDate)}. After this date, you won't be able to attend Improver classes until you purchase a new membership.

WHAT SHOULD I DO?
----------------
To continue your membership, you have two options:

1. Update your payment method - Go to your Student Portal and update your card details. Your membership will automatically renew on your next billing date.

2. Purchase a new membership - You can purchase a new membership immediately from the Student Portal.

Update your payment method: https://urbanswing.co.nz/student-portal/membership/

NEED HELP?
---------
If you're having trouble resolving this issue, please don't hesitate to contact us at dance@urbanswing.co.nz and we'll be happy to help.

The Urban Swing Team

---
QUESTIONS ABOUT YOUR MEMBERSHIP?
Visit your Student Portal: https://urbanswing.co.nz/student-portal/membership/
Email us: dance@urbanswing.co.nz

Urban Swing | Hawkes Bay, New Zealand
dance@urbanswing.co.nz
    `.trim();

    return { subject, html, text };
}

module.exports = {
    generateMembershipRenewalFailureEmail,
    getUserFriendlyFailureReason
};
