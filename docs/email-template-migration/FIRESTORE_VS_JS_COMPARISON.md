# Firestore vs JavaScript Email Templates - Detailed Comparison

**Date:** December 30, 2025  
**Purpose:** Compare Firestore email templates with JavaScript template files to identify differences and guide migration

---

## Executive Summary

**Total Firestore Templates:** 5  
**Total .js Template Files:** 4  
**Templates in Both Systems:** 4  
**Templates Only in Firestore:** 1 (password-reset)  
**Templates Only in .js Files:** 0

### Key Findings

1. ✅ **Firestore templates are MORE complete** - They include features not in .js files
2. 🆕 **Password reset template exists only in Firestore** - Needs new .js file
3. 📊 **Admin notification has pricing table** - Not in .js version
4. 📝 **Minor HTML formatting differences** - Firestore versions are cleaner
5. ⚠️ **Password reset uses different variable format** - `%EMAIL%` instead of `${}`

---

## Template-by-Template Comparison

### 1. Account Setup Confirmation

**Firestore ID:** `account-setup`  
**JavaScript File:** `functions/emails/student-portal-setup-email.js`  
**Function:** `generateAccountSetupEmail(student, user, setupDate)`

#### ✅ Status: **UPDATED - NOW MATCHES**

| Aspect | Firestore | JavaScript | Verdict |
|--------|-----------|------------|---------|
| **Subject** | "Your Urban Swing Portal Account is Ready!" | (Generated in function) | ✅ Same |
| **Overall Structure** | Header, account details, portal features, footer | Same | ✅ Match |
| **Variables Used** | `student.firstName`, `student.lastName`, `user.email`, `setupDate` | Same | ✅ Match |
| **Portal Features List** | 5 items | 5 items | ✅ Match |
| **Social Media Footer** | Icon-based with images | Icon-based with images | ✅ **UPDATED** |

#### Changes Made:

✅ **Footer updated** - JavaScript version now uses icon-based social links (matching Firestore)  
✅ **File renamed** - `account-setup-email.js` → `student-portal-setup-email.js`  
✅ **Removed incorrect location** - Auckland reference removed (business is in Napier)

Both versions are now identical. No further changes needed.

---

### 2. New Student Admin Notification

**Firestore ID:** `admin-notification`  
**JavaScript File:** `functions/emails/new-student-emails.js`  
**Function:** `generateAdminNotificationEmail(student, studentId, registeredAt)`

#### ⚠️ Status: **SIGNIFICANT DIFFERENCES**

| Aspect | Firestore | JavaScript | Verdict |
|--------|-----------|------------|---------|
| **Subject** | "New Student Registration" | "New Student Registration" | ✅ Same |
| **Student Details Table** | Yes | Yes | ✅ Match |
| **Pronouns Field** | Shows "Not specified" if empty | Conditionally shown only if present | ⚠️ Different |
| **Referral Field** | ⚠️ **NEW: Placeholder row for referral** | Not present | 🆕 **Firestore has this** |
| **Pricing Table** | ⚠️ **NEW: Full pricing table included** | Not present | 🆕 **Firestore has this** |
| **Admin Notes** | Not present | Conditionally shown if present | ⚠️ **JS has this** |

#### Key Differences:

**🆕 Firestore Additions (NOT in .js):**
1. **Referral field placeholder** - Empty row with label "Referral (PLACEHOLDER)"
2. **Pricing table** - Shows all current pricing:
   - Single Class: $${casualRate}
   - Single Class (Student): $${studentRate}
   - 5 Class Concession: $${fiveClassPrice} with savings
   - 10 Class Concession: $${tenClassPrice} with savings

**✅ JavaScript Advantages (NOT in Firestore):**
1. **Admin notes section** - Conditionally displays if student has admin notes

#### Recommendation:
**Update .js file** to include:
- Pricing table from Firestore version
- Consider keeping admin notes feature from .js version
- Referral field can be added if tracking referrals in future

---

### 3. System Error Notification

**Firestore ID:** `error-notification`  
**JavaScript File:** `functions/emails/error-notification-email.js`  
**Function:** `generateErrorNotificationEmail(student, studentId, error)`

