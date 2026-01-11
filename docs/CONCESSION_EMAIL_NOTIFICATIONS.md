# Automated Concession Email Notifications

## Overview

This feature sends automated emails to students for two scenarios:
1. **Low Balance Warning**: When a student has exactly 1 active concession remaining
2. **Expiry Warning**: When concessions are expiring within 4 weeks (sent weekly on Thursdays)

## Email Consent

Both emails respect the student's `emailConsent` field:
- **Send emails when**: `emailConsent === true` OR `emailConsent` is `null`/`undefined`/missing (opt-in by default)
- **Don't send when**: `emailConsent === false` (explicit opt-out)

All emails include a footer explaining how to opt out via the Student Portal.

## Implementation Details

### 1. Low Balance Email
- **Trigger**: Automatically sent when a student checks in and their active concession balance drops to 1
- **Implementation**: Added to `concession-blocks-usage.js` in the `useBlockEntry()` function
- **Cloud Function**: `sendLowBalanceEmail` (callable)
- **Verification**: Only sends if active balance is exactly 1 (ignores locked/expired blocks)

### 2. Expiry Warning Email
- **Trigger**: Scheduled function runs every Thursday at 10:00 AM NZ time
- **Implementation**: `sendExpiryWarningEmails` scheduled function
- **Logic**: 
  - Finds blocks expiring between 4-5 weeks from now
  - Groups by student
  - Sends one email per student with all their expiring blocks
  - Marks blocks as notified (`expiryWarningEmailSent: true`) to prevent duplicates

## Files Created/Modified

### New Files:
- `functions/emails/concession-notifications.js` - Email templates
- `functions/test-concession-emails.js` - Test functions
- `admin/admin-tools/test-concession-emails.html` - Test interface

### Modified Files:
- `functions/email-notifications.js` - Added new Cloud Functions
- `functions/index.js` - Exported new functions
- `admin/check-in/js/concession-blocks-usage.js` - Added email trigger on check-in

## Deployment

1. **Deploy Cloud Functions**:
   ```bash
   cd functions
   firebase deploy --only functions
   ```

2. **Verify Deployment**:
   - Check Firebase Console > Functions
   - Look for:
     - `sendLowBalanceEmail` (callable)
     - `sendExpiryWarningEmails` (scheduled)
     - `testLowBalanceEmail` (callable - for testing)
     - `testExpiryWarningEmail` (callable - for testing)
     - `testLowBalanceEmailForStudent` (callable - for testing)

3. **Deploy Frontend**:
   ```bash
   firebase deploy --only hosting
   ```

## Testing

### Option 1: Using the Test Page (Recommended)

1. Navigate to: `https://urbanswing.co.nz/admin/admin-tools/test-concession-emails.html`
2. Use the test interface to send emails:
   - **Test 1**: Send low balance email to any address (uses dummy data)
   - **Test 2**: Send expiry warning email to any address (uses dummy data)
   - **Test 3**: Send low balance email to a real student by student ID

**Recommended Test Email**: `dance@urbanswing.co.nz`

### Option 2: Using Firebase Console

1. Go to Firebase Console > Functions
2. Click on a test function (e.g., `testLowBalanceEmail`)
3. Go to "Testing" tab
4. Provide test data:
   ```json
   {
     "testEmail": "dance@urbanswing.co.nz"
   }
   ```
5. Click "Run test"

### Option 3: Using Firebase CLI

```bash
cd functions
firebase functions:shell

# Then in the shell:
testLowBalanceEmail({testEmail: "dance@urbanswing.co.nz"})
testExpiryWarningEmail({testEmail: "dance@urbanswing.co.nz"})
```

### Option 4: Test with Real Student Data

You can test with a real student by:
1. Creating a test student in Firestore
2. Adding a concession block with:
   - `remainingQuantity: 1`
   - `status: 'active'`
3. Using the check-in system to check them in
4. The email should trigger automatically

For expiry warnings:
1. Create a test student with a concession block
2. Set `expiryDate` to 28-35 days from now
3. Either:
   - Wait until Thursday at 10 AM, OR
   - Manually trigger from Firebase Console

### Testing the Scheduled Function

The scheduled function (`sendExpiryWarningEmails`) can be manually triggered:

1. **Firebase Console**:
   - Go to Functions > `sendExpiryWarningEmails`
   - Click "Testing" tab
   - Click "Run test" (no parameters needed)

2. **Firebase CLI**:
   ```bash
   firebase functions:shell
   # Then:
   sendExpiryWarningEmails()
   ```

⚠️ **Warning**: Manual triggers will send REAL emails to students with matching data!

## Monitoring

### Check Logs

```bash
firebase functions:log --only sendLowBalanceEmail
firebase functions:log --only sendExpiryWarningEmails
```

Or view in Firebase Console > Functions > [function name] > Logs

### What to Look For

**Low Balance Email Logs**:
- `Low balance email requested for student: [studentId]`
- `Student [studentId] active balance: 1`
- `Low balance email sent successfully to: [email]`
- `Student has opted out of emails, skipping: [studentId]` (if opted out)

**Expiry Warning Logs**:
- `Starting expiry warning email job`
- `Found X blocks in expiry window`
- `Grouped into X students`
- `Expiry warning email sent to [email] for X block(s)`
- `Expiry warning job complete: X sent, X skipped, X errors`

## Troubleshooting

### Emails Not Sending

1. **Check email consent**: Verify student doesn't have `emailConsent: false`
2. **Check balance**: For low balance, ensure active balance is exactly 1
3. **Check expiry dates**: For expiry warnings, ensure blocks are in the 28-35 day window
4. **Check logs**: Look for errors in Firebase Console
5. **Verify EMAIL_APP_PASSWORD secret**: Make sure it's set in Firebase

### Duplicate Emails

For expiry warnings:
- Check if `expiryWarningEmailSent` field exists on blocks
- This field prevents duplicate notifications

### Testing Scheduled Function

If you need to test before Thursday:
- Use Firebase Console or CLI to manually trigger
- Or temporarily change the schedule in code (not recommended for production)

## Email Templates

### Low Balance Email
- Subject: "🎫 Your Concessions Are Running Low"
- Content: Notifies student they have 1 concession left
- CTA: Visit Student Portal to purchase more

### Expiry Warning Email
- Subject: "⏰ Your Concessions Are Expiring Soon"
- Content: Lists all blocks expiring in 4 weeks with details
- CTA: View class schedule to use them

Both emails include:
- Urban Swing branding (gradient colors)
- Responsive HTML/text versions
- Opt-out instructions with Student Portal link
- Contact information

## Future Enhancements

Potential improvements:
- Add email preferences UI in Student Portal
- Track email open rates
- Add reminder for 1 week before expiry (in addition to 4 weeks)
- Send summary of unused concessions after expiry
- Admin dashboard showing email statistics

## Support

If you encounter issues:
1. Check Firebase Console logs
2. Verify all Cloud Functions deployed successfully
3. Test with the test functions first
4. Check student data structure in Firestore
5. Verify EMAIL_APP_PASSWORD secret is configured
