# Welcome Email Variations

## Overview
The welcome email sent to new students now dynamically adjusts based on whether the student has a user account (portal access) or not.

---

## Scenario 1a: Student WITH User Account
**Trigger**: Student registers via public form → creates both student AND user documents

### Portal Section Content:

**Heading**: 📱 Your Student Portal

**Description**:
> As a registered student, you now have access to your own Student Portal where you can:

**Feature List**:
- View your class check-in history
- Manage your concession packages
- Purchase new concessions online
- Update your profile information
- View your transaction history

**Buttons**:
- [View Full Class Schedule] (purple)
- [Access Student Portal] (gradient) ← They can login immediately

**Tone**: Direct, assumes they already have access

---

## Scenario 1b: Student WITHOUT User Account
**Trigger**: Admin adds student via admin registration → creates ONLY student document

### Portal Section Content:

**Heading**: 📱 Create Your Student Portal Account

**Introduction**:
> We're excited to introduce our new **Student Portal** – your personal hub for managing everything Urban Swing!

**Highlighted Box** (light blue background, purple border):
> **With your Student Portal account, you can:**
> - View your complete class check-in history
> - Track your concession packages and remaining classes
> - Purchase new concessions online (coming soon!)
> - Update your profile information anytime
> - Review your transaction history

**Call to Action**:
> Creating your account is quick and easy – it only takes a minute! Click the button below to get started and unlock all these features.

**Buttons**:
- [View Full Class Schedule] (purple)
- [Create Portal Account] (gradient) ← Directs to registration page

**Tone**: Inviting, explanatory, emphasizes benefits

---

## Technical Implementation

### Function Logic:
```javascript
// In sendNewStudentEmail function (index.js)
const userDoc = await db.collection('users').doc(studentId).get();
const hasUserAccount = userDoc.exists;

// Pass to email template
const welcomeEmail = generateWelcomeEmail(
  student, 
  casualRate, 
  studentRate, 
  fiveClassPrice, 
  tenClassPrice, 
  hasUserAccount  // ← New parameter
);
```

### Email Template Logic:
```javascript
// In generateWelcomeEmail function (new-student-emails.js)
${hasUserAccount ? `
  <!-- Show "Your Student Portal" section -->
  <h3>Your Student Portal</h3>
  <p>As a registered student, you now have access...</p>
  <button>Access Student Portal</button>
` : `
  <!-- Show "Create Your Portal Account" section -->
  <h3>Create Your Student Portal Account</h3>
  <p>We're excited to introduce our new Student Portal...</p>
  <div class="highlighted-box">Benefits list...</div>
  <p>Creating your account is quick and easy...</p>
  <button>Create Portal Account</button>
`}
```

---

## Testing Guide

### Test Case 1: Admin Registration
1. Use admin interface to add a new student
2. Check student's email
3. **Verify**:
   - ✅ Email has "Create Your Student Portal Account" heading
   - ✅ Email has explanatory paragraph
   - ✅ Email has highlighted benefits box
   - ✅ Button says "Create Portal Account"

### Test Case 2: Public Registration
1. Use public registration form to create new student with password
2. Check student's email
3. **Verify**:
   - ✅ Email has "Your Student Portal" heading
   - ✅ Email says "you now have access"
   - ✅ Simple bullet list of features
   - ✅ Button says "Access Student Portal"

---

## Key Differences Summary

| Element | WITH User Account | WITHOUT User Account |
|---------|-------------------|---------------------|
| **Heading** | "Your Student Portal" | "Create Your Student Portal Account" |
| **Tone** | Direct, present tense | Inviting, promotional |
| **Content** | Simple bullet list | Intro + highlighted box + CTA |
| **Button Text** | "Access Student Portal" | "Create Portal Account" |
| **Assumption** | They can login now | They need to register first |
| **Message Length** | Shorter | Longer (more persuasive) |

---

## Visual Mockup

### WITH Account (Scenario 1a):
```
┌─────────────────────────────────────┐
│ 📱 Your Student Portal              │
│                                     │
│ As a registered student, you now    │
│ have access to your own Student     │
│ Portal where you can:               │
│                                     │
│ • View your class check-in history  │
│ • Manage your concession packages   │
│ • Purchase new concessions online   │
│ • Update your profile information   │
│ • View your transaction history     │
│                                     │
│ [View Class Schedule] [Access Portal]│
└─────────────────────────────────────┘
```

### WITHOUT Account (Scenario 1b):
```
┌─────────────────────────────────────┐
│ 📱 Create Your Student Portal Account│
│                                     │
│ We're excited to introduce our new  │
│ Student Portal – your personal hub  │
│ for managing everything Urban Swing!│
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ With your Student Portal        │ │
│ │ account, you can:               │ │
│ │                                 │ │
│ │ • View your complete class      │ │
│ │   check-in history              │ │
│ │ • Track your concession packages│ │
│ │   and remaining classes         │ │
│ │ • Purchase new concessions      │ │
│ │   online (coming soon!)         │ │
│ │ • Update your profile anytime   │ │
│ │ • Review your transaction       │ │
│ │   history                       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Creating your account is quick and  │
│ easy – it only takes a minute!      │
│                                     │
│ [View Class Schedule] [Create Account]│
└─────────────────────────────────────┘
```

---

**Date**: November 3, 2025  
**Status**: ✅ Implemented and ready for testing
