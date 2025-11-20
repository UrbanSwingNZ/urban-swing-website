# Email Template Variable Reference

## Available Variables

This document lists all variables available in email templates and their properties.

### Student Object Variables

#### `student` - Student object with all details
Object containing complete student information:
- `student.firstName` - Student's first name (e.g., "Sarah")
- `student.lastName` - Student's last name (e.g., "Johnson")
- `student.email` - Student's email address (e.g., "sarah@example.com")
- `student.phoneNumber` - Student's phone number (e.g., "021 123 4567")
- `student.pronouns` - Student's pronouns (e.g., "she/her")
- `student.emailConsent` - Boolean: has consented to emails (true/false)
- `student.adminNotes` - Admin notes about the student

**Example in template:**
```html
<p>Hi ${student.firstName} ${student.lastName}!</p>
<p>We'll contact you at ${student.email}</p>
```

#### `studentId` - Student document ID
Unique identifier for the student document (e.g., "sarah-johnson-abc123")

### User Account Variables

#### `user` - User account object
Available in account-setup emails:
- `user.email` - User's login email

#### `hasUserAccount` - Portal access status
Boolean: `true` if student has portal access, `false` otherwise

**Example:**
```html
${hasUserAccount ? 'Log in to your portal' : 'Create your account'}
```

### Pricing Variables

#### `casualRate` - Single class price
Price for a single casual class entry (e.g., 20)

#### `studentRate` - Student discount rate
Discounted rate for students (e.g., 15)

#### `fiveClassPrice` - 5-class package price
Price for 5-class concession package (e.g., 75)

#### `tenClassPrice` - 10-class package price
Price for 10-class concession package (e.g., 140)

**Example:**
```html
<p>Single class: $${casualRate}</p>
<p>5-class package: $${fiveClassPrice} (save $${casualRate * 5 - fiveClassPrice}!)</p>
```

### Date Variables

#### `registeredAt` - Registration date
Formatted date when student registered (e.g., "15 December 2025, 3:45 PM")

#### `setupDate` - Account setup date
Formatted date when account was created (e.g., "15 December 2025, 3:45 PM")

### Error Notification Variables

#### `error` - Error object
Available in error-notification emails:
- `error.message` - Error message text

**Example:**
```html
<p>An error occurred: ${error.message}</p>
```

## Variable Syntax

### Simple variables
```
${variableName}
```

### Object properties (dot notation)
```
${object.property}
${student.firstName}
${user.email}
```

### Conditional (ternary operator)
```
${condition ? 'value if true' : 'value if false'}
${hasUserAccount ? 'Welcome back!' : 'Create your account'}
```

### Default values (OR operator)
```
${variable || 'default value'}
${student.phoneNumber || 'No phone provided'}
```

### Math expressions
```
${casualRate * 5}
${casualRate * 5 - fiveClassPrice}
```

## Common Patterns

### Full name
```
${student.firstName} ${student.lastName}
```

### Conditional greeting
```
Hi ${student.firstName}${student.pronouns ? ' (' + student.pronouns + ')' : ''}!
```

### Savings calculation
```
Save $${casualRate * 5 - fiveClassPrice} with our 5-class package!
```

### Contact info with fallback
```
Phone: ${student.phoneNumber || 'Not provided'}
```

## Backend Integration

These variables are populated by:
- `functions/email-notifications.js` - Production emails
- `admin/admin-tools/email-templates/modules/firebase/student-operations.js` - Preview/test emails

To add new variables, you must:
1. Update the backend code to provide the variable value
2. Add the variable to your template in the Settings tab
3. Use the variable in your HTML/text template

## Quick Reference Table

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `student` | Object | `${student.firstName}` | Student object with all details |
| `student.firstName` | String | "Sarah" | Student's first name |
| `student.lastName` | String | "Johnson" | Student's last name |
| `student.email` | String | "sarah@example.com" | Student's email |
| `student.phoneNumber` | String | "021 123 4567" | Student's phone number |
| `student.pronouns` | String | "she/her" | Student's pronouns |
| `student.emailConsent` | Boolean | true | Email consent status |
| `student.adminNotes` | String | "Prefers evening classes" | Admin notes |
| `studentId` | String | "sarah-johnson-abc123" | Unique student ID |
| `user.email` | String | "sarah@example.com" | User login email |
| `hasUserAccount` | Boolean | true | Has portal access |
| `casualRate` | Number | 20 | Single class price |
| `studentRate` | Number | 15 | Student discount rate |
| `fiveClassPrice` | Number | 75 | 5-class package price |
| `tenClassPrice` | Number | 140 | 10-class package price |
| `registeredAt` | String | "15 December 2025, 3:45 PM" | Registration date |
| `setupDate` | String | "15 December 2025, 3:45 PM" | Account setup date |
| `error.message` | String | "Pricing not found" | Error message |
