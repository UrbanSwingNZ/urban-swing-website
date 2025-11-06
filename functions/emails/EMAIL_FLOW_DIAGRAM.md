# Email Flow Summary

## 📧 Email Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCENARIO 1: NEW STUDENT                          │
└─────────────────────────────────────────────────────────────────────┘

    [Register Page]
         │
         ├─ Creates student document
         └─ Creates user document (with password)
         │
         ▼
    [sendNewStudentEmail Trigger]
         │
         ├─ Fetch pricing data
         │
         ├─ Send ADMIN NOTIFICATION ──────────► dance@urbanswing.co.nz
         │    • Student details
         │    • Registration info
         │
         └─ Send WELCOME EMAIL ───────────────► student@email.com
              • Class info & pricing
              • Student Portal section ⭐ NEW
              • Two buttons: Classes + Portal ⭐ NEW
              • Social links
         
         IF ERROR ────────────────────────────► dance@urbanswing.co.nz
              • Error notification email


┌─────────────────────────────────────────────────────────────────────┐
│              SCENARIO 2: EXISTING STUDENT → PORTAL                  │
└─────────────────────────────────────────────────────────────────────┘

    [Student Portal Register Page]
         │
         ├─ Student doc exists (>5 mins old)
         └─ Creates user document
         │
         ▼
    [sendAccountSetupEmail Trigger]
         │
         ├─ Check: Student created <5 mins ago?
         │    └─ NO, continue...
         │
         └─ Send ACCOUNT SETUP ───────────────► student@email.com
              • "Welcome Back" message
              • Account ready confirmation
              • Portal access button
              • What you can do list
         
         NO EMAIL TO ADMIN ❌
         
         IF ERROR ────────────────────────────► dance@urbanswing.co.nz
              • Error notification email ⭐ NEW


┌─────────────────────────────────────────────────────────────────────┐
│         SCENARIO 3: NEW STUDENT + IMMEDIATE PORTAL SETUP            │
│                        (Edge Case)                                  │
└─────────────────────────────────────────────────────────────────────┘

    [Register Page]
         │
         ├─ Creates student document (time: T)
         └─ Creates user document (time: T+30 seconds)
         │
         ├───────────────────────────────┬─────────────────────────────┐
         │                               │                             │
         ▼                               ▼                             ▼
    [sendNewStudentEmail]      [sendAccountSetupEmail]           
         │                               │
         │                               ├─ Check: Student <5 mins?
         │                               │    └─ YES, SKIP! ✓
         │                               │
         │                               └─ No email sent
         │
         ├─ Send ADMIN NOTIFICATION ──► dance@urbanswing.co.nz
         └─ Send WELCOME EMAIL ────────► student@email.com
              (includes portal info)

    Result: Only welcome email sent (no duplicate account setup email)
```

## 📊 Email Matrix

| Scenario | Student Email | Admin Email | Which Function |
|----------|---------------|-------------|----------------|
| **New Student** | ✅ Welcome Email (with portal info) | ✅ Admin Notification | `sendNewStudentEmail` |
| **Existing Student → Portal** | ✅ Account Setup Email | ❌ None | `sendAccountSetupEmail` |
| **New + Immediate Portal** | ✅ Welcome Email (with portal info) | ✅ Admin Notification | `sendNewStudentEmail` (setup skipped) |
| **Any Error** | 🔴 No email | ✅ Error Notification | Both functions |

## 🎯 Key Points

1. **Admin only notified for NEW students**
   - Receives "New Student Registration" email
   - Does NOT receive notification when existing students set up portal

2. **Welcome email now includes portal info**
   - Added "Your Student Portal" section
   - Two buttons: "View Full Class Schedule" + "Access Student Portal"
   - Students can immediately access portal after registration

3. **Account setup email for existing students**
   - Simpler "Welcome Back" message
   - Only sent when student doc is >5 minutes old
   - Confirms their portal account is ready

4. **5-minute safety window**
   - Prevents duplicate emails when both docs created simultaneously
   - `sendAccountSetupEmail` checks student creation time
   - If <5 mins, skips sending (trusts `sendNewStudentEmail` to handle)

5. **Error notifications enhanced**
   - Both functions now send error notifications to admin
   - Admin gets alerted if any email fails
   - Includes student details and error message

## 🔧 Changes Summary

| Component | Change | Status |
|-----------|--------|--------|
| Welcome Email HTML | Added Student Portal section + button | ✅ Complete |
| Welcome Email Text | Added Student Portal section + link | ✅ Complete |
| Account Setup Error Handler | Added error notification to admin | ✅ Complete |
| Email Flow Logic | Verified 5-minute check works correctly | ✅ Verified |
| Admin Notification | Confirmed only sent for new students | ✅ Verified |

---

**Last Updated**: November 2, 2025  
**Status**: ✅ Ready for deployment and testing
