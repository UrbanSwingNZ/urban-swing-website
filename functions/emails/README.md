# Email Templates

This directory contains modularized email templates for the Urban Swing Firebase Functions.

## Structure

### `new-student-emails.js`
Contains email templates for new student registrations:

- **`generateAdminNotificationEmail(student, studentId, registeredAt)`**
  - Generates admin notification email when a new student registers
  - Returns: `{ html, text }`
  - Used in: `sendNewStudentEmail` function

- **`generateWelcomeEmail(student, casualRate, studentRate, fiveClassPrice, tenClassPrice)`**
  - Generates welcome email for new students with class info and pricing
  - Returns: `{ html, text }`
  - Used in: `sendNewStudentEmail` function

### `account-setup-email.js`
Contains email template for existing students setting up portal accounts:

- **`generateAccountSetupEmail(student, user, setupDate)`**
  - Generates confirmation email when existing student creates portal account
  - Returns: `{ html, text }`
  - Used in: `sendAccountSetupEmail` function

### `error-notification-email.js`
Contains email template for system error notifications:

- **`generateErrorNotificationEmail(student, studentId, error)`**
  - Generates error notification for admin when email sending fails
  - Returns: `{ html, text }`
  - Used in: `sendNewStudentEmail` error handler

## Usage

Import the required email generators in `index.js`:

```javascript
const { generateAdminNotificationEmail, generateWelcomeEmail } = require('./emails/new-student-emails');
const { generateAccountSetupEmail } = require('./emails/account-setup-email');
const { generateErrorNotificationEmail } = require('./emails/error-notification-email');
```

Generate email content:

```javascript
const adminEmail = generateAdminNotificationEmail(student, studentId, registeredAt);
const welcomeEmail = generateWelcomeEmail(student, casualRate, studentRate, fiveClassPrice, tenClassPrice);
```

Use in nodemailer:

```javascript
await transporter.sendMail({
  from: '"Urban Swing" <dance@urbanswing.co.nz>',
  to: student.email,
  subject: "Welcome to Urban Swing! 🎉",
  text: welcomeEmail.text,
  html: welcomeEmail.html,
});
```

## Benefits

- **Separation of Concerns**: Email templates are separate from business logic
- **Maintainability**: Easy to update email content without touching function code
- **Reusability**: Templates can be reused across different functions
- **Testing**: Templates can be tested independently
- **Readability**: Main function file is cleaner and easier to understand

## Email Types

1. **Admin Notification** - Sent to admin when new student registers
2. **Welcome Email** - Sent to new students with class info and pricing
3. **Account Setup** - Sent to existing students who create portal accounts
4. **Error Notification** - Sent to admin when email sending fails
