# Email Flow Sanity Check

## Expected Behavior

### Scenario 1: Brand New Student Registration
**Conditions**: No student document exists, no user document exists

**Expected Emails**:
1. ✅ **Welcome Email** sent to student (`sendNewStudentEmail` function)
   - Contains class information (time, location)
   - Contains pricing information (casual rates, concession packages)
   - Contains "What to Expect" section
   - **NEW**: Contains Student Portal information section
   - **NEW**: Has TWO buttons:
     - "View Full Class Schedule" → links to classes page
     - "Access Student Portal" → links to student portal
   - Contains social media links in footer

2. ✅ **Admin Notification** sent to dance@urbanswing.co.nz (`sendNewStudentEmail` function)
   - Contains student details (name, email, phone, pronouns)
   - Contains registration date and email consent status
   - Contains student ID
   - Contains admin notes (if any)
   - Contains link to admin database

3. ⚠️ **Error Email** (only if emails fail)
   - Sent to dance@urbanswing.co.nz
   - Contains error details and student information
   - Provides troubleshooting links

**Trigger**: Student document created in `students` collection

---

### Scenario 2: Existing Student Setting Up Portal Account
**Conditions**: Student document exists (created more than 5 minutes ago), user document is being created

**Expected Emails**:
1. ✅ **Account Setup Confirmation** sent to student (`sendAccountSetupEmail` function)
   - Welcome back message
   - Account details (name, email, setup date)
   - "Access Your Portal" button
   - List of what they can do in the portal
   - Social media links in footer

2. ❌ **NO email** sent to dance@urbanswing.co.nz (admin doesn't need notification for portal signups)

3. ⚠️ **Error Email** (only if account setup email fails)
   - Sent to dance@urbanswing.co.nz
   - Contains error details and student information

**Trigger**: User document created in `users` collection (and student was created >5 minutes ago)

---

### Scenario 3: Brand New Student with Portal (Edge Case)
**Conditions**: Both student and user documents created within 5 minutes of each other

**Expected Emails**:
1. ✅ **Welcome Email** sent to student (from `sendNewStudentEmail`)
   - Same as Scenario 1 - includes portal information
   
2. ✅ **Admin Notification** sent to dance@urbanswing.co.nz (from `sendNewStudentEmail`)
   - Same as Scenario 1

3. ❌ **NO Account Setup Email** sent (prevented by 5-minute check in `sendAccountSetupEmail`)

**Logic**: The `sendAccountSetupEmail` function checks if student was created within last 5 minutes. If yes, it skips sending email because `sendNewStudentEmail` already handles it.

---

## Code Logic Flow

### `sendNewStudentEmail` Function
```
Trigger: students/{studentId} document created
↓
Fetch pricing from Firestore (casualRates, concessionPackages)
↓
Generate admin notification email
Generate welcome email (NOW includes portal info)
↓
Send admin notification to dance@urbanswing.co.nz
Send welcome email to student
↓
If error occurs:
  └→ Send error notification to dance@urbanswing.co.nz
```

### `sendAccountSetupEmail` Function
```
Trigger: users/{userId} document created
↓
Fetch student document using user.studentId
↓
Check: Was student created within last 5 minutes?
  ├─ YES → Skip (sendNewStudentEmail handles it)
  └─ NO → Continue
↓
Generate account setup email
↓
Send account setup confirmation to student
↓
If error occurs:
  └→ Send error notification to dance@urbanswing.co.nz
```

---

## Testing Checklist

### Test 1: Brand New Student
- [ ] Create a new student registration (no existing student/user docs)
- [ ] Verify welcome email received by student
- [ ] Verify welcome email contains Student Portal section
- [ ] Verify welcome email has both buttons (Class Schedule + Student Portal)
- [ ] Verify admin notification received by dance@urbanswing.co.nz
- [ ] Verify no duplicate emails sent

### Test 2: Existing Student Portal Setup
- [ ] Use existing student email (created >5 mins ago)
- [ ] Create portal account for existing student
- [ ] Verify account setup email received by student
- [ ] Verify NO email sent to dance@urbanswing.co.nz
- [ ] Verify no welcome email sent (should only get account setup)

### Test 3: Edge Case - New Student with Immediate Portal Setup
- [ ] Create new student and user documents within 5 minutes
- [ ] Verify welcome email received (not account setup email)
- [ ] Verify admin notification received
- [ ] Verify NO account setup email sent
- [ ] Check Firebase logs to confirm 5-minute check worked

### Test 4: Error Handling
- [ ] Temporarily break pricing configuration
- [ ] Attempt new student registration
- [ ] Verify error email sent to dance@urbanswing.co.nz
- [ ] Verify error email contains proper details
- [ ] Fix pricing and verify normal flow resumes

---

## Key Changes Made

1. ✅ Added Student Portal section to welcome email
2. ✅ Added "Access Student Portal" button to welcome email
3. ✅ Added error notification to `sendAccountSetupEmail` function
4. ✅ Confirmed admin notification only sent for NEW students (Scenario 1)
5. ✅ Confirmed NO admin notification for existing students setting up portal (Scenario 2)
6. ✅ 5-minute check prevents duplicate emails in edge case (Scenario 3)

---

## Date
November 2, 2025

## Status
✅ Ready for testing