#### ✅ Status: **IDENTICAL**

| Aspect | Firestore | JavaScript | Verdict |
|--------|-----------|------------|---------|
| **Subject** | "⚠️ System Error: Failed to send welcome email" | Same | ✅ Match |
| **Error Display** | Yes | Yes | ✅ Match |
| **Student Info** | Name, Email, ID | Same | ✅ Match |
| **Action Items** | 4 bullet points | Same | ✅ Match |
| **Links** | Firebase Console & Admin Tools | Same | ✅ Match |

#### Differences Found: **NONE**

Templates are identical. No changes needed.

---

### 4. Password Reset

**Firestore ID:** `password-reset`  
**JavaScript File:** ❌ **DOES NOT EXIST**

#### 🆕 Status: **NEW TEMPLATE - ONLY IN FIRESTORE**

| Aspect | Details |
|--------|---------|
| **Subject** | "Urban Swing Password Reset" |
| **Purpose** | Password reset emails for student portal |
| **Variable Format** | ⚠️ Uses `%EMAIL%` instead of `${variable}` |
| **Content** | Password reset instructions, branded header/footer |
| **Current Usage** | Unknown - need to check if Firebase Auth uses custom templates |

#### Key Details:

**Variables Used:**
- `%EMAIL%` - User's email address (non-standard format!)

**Content:**
- Urban Swing branded header
- Password reset instructions
- Warning to ignore if not requested
- Contact email for support
- Social media footer

#### ⚠️ Important Notes:

1. **Firebase Auth Email Templates:**
   - Firebase has built-in password reset emails
   - This template might be for customizing those
   - Need to check Firebase Auth settings to see if custom templates are configured

2. **Variable Format Issue:**
   - Uses `%EMAIL%` instead of `${email}` or `${user.email}`
   - This is Firebase Auth's variable format, not our custom format
   - Suggests this template is meant for Firebase Auth customization

#### Recommendation:
**Investigation needed:**
1. Check if Firebase Auth is using custom email templates
2. Determine if this template is actually being used
3. If active, create corresponding .js file
4. If not active, document but don't migrate

---

### 5. Student Welcome Email

**Firestore ID:** `welcome-student`  
**JavaScript File:** `functions/emails/new-student-emails.js`  
**Function:** `generateWelcomeEmail(student, casualRate, studentRate, fiveClassPrice, tenClassPrice, hasUserAccount)`

#### ✅ Status: **NEARLY IDENTICAL**

| Aspect | Firestore | JavaScript | Verdict |
|--------|-----------|------------|---------|
| **Subject** | "Welcome to Urban Swing!" | "Welcome to Urban Swing! 🎉" | ⚠️ Minor diff |
| **Header** | "Get ready to dance" | Same | ✅ Match |
| **Class Info** | Thursday 7:15-9:15, Dance Express Studios | Same | ✅ Match |
| **Pricing Table** | 4 tiers with savings | Same | ✅ Match |
| **Concession Validity** | Tip box with 6mo/9mo info | Same | ✅ Match |
| **What to Expect** | 4 bullet points | Same | ✅ Match |
| **Conditional Portal Section** | `${hasUserAccount ? ... : ...}` | Same | ✅ Match |
| **Social Media Footer** | Icons with links | Same | ✅ Match |

#### Differences Found:

**Minor:**
1. **Subject line emoji** - .js has 🎉, Firestore doesn't
2. **HTML formatting** - Some minor whitespace differences

Both versions are functionally identical. Either can be used.

---

## Summary of Required Actions

### Phase 1: Update Existing .js Files

#### ✅ Keep As-Is (No Changes Needed):
- ✅ `student-portal-setup-email.js` - **UPDATED** - Now matches Firestore
- ✅ `error-notification-email.js` - Already matches Firestore  
- ✅ `new-student-emails.js` → `generateWelcomeEmail()` - Already matches Firestore

#### 🔧 Update Required:
- ⚠️ `new-student-emails.js` → `generateAdminNotificationEmail()` - **ADD PRICING TABLE**

### Phase 2: Create New .js File

