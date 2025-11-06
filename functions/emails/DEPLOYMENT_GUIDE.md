# Deployment Guide - Email Functions Update

## Pre-Deployment Checklist ✅

- [x] Code changes verified
- [x] No syntax errors
- [x] Email templates updated
- [x] Error handling added
- [x] Documentation created
- [x] Logic flow confirmed

---

## Changes Summary

### Modified Files:
1. **`functions/emails/new-student-emails.js`**
   - Added Student Portal section to welcome email
   - Added "Access Student Portal" button

2. **`functions/index.js`**
   - Added error notification to `sendAccountSetupEmail` function

### New Documentation:
- `EMAIL_FLOW_SANITY_CHECK.md` - Testing scenarios
- `EMAIL_FLOW_DIAGRAM.md` - Visual flow diagrams
- `SANITY_CHECK_COMPLETE.md` - Complete verification summary
- `DEPLOYMENT_GUIDE.md` - This file

---

## Deployment Steps

### Step 1: Verify Current State
Check what functions are currently deployed:

```powershell
firebase functions:list
```

Expected output should show:
- `sendNewStudentEmail` (v2)
- `sendAccountSetupEmail` (v2)
- `syncBPM` (v2)
- `exchangeSpotifyToken` (v1)
- `refreshSpotifyToken` (v1)

---

### Step 2: Deploy Updated Functions

**Deploy the new student email function:**
```powershell
firebase deploy --only functions:sendNewStudentEmail
```

Wait for completion, then:

**Deploy the account setup email function:**
```powershell
firebase deploy --only functions:sendAccountSetupEmail
```

**⚠️ IMPORTANT**: Deploy functions individually to avoid v1/v2 conflicts with Spotify functions!

---

### Step 3: Verify Deployment

Check Firebase Console:
1. Go to: https://console.firebase.google.com/project/directed-curve-447204-j4/functions
2. Verify both functions show recent deployment timestamp
3. Check logs for any deployment errors

---

## Post-Deployment Testing

### Test 1: New Student Registration
1. Go to: https://urbanswing.co.nz/register.html
2. Register with a NEW email (not in database)
3. **Expected Results**:
   - ✅ Welcome email received by student
   - ✅ Email contains "Your Student Portal" section
   - ✅ Email has two buttons (Class Schedule + Portal)
   - ✅ Admin notification received at dance@urbanswing.co.nz
4. Check Firebase logs for confirmation

---

### Test 2: Existing Student Portal Setup
1. Use an existing student email (in students collection, created >5 mins ago)
2. Go to: https://urbanswing.co.nz/student-portal/register.html
3. Create portal account
4. **Expected Results**:
   - ✅ Account setup email received by student
   - ✅ NO email sent to dance@urbanswing.co.nz
5. Check Firebase logs to confirm 5-minute check worked

---

### Test 3: Error Handling (Optional)
1. Temporarily disable a casual rate in Admin Tools
2. Try registering a new student
3. **Expected Results**:
   - ✅ Error email sent to dance@urbanswing.co.nz
   - ✅ Error email contains proper details
4. Re-enable the rate and verify normal flow resumes

---

## Rollback Plan (If Needed)

If issues occur, you can rollback to previous version:

```powershell
# List previous versions
firebase functions:log

# Rollback to previous deployment
# (use Firebase Console UI for easier rollback)
```

Or redeploy from a previous commit:
```powershell
git log --oneline
git checkout <previous-commit>
firebase deploy --only functions:sendNewStudentEmail,functions:sendAccountSetupEmail
git checkout main
```

---

## Monitoring

### Check Function Logs
```powershell
# View recent logs for new student email
firebase functions:log --only sendNewStudentEmail

# View recent logs for account setup email
firebase functions:log --only sendAccountSetupEmail
```

### Firebase Console
Monitor in real-time:
https://console.firebase.google.com/project/directed-curve-447204-j4/functions/logs

---

## Success Criteria

Deployment is successful when:
- ✅ Both functions deploy without errors
- ✅ New student registration sends welcome email with portal info
- ✅ New student registration sends admin notification
- ✅ Existing student portal setup sends account setup email only
- ✅ No admin notification for existing student portal setups
- ✅ Error notifications work for both scenarios
- ✅ No duplicate emails in edge cases

---

## Support

If issues arise:
1. Check Firebase Functions logs
2. Verify Firestore casualRates and concessionPackages are active
3. Check email credentials are valid
4. Review error notification emails sent to dance@urbanswing.co.nz

---

## Timeline

- **Pre-deployment**: 10 minutes (verification)
- **Deployment**: 5-10 minutes (2 functions)
- **Testing**: 15-20 minutes (all scenarios)
- **Total**: ~35-40 minutes

---

**Status**: Ready for deployment  
**Risk Level**: LOW (isolated changes, no breaking changes)  
**Date**: November 2, 2025

---

## Quick Deploy Commands

```powershell
# Deploy both functions
firebase deploy --only functions:sendNewStudentEmail
firebase deploy --only functions:sendAccountSetupEmail

# Check logs after deployment
firebase functions:log --only sendNewStudentEmail
firebase functions:log --only sendAccountSetupEmail
```

✅ You're ready to deploy!
