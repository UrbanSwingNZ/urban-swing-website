# Membership System Testing Plan

## Test Environment Setup
- **Mode:** Test Mode (Stripe test keys active)
- **Test Cards:**
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`
  - Requires Authentication: `4000 0025 0000 3155`
  - Insufficient Funds: `4000 0000 0000 9995`
- **CVV:** Any 3 digits (e.g., `123`)
- **Expiry:** Any future date (e.g., `12/28`)
- **ZIP:** Any 5 digits (e.g., `12345`)

---

## Test Suite 1: One-Time Membership Purchase

### Test 1.1: Successful One-Time Membership Purchase
**Objective:** Verify that a student can purchase a one-time membership successfully.

**Steps:**
1. Log into student portal as a test student
2. Navigate to membership purchase page
3. Select a one-time membership option (e.g., Monthly)
4. Enter test card: `4242 4242 4242 4242`
5. Complete purchase

**Expected Results:**
- ✅ Payment processes successfully
- ✅ Success message displayed
- ✅ Membership status changes to "Active"
- ✅ Membership expiry date set to ~30 days from now
- ✅ "Auto-Renew" toggle is OFF
- ✅ Transaction appears in transaction history
- ✅ Receipt available/downloadable
- ✅ Firestore `memberships` collection has new document
- ✅ Firestore `students` document updated with `activeMembershipId`
- ✅ Stripe Dashboard shows successful payment

**Data to Record:**
- Membership ID: _______________
- Transaction ID: _______________
- Expiry Date: _______________

---

### Test 1.2: Declined One-Time Membership Purchase
**Objective:** Verify proper error handling for declined payments.

**Steps:**
1. Log into student portal
2. Navigate to membership purchase page
3. Select a one-time membership
4. Enter decline test card: `4000 0000 0000 0002`
5. Attempt purchase

**Expected Results:**
- ❌ Payment fails with clear error message
- ❌ No membership created
- ❌ No transaction recorded
- ❌ Student's membership status unchanged
- ❌ No charge in Stripe Dashboard

---

### Test 1.3: Multiple One-Time Purchases
**Objective:** Verify behavior when purchasing multiple one-time memberships.

**Steps:**
1. Purchase first one-time membership (Test 1.1)
2. Wait for confirmation
3. Immediately purchase another one-time membership
4. Complete second purchase

**Expected Results:**
- ✅ Second purchase succeeds
- ✅ Original membership replaced/extended (verify business logic)
- ✅ Both transactions recorded
- ✅ Only one active membership at a time
- ✅ Expiry date reflects latest purchase

---

## Test Suite 2: Recurring Membership Purchase

### Test 2.1: Successful Recurring Membership Purchase
**Objective:** Verify that a student can purchase a recurring membership with auto-renewal.

**Steps:**
1. Log into student portal as a test student (preferably different from Test 1)
2. Navigate to membership purchase page
3. Select a recurring membership option
4. Enter test card: `4242 4242 4242 4242`
5. Complete purchase

**Expected Results:**
- ✅ Payment processes successfully
- ✅ Success message displayed
- ✅ Membership status changes to "Active"
- ✅ Membership expiry date set to ~30 days from now
- ✅ "Auto-Renew" toggle is ON by default
- ✅ Stripe subscription created
- ✅ Subscription visible in Stripe Dashboard
- ✅ Transaction appears in transaction history
- ✅ Firestore `memberships` collection has `subscriptionId`
- ✅ Firestore membership has `autoRenew: true`

**Data to Record:**
- Membership ID: _______________
- Subscription ID: _______________
- Transaction ID: _______________
- Expiry Date: _______________
- Current Period End: _______________

---

### Test 2.2: Recurring Membership with Authentication Required
**Objective:** Verify 3D Secure/SCA handling.

**Steps:**
1. Log into student portal
2. Navigate to membership purchase page
3. Select a recurring membership
4. Enter authentication test card: `4000 0025 0000 3155`
5. Complete authentication challenge
6. Complete purchase

**Expected Results:**
- ✅ Payment authentication modal appears
- ✅ After authentication, payment processes
- ✅ Membership created successfully
- ✅ Subscription has authentication status recorded

---

### Test 2.3: Declined Recurring Membership Purchase
**Objective:** Verify error handling for declined recurring payments.

**Steps:**
1. Log into student portal
2. Navigate to membership purchase page
3. Select a recurring membership
4. Enter decline test card: `4000 0000 0000 0002`
5. Attempt purchase

**Expected Results:**
- ❌ Payment fails with clear error message
- ❌ No membership created
- ❌ No subscription created
- ❌ No transaction recorded

---

## Test Suite 3: Auto-Renewal Management

### Test 3.1: Disable Auto-Renewal
**Objective:** Verify that students can disable auto-renewal on recurring memberships.

**Steps:**
1. Use student account from Test 2.1 (with active recurring membership)
2. Navigate to membership management/dashboard
3. Locate "Auto-Renew" toggle
4. Click to disable auto-renewal
5. Confirm the action if prompted

**Expected Results:**
- ✅ Success message displayed
- ✅ Toggle switches to OFF state
- ✅ Firestore membership `autoRenew: false`
- ✅ Stripe subscription updated to `cancel_at_period_end: true`
- ✅ Membership still active until expiry date
- ✅ Expiry date unchanged
- ✅ UI shows "Expires on [date]" instead of "Renews on [date]"

---

### Test 3.2: Re-enable Auto-Renewal
**Objective:** Verify that students can re-enable auto-renewal before expiry.

**Steps:**
1. Continue from Test 3.1 (auto-renewal disabled)
2. Click "Auto-Renew" toggle to re-enable
3. Confirm the action if prompted

**Expected Results:**
- ✅ Success message displayed
- ✅ Toggle switches to ON state
- ✅ Firestore membership `autoRenew: true`
- ✅ Stripe subscription updated to `cancel_at_period_end: false`
- ✅ Membership will now renew at expiry
- ✅ UI shows "Renews on [date]"

---

### Test 3.3: Auto-Renewal on One-Time Membership
**Objective:** Verify that auto-renewal toggle is not available/functional for one-time memberships.

**Steps:**
1. Use student account from Test 1.1 (with one-time membership)
2. Navigate to membership dashboard
3. Look for auto-renewal toggle

**Expected Results:**
- ✅ Auto-renewal toggle is hidden/disabled OR
- ✅ Attempting to toggle shows "Not available for one-time memberships"
- ✅ One-time memberships remain non-renewable

---

## Test Suite 4: Payment Method Updates

### Test 4.1: Update Payment Method (Recurring Membership)
**Objective:** Verify that students can update their payment method for recurring memberships.

**Steps:**
1. Use student account from Test 2.1 (with active recurring membership)
2. Navigate to membership management
3. Click "Update Payment Method" link/button
4. Enter new test card: `5555 5555 5555 4444` (Mastercard)
5. Submit update

**Expected Results:**
- ✅ Success message displayed
- ✅ New card details shown (last 4 digits: 4444)
- ✅ Stripe customer's default payment method updated
- ✅ Stripe subscription's payment method updated
- ✅ Old payment method removed or set as backup

**Note:** Verify in Stripe Dashboard:
- Customer has new payment method attached
- Subscription default_payment_method updated

---

### Test 4.2: Update Payment Method with Invalid Card
**Objective:** Verify validation for invalid card details.

**Steps:**
1. Use student account with recurring membership
2. Navigate to "Update Payment Method"
3. Enter invalid card: `4000 0000 0000 0127` (declined)
4. Attempt to update

**Expected Results:**
- ❌ Error message displayed
- ❌ Payment method not updated
- ❌ Original payment method still active
- ✅ User can retry with different card

---

### Test 4.3: Update Payment Method (One-Time Membership)
**Objective:** Verify behavior when trying to update payment method for non-recurring membership.

**Steps:**
1. Use student account from Test 1.1 (one-time membership)
2. Navigate to membership management
3. Look for "Update Payment Method" option

**Expected Results:**
- ✅ "Update Payment Method" is hidden/disabled OR
- ✅ Message displays "Not applicable for one-time memberships"
- ✅ No payment method stored for one-time purchases

---

## Test Suite 5: Membership Cancellation

### Test 5.1: Cancel Recurring Membership
**Objective:** Verify that students can cancel their recurring membership.

**Steps:**
1. Use student account with active recurring membership
2. Navigate to membership management
3. Click "Cancel Membership" button
4. Confirm cancellation in modal/prompt

**Expected Results:**
- ✅ Confirmation modal appears asking for confirmation
- ✅ After confirmation, success message displayed
- ✅ Membership status changes to "Cancelled" or "Expiring"
- ✅ Auto-renewal disabled
- ✅ Membership remains active until current period end
- ✅ Firestore membership updated with cancellation details
- ✅ Stripe subscription cancelled (`cancel_at_period_end: true`)
- ✅ UI shows "Active until [expiry date]"

---

### Test 5.2: Cancel One-Time Membership
**Objective:** Verify behavior when attempting to cancel a one-time membership.

**Steps:**
1. Use student account with one-time membership
2. Navigate to membership management
3. Look for "Cancel Membership" option

**Expected Results:**
- ✅ Cancel button hidden/disabled OR
- ✅ Message shows "One-time memberships expire automatically"
- ✅ No cancellation needed for non-recurring memberships

---

## Test Suite 6: Membership Expiry

### Test 6.1: Membership Approaching Expiry (Manual Check)
**Objective:** Verify that membership expiry dates are accurate.

**Steps:**
1. Review active membership from Tests 1.1 or 2.1
2. Check expiry date in student portal
3. Check Firestore `membershipExpiryDate`
4. Check Stripe subscription `current_period_end` (if recurring)

**Expected Results:**
- ✅ All dates match
- ✅ Expiry is approximately 30 days from purchase date
- ✅ Date displayed in readable format (e.g., "June 29, 2026")

---

### Test 6.2: Expired Membership Behavior
**Objective:** Verify system behavior when membership expires (requires time manipulation or old test data).

**Steps:**
1. Find/create a student with expired membership OR
2. Manually set a membership's expiry date to yesterday in Firestore
3. Log in as that student
4. Navigate to membership dashboard

**Expected Results:**
- ✅ Membership status shows "Expired"
- ✅ Call-to-action to renew membership
- ✅ Student cannot access members-only features
- ✅ Purchase page allows buying new membership

**Note:** This may require webhook testing or manual database manipulation.

---

## Test Suite 7: Transaction History

### Test 7.1: View Transaction History
**Objective:** Verify that students can view their membership transaction history.

**Steps:**
1. Use student account with at least 2 purchases (Tests 1.1 and 2.1)
2. Navigate to transaction history page
3. Review displayed transactions

**Expected Results:**
- ✅ All membership purchases listed
- ✅ Each transaction shows:
  - Date
  - Amount
  - Membership type
  - Payment status
  - Receipt link (if available)
- ✅ Transactions sorted by date (newest first)
- ✅ Recurring vs one-time clearly indicated

---

### Test 7.2: Download Receipt
**Objective:** Verify that students can access/download receipts.

**Steps:**
1. From transaction history, click receipt link
2. Verify receipt opens/downloads

**Expected Results:**
- ✅ Receipt opens in new tab OR downloads as PDF
- ✅ Receipt contains:
  - Student name
  - Purchase date
  - Amount paid
  - Membership type
  - Transaction/receipt ID
  - Business details

---

## Test Suite 8: Edge Cases & Error Scenarios

### Test 8.1: Purchase While Already Having Active Membership
**Objective:** Verify behavior when purchasing a new membership while one is active.

**Steps:**
1. Use student with active one-time membership (Test 1.1)
2. Attempt to purchase a recurring membership
3. Complete purchase

**Expected Results:**
- ✅ System allows purchase OR shows warning
- ✅ If allowed: old membership replaced/extended
- ✅ Only one active membership exists
- ✅ Clear messaging about what will happen

---

### Test 8.2: Network Interruption During Purchase
**Objective:** Test resilience to connection issues.

**Steps:**
1. Begin membership purchase
2. Open browser DevTools > Network tab
3. Set network to "Offline" after clicking purchase
4. Observe behavior

**Expected Results:**
- ✅ User-friendly error message
- ✅ No duplicate charges
- ✅ User can retry purchase
- ✅ System handles gracefully (no half-completed purchases)

---

### Test 8.3: Insufficient Funds Card
**Objective:** Test handling of insufficient funds.

**Steps:**
1. Navigate to membership purchase
2. Enter test card: `4000 0000 0000 9995`
3. Attempt purchase

**Expected Results:**
- ❌ Payment fails with "Insufficient funds" message
- ❌ No membership created
- ✅ User can try different payment method

---

### Test 8.4: Browser Back Button During Purchase
**Objective:** Test behavior when user navigates away during purchase.

**Steps:**
1. Begin membership purchase process
2. Click browser back button during/after payment submission
3. Return to purchase page

**Expected Results:**
- ✅ No duplicate charges
- ✅ Purchase either completed or cancelled cleanly
- ✅ Clear state indication (success or needs retry)

---

## Test Suite 9: Data Integrity

### Test 9.1: Firestore Data Verification
**Objective:** Verify that all purchases are correctly recorded in Firestore.

**Steps:**
1. After completing Tests 1.1 and 2.1
2. Open Firebase Console > Firestore
3. Check `memberships` collection
4. Check `students` collection
5. Check `transactions` collection

**Expected Results:**
- ✅ `memberships` collection:
  - Correct `studentId`
  - Correct `membershipType`
  - Correct `status` (active)
  - Correct `startDate` and `endDate`
  - Correct `autoRenew` value
  - `subscriptionId` present for recurring
  - Timestamps present
- ✅ `students` document:
  - `activeMembershipId` matches membership document ID
  - `membershipStatus: 'active'`
  - `membershipExpiryDate` correct
- ✅ `transactions` collection:
  - Transaction recorded with correct details
  - Amount, type, status correct

---

### Test 9.2: Stripe Data Verification
**Objective:** Verify that purchases are correctly reflected in Stripe.

**Steps:**
1. After completing all purchases
2. Log into Stripe Dashboard (test mode)
3. Check Payments section
4. Check Subscriptions section (for recurring)
5. Check Customers section

**Expected Results:**
- ✅ All test payments appear in Payments
- ✅ Recurring subscriptions appear in Subscriptions
- ✅ Each student has corresponding Customer record
- ✅ Payment methods attached to correct customers
- ✅ Metadata includes `studentId`, `membershipType`, etc.

---

## Test Suite 10: UI/UX Testing

### Test 10.1: Responsive Design
**Objective:** Verify membership interface works on different devices.

**Steps:**
1. Test membership purchase on:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
2. Use browser DevTools device emulation

**Expected Results:**
- ✅ All elements visible and accessible
- ✅ Forms usable on mobile
- ✅ No horizontal scrolling required
- ✅ Buttons/links easily tappable on mobile
- ✅ Payment forms render correctly on all sizes

---

### Test 10.2: Loading States
**Objective:** Verify that loading indicators work properly.

**Steps:**
1. Begin membership purchase
2. Observe UI during payment processing
3. Test on slower network (throttle in DevTools)

**Expected Results:**
- ✅ Loading spinner/indicator appears during processing
- ✅ Purchase button disabled during processing
- ✅ User cannot submit duplicate requests
- ✅ Loading state persists until completion/error

---

### Test 10.3: Error Message Clarity
**Objective:** Verify that error messages are clear and actionable.

**Steps:**
1. Trigger various errors (declined card, network error, etc.)
2. Read error messages displayed

**Expected Results:**
- ✅ Error messages are clear and non-technical
- ✅ Messages suggest next steps (e.g., "Try a different card")
- ✅ Errors don't expose sensitive system details
- ✅ Errors are visually distinct (red color, icon, etc.)

---

## Test Suite 11: Security Testing

### Test 11.1: Unauthorized Access
**Objective:** Verify that students can only manage their own memberships.

**Steps:**
1. Log in as Student A
2. Note Student A's membership ID
3. Log out and log in as Student B
4. Attempt to access Student A's membership URL directly (if exposed)

**Expected Results:**
- ❌ Student B cannot view/modify Student A's membership
- ✅ Error or redirect occurs
- ✅ Authorization checks enforced server-side

---

### Test 11.2: Payment Security
**Objective:** Verify that card details are handled securely.

**Steps:**
1. During payment form entry, check browser DevTools > Network
2. Review what data is sent to server
3. Check if card details appear in logs

**Expected Results:**
- ✅ Card details tokenized by Stripe (never sent to your server)
- ✅ No sensitive card data in browser console
- ✅ HTTPS used for all requests
- ✅ No card details stored in Firestore

---

## Testing Checklist Summary

### Pre-Testing Setup
- [ ] Stripe in test mode
- [ ] Test cards ready
- [ ] Test student accounts created
- [ ] Firebase Console access available
- [ ] Stripe Dashboard access available

### Test Execution
- [ ] One-time membership purchases (Tests 1.1-1.3)
- [ ] Recurring membership purchases (Tests 2.1-2.3)
- [ ] Auto-renewal management (Tests 3.1-3.3)
- [ ] Payment method updates (Tests 4.1-4.3)
- [ ] Membership cancellation (Tests 5.1-5.2)
- [ ] Membership expiry (Tests 6.1-6.2)
- [ ] Transaction history (Tests 7.1-7.2)
- [ ] Edge cases (Tests 8.1-8.4)
- [ ] Data integrity (Tests 9.1-9.2)
- [ ] UI/UX (Tests 10.1-10.3)
- [ ] Security (Tests 11.1-11.2)

### Post-Testing
- [ ] Document any bugs found
- [ ] Clean up test data if needed
- [ ] Switch Stripe back to live mode
- [ ] Review test results with development team

---

## Notes & Observations

Use this section to record any issues, unexpected behavior, or questions that arise during testing:

**Test 1.1:**
- Issue: _______________________________________________
- Expected: _______________________________________________
- Actual: _______________________________________________

**Test 2.1:**
- Issue: _______________________________________________
- Expected: _______________________________________________
- Actual: _______________________________________________

(Add more as needed)

---

## Critical Bugs / Blockers

List any critical issues that prevent the membership system from going live:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Test Completion Sign-off

- **Tester Name:** _______________________________________________
- **Date Completed:** _______________________________________________
- **Overall Status:** [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS
- **Ready for Production:** [ ] YES [ ] NO [ ] WITH FIXES