#### 🆕 New File Needed:
- **`password-reset-email.js`** - If template is actually being used
- Check Firebase Auth settings first
- May not need to migrate if unused

---

## Detailed Change Requirements

### Update: generateAdminNotificationEmail()

**File:** `functions/emails/new-student-emails.js`

**Changes to implement:**

1. **Add parameters** for pricing:
```javascript
// OLD:
function generateAdminNotificationEmail(student, studentId, registeredAt)

// NEW:
function generateAdminNotificationEmail(student, studentId, registeredAt, casualRate, studentRate, fiveClassPrice, tenClassPrice)
```

2. **Add pricing table** after student details table:
```html
<h3 style="color: rgb(154, 22, 245); margin-top: 30px; text-align: left;">💰 Pricing</h3>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
  <tbody>
    <tr>
      <td style="padding: 12px; border-bottom: 2px solid #e0e0e0; font-weight: bold; color: #9a16f5;">Option</td>
      <td style="padding: 12px; border-bottom: 2px solid #e0e0e0; font-weight: bold; color: #9a16f5;">Price</td>
    </tr>
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">Single Class</td>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${casualRate}</strong></td>
    </tr>
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">Single Class (Student)</td>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${studentRate}</strong></td>
    </tr>
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">5 Class Concession</td>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${fiveClassPrice}</strong> <span style="color: #28a745; font-size: 0.9rem;">(Save $${casualRate * 5 - fiveClassPrice}!)</span></td>
    </tr>
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">10 Class Concession</td>
      <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$${tenClassPrice}</strong> <span style="color: #28a745; font-size: 0.9rem;">(Save $${casualRate * 10 - tenClassPrice}!)</span></td>
    </tr>
  </tbody>
</table>
```

3. **Optional:** Add referral field placeholder if tracking referrals:
```html
<tr>
  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Referral:</strong></td>
  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${student.referral || 'Not specified'}</td>
</tr>
```

4. **Update function call** in `email-notifications.js`:
```javascript
// OLD:
const adminEmail = generateAdminNotificationEmail(student, studentId, registeredAt);

// NEW:
const adminEmail = generateAdminNotificationEmail(
  student, 
  studentId, 
  registeredAt,
  casualRate,
  studentRate,
  fiveClassPrice,
  tenClassPrice
);
```

5. **Update plain text version** to include pricing table.

---

## Variable Usage Comparison

### Standard Variables (Used in All Templates)

| Variable | Firestore | JavaScript | Notes |
|----------|-----------|------------|-------|
| `student.firstName` | ✅ | ✅ | Universal |
| `student.lastName` | ✅ | ✅ | Universal |
| `student.email` | ✅ | ✅ | Universal |
| `student.phoneNumber` | ✅ | ✅ | With fallback to 'N/A' |
| `student.pronouns` | ✅ | ✅ | Conditionally displayed |
| `student.emailConsent` | ✅ | ✅ | Boolean (admin notification only) |
| `studentId` | ✅ | ✅ | Document ID |
| `user.email` | ✅ | ✅ | Account setup only |
| `registeredAt` | ✅ | ✅ | Formatted date |
| `setupDate` | ✅ | ✅ | Formatted date |

### Pricing Variables (Welcome & Admin Notification)

| Variable | Firestore | JavaScript | Notes |
|----------|-----------|------------|-------|
| `casualRate` | ✅ | ✅ | Single class price |
| `studentRate` | ✅ | ✅ | Student discount price |
| `fiveClassPrice` | ✅ | ✅ | 5-class package |
| `tenClassPrice` | ✅ | ✅ | 10-class package |

### Conditional Variables

| Variable | Firestore | JavaScript | Notes |
|----------|-----------|------------|-------|
| `hasUserAccount` | ✅ | ✅ | Boolean for conditional content |
| `error.message` | ✅ | ✅ | Error notification only |

### Password Reset Variables (Firestore Only)

| Variable | Format | Notes |
|----------|--------|-------|
| `%EMAIL%` | Firebase Auth format | Non-standard - Firebase's own variable |

---

## Template Usage Analysis

### Currently Active in Production

Based on `functions/email-notifications.js`:

