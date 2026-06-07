/**
 * Improver Promotion Alert Email
 * Sent to admin when a student is promoted to improver with remaining concessions
 */

const { colors } = require('./email-styles');

/**
 * Generate improver promotion alert email
 * @param {Object} params - Email parameters
 * @param {string} params.studentName - Student's full name
 * @param {string} params.studentId - Student's Firestore ID
 * @param {string} params.studentEmail - Student's email address
 * @param {number} params.totalConcessions - Total remaining concessions
 * @param {number} params.totalAmount - Total amount spent on concessions
 * @param {Array} params.concessionDetails - Array of concession block details
 * @returns {Object} Email content with subject, html, and text
 */
function generateImproverPromotionAlert({ 
    studentName, 
    studentId, 
    studentEmail,
    totalConcessions, 
    totalAmount,
    concessionDetails 
}) {
    const subject = `Action Required: ${studentName} Promoted to Improver with Remaining Concessions`;
    
    // Build concession details table rows
    const concessionRows = concessionDetails.map(concession => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid ${colors.borderMedium};">${concession.type}</td>
            <td style="padding: 10px; border-bottom: 1px solid ${colors.borderMedium}; text-align: center;">${concession.remaining}</td>
            <td style="padding: 10px; border-bottom: 1px solid ${colors.borderMedium}; text-align: right;">$${concession.price.toFixed(2)}</td>
        </tr>
    `).join('');
    
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
        <div style="background: linear-gradient(135deg, ${colors.purplePrimary} 0%, ${colors.purpleSecondary} 100%); padding: 30px; text-align: center;">
            <h1 style="color: ${colors.white}; margin: 0; font-size: 24px; font-weight: 600;">
                ⚠️ Improver Promotion Alert
            </h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px;">
            
            <!-- Alert Message -->
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-weight: 600; font-size: 16px;">
                    <strong>Action Required: Concession Refund Needed</strong>
                </p>
            </div>
            
            <p style="color: ${colors.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                A student has been promoted to <strong>Improver</strong> status and has remaining concessions that need to be refunded.
            </p>
            
            <!-- Student Details -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: ${colors.bgLight}; border-radius: 8px;">
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Student Name:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};">${studentName}</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><strong>Email:</strong></td>
                    <td style="padding: 15px; border-bottom: 1px solid ${colors.borderMedium};"><a href="mailto:${studentEmail}" style="color: ${colors.purplePrimary};">${studentEmail}</a></td>
                </tr>
                <tr>
                    <td style="padding: 15px;"><strong>Student ID:</strong></td>
                    <td style="padding: 15px;"><code style="background: ${colors.bgLight}; padding: 2px 6px; border-radius: 4px;">${studentId}</code></td>
                </tr>
            </table>
            
            <!-- Concession Summary -->
            <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #0c5460; font-weight: 600; font-size: 16px;">
                    Remaining Concessions:
                </p>
                <p style="margin: 0; color: #0c5460; font-size: 20px; font-weight: 700;">
                    ${totalConcessions} class${totalConcessions === 1 ? '' : 'es'}
                </p>
                <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px;">
                    Total Amount Spent: <strong>$${totalAmount.toFixed(2)}</strong>
                </p>
            </div>
            
            <!-- Concession Details Table -->
            <h3 style="color: ${colors.textPrimary}; margin: 20px 0 10px 0; font-size: 18px;">
                Concession Block Details:
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: ${colors.white}; border: 1px solid ${colors.borderMedium};">
                <thead>
                    <tr style="background: ${colors.bgLight};">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid ${colors.borderMedium};">Package Type</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid ${colors.borderMedium};">Remaining</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid ${colors.borderMedium};">Price Paid</th>
                    </tr>
                </thead>
                <tbody>
                    ${concessionRows}
                </tbody>
                <tfoot>
                    <tr style="background: ${colors.bgLight}; font-weight: 600;">
                        <td style="padding: 10px;">TOTAL</td>
                        <td style="padding: 10px; text-align: center;">${totalConcessions}</td>
                        <td style="padding: 10px; text-align: right;">$${totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <!-- Next Steps -->
            <div style="background: ${colors.bgLight}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: ${colors.purplePrimary}; margin: 0 0 15px 0; font-size: 18px;">
                    📋 Next Steps:
                </h3>
                <ol style="color: ${colors.textPrimary}; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Calculate pro-rated refund based on unused concessions</li>
                    <li>Contact the student to arrange refund method</li>
                    <li>Process refund via original payment method or bank transfer</li>
                    <li>Update student record with refund details in Admin Notes</li>
                    <li>Mark concession blocks as refunded in the system (if applicable)</li>
                </ol>
            </div>
            
            <!-- Important Note -->
            <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #721c24; font-size: 14px; line-height: 1.6;">
                    <strong>⚠️ Important:</strong> As an improver, this student will now use memberships instead of concessions. 
                    Please ensure the refund is processed promptly to maintain good customer relations.
                </p>
            </div>
            
        </div>
        
        <!-- Footer -->
        <div style="background: ${colors.bgLight}; padding: 20px; text-align: center; border-top: 1px solid ${colors.borderMedium};">
            <p style="color: ${colors.textLight}; font-size: 12px; margin: 0;">
                This is an automated alert from the Urban Swing Student Management System
            </p>
        </div>
        
    </div>
</body>
</html>
    `;
    
    // Plain text version
    const text = `
IMPROVER PROMOTION ALERT - ACTION REQUIRED

A student has been promoted to Improver status and has remaining concessions that need to be refunded.

STUDENT DETAILS:
- Name: ${studentName}
- Email: ${studentEmail}
- Student ID: ${studentId}

REMAINING CONCESSIONS: ${totalConcessions} class${totalConcessions === 1 ? '' : 'es'}
Total Amount Spent: $${totalAmount.toFixed(2)}

CONCESSION BLOCK DETAILS:
${concessionDetails.map(c => `- ${c.type}: ${c.remaining} remaining ($${c.price.toFixed(2)})`).join('\n')}

NEXT STEPS:
1. Calculate pro-rated refund based on unused concessions
2. Contact the student to arrange refund method
3. Process refund via original payment method or bank transfer
4. Update student record with refund details in Admin Notes
5. Mark concession blocks as refunded in the system (if applicable)

IMPORTANT: As an improver, this student will now use memberships instead of concessions. 
Please ensure the refund is processed promptly to maintain good customer relations.

---
This is an automated alert from the Urban Swing Student Management System
    `.trim();
    
    return { subject, html, text };
}

module.exports = { generateImproverPromotionAlert };