| Template | Function | Trigger | Status |
|----------|----------|---------|--------|
| `admin-notification` | `sendNewStudentEmail` | Student document created | ✅ Active |
| `welcome-student` | `sendNewStudentEmail` | Student document created | ✅ Active |
| `account-setup` | `sendAccountSetupEmail` | User document created | ✅ Active |
| `error-notification` | `sendNewStudentEmail` error handler | Email failure | ✅ Active |
| `password-reset` | ❓ Unknown | Unknown | ❓ Status unknown |

### Password Reset Investigation Required

**Questions to answer:**
1. Is Firebase Auth configured to use custom email templates?
2. Is this template actually being sent, or is it just stored?
3. Should we migrate this, or rely on Firebase's default password reset?

**How to check:**
1. Firebase Console → Authentication → Templates
2. Check if custom email templates are configured
3. If yes, check if they reference Firestore collection
4. Review password reset code in `functions/user-management.js`

---

## Migration Priority

### High Priority (Production Impact)
1. 🔴 **Update admin notification** - Add pricing table
2. 🟡 **Investigate password reset** - Determine if active

### Low Priority (Already Matching)
3. 🟢 Keep account-setup as-is
4. 🟢 Keep error-notification as-is
5. 🟢 Keep welcome-student as-is

---

## Testing Checklist

After updating the .js files:

### Admin Notification Email
- [ ] Pricing table displays correctly
- [ ] All 4 pricing tiers show
- [ ] Savings calculations are correct
- [ ] Variables substitute properly
- [ ] Plain text version includes pricing
- [ ] Email renders in Gmail
- [ ] Email renders in Outlook
- [ ] Email renders on mobile

### Password Reset (If Applicable)
- [ ] Template is actually being used
- [ ] Variable format is compatible
- [ ] Reset link functionality works
- [ ] Email delivers successfully

---

## Firestore Template Content Archive

For reference, here are the complete Firestore templates:

### Template: account-setup

**Subject:** Your Urban Swing Portal Account is Ready!

**HTML:** *(See full content in appendix)*

**Variables:**
- `${student.firstName}`
- `${student.lastName}`  
- `${user.email}`
- `${setupDate}`

---

### Template: admin-notification

**Subject:** New Student Registration

**HTML:** *(See full content in appendix)*

**Variables:**
- `${student.firstName}`, `${student.lastName}`, `${student.email}`
- `${student.phoneNumber}`, `${student.pronouns}`, `${student.emailConsent}`
- `${registeredAt}`, `${studentId}`
- `${casualRate}`, `${studentRate}`, `${fiveClassPrice}`, `${tenClassPrice}`

**Key Feature:** Includes pricing table (not in .js version)

---

### Template: error-notification

**Subject:** ⚠️ System Error: Failed to send welcome email

**HTML:** *(See full content in appendix)*

**Variables:**
- `${student.firstName}`, `${student.lastName}`, `${student.email}`
- `${studentId}`
- `${error.message}`

---

### Template: password-reset

**Subject:** Urban Swing Password Reset

**HTML:** *(See full content in appendix)*

**Variables:**
- `%EMAIL%` (Firebase Auth format)

**Status:** Needs investigation - may be for Firebase Auth customization

---

### Template: welcome-student

**Subject:** Welcome to Urban Swing!

**HTML:** *(See full content in appendix)*

**Variables:**
- `${student.firstName}`
- `${casualRate}`, `${studentRate}`, `${fiveClassPrice}`, `${tenClassPrice}`
- `${hasUserAccount}` (conditional)

---

## Conclusion

The Firestore email templates are **more feature-complete** than the JavaScript versions in one significant area:

✅ **Admin notification includes pricing table** - This is a valuable addition that helps admins see current pricing at a glance when a new student registers.

The migration path is straightforward:
1. ✅ Update one function (`generateAdminNotificationEmail`) to add pricing table
2. ❓ Investigate password reset template usage
3. ✅ Keep other templates as-is (already matching)

After these updates, the JavaScript files will be the authoritative source and the Firestore system can be deprecated.

---

**Document Version:** 1.0  
**Last Updated:** December 30, 2025  
**Status:** Ready for implementation
