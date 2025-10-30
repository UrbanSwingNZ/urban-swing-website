# Student Portal Implementation Plan

## Overview
The student portal will allow students to create accounts, login, view their transaction history, check-in history, concession balances, and purchase concessions or pre-pay for classes. New students must pre-pay for their first class during registration.

## Key Design Decisions

### Authentication
- **Method**: Firebase Authentication with email/password
- **Social Auth**: Can be added later with minimal changes
- **Username**: Email address
- **Password Reset**: Self-service via email link

### User ID Structure
- **Primary Key**: Firebase UID (backend)
- **Display ID**: Human-readable format (e.g., `jsmith-x7k9`) for admin Firestore lookups
- **Not surfaced to students**, only visible in admin view

### Payment Provider
- **To Be Decided**: Stripe vs Windcave
- **Stripe Recommendation**: Better developer experience, Xero integration, modern API
- **Decision Pending**: Further investigation needed

### Firestore Users Collection Structure
```
users/{firebaseUID}/
  - displayId: "jsmith-x7k9" (name-based + random)
  - email: "student@example.com"
  - studentId: "links to existing student database record"
  - createdAt: timestamp
  - role: "student" (vs "admin" for admin view)
```

## Navigation Structure

### New Student Journey
1. Login page → Click "New Student"
2. Registration form with payment
3. Payment processing
4. Account creation (after successful payment)
5. Confirmation/Welcome page
6. Access to full portal

### Existing Student Journey
1. Login page → Click "Existing Student"
2. Login with email/password
3. Dashboard with welcome message
4. Access to all features

### Portal Navigation (All Students)
- **Dashboard** (landing page)
- **Transaction History**
- **My Concessions**
- **Check-In History**
- **Pre-Pay for Class**
- **Profile/Settings**
- **Logout**

## Feature Specifications

### Pre-Payment for Classes
- **Frequency**: One class at a time
- **Date Selection**: Custom date picker
  - Thursdays highlighted in purple
  - Other days greyed out/disabled
  - Summer closedown dates greyed out
  - Limit advance booking (TBD: e.g., 4 weeks)
- **Cancellation Policy**: Manual contact if class cancelled (no automation)
- **No-Show Policy**: Pre-payment is forfeited

### Check-In Integration
When a student pre-pays for a class:
- Create transaction record with payment date
- On check-in day, show in new "Pending Check-Ins" section
- Student appears greyed out with "PRE-PAID" indicator
- Check-in method pre-selected (Casual Entry/Casual Student)
- Payment method pre-selected (EFTPOS/Online/Credit)
- Admin must actively click "Check In" button to complete check-in

### Concession Purchases
- **Quantity**: One block per transaction
- **Multiple Blocks**: Allowed via multiple transactions
- **Deduction Logic**: 
  1. Deduct from block with earliest expiry date
  2. If expiry dates match, use earliest purchase date/time
- **Duplicate Purchases**: Allowed (students can have multiple active blocks)

### Transaction History Display
**Students See:**
- Date
- Purchase Type (Concession Purchase, Casual Entry, etc.)
- Amount
- **NOT** payment method

### Check-In History Display
**Students See:**
- Date
- Check-in Method (Casual/Concession/Free)

### Concessions Display
**Students See:**
- Concession type
- Remaining balance
- Expiry date
- Purchase date

### Email Notifications
**Automated Emails For:**
1. New registration + successful first payment (welcome + receipt)
2. Concession purchase (receipt)
3. Class pre-payment (receipt + confirmation with date)
4. Concession nearly depleted (when balance ≤ 1)
5. Concession expiring soon (7 days before expiry)

### Admin View of Student Portal
- **Access**: Via Admin Tools menu
- **URL**: `/student-portal/admin-view/`
- **Features**:
  - Dropdown to select student
  - Banner: "ADMIN VIEW - Viewing as: [Student Name] ([displayId])"
  - "Back to Admin" button
  - Display student's displayId for Firestore reference
  - All student portal pages mirrored
  - **Partially Functional**: Can update email, view data
  - Payment buttons disabled or clearly marked
  - Same styling as student view

## File Structure

```
student-portal/
├── IMPLEMENTATION_PLAN.md (this file)
├── index.html (login page with New/Existing buttons)
├── new-student/
│   ├── register.html (registration + payment combined)
│   └── confirmation.html (first-time welcome)
├── dashboard/
│   ├── index.html (existing student landing)
│   ├── transactions.html
│   ├── concessions.html
│   ├── check-in-history.html
│   ├── pre-pay.html
│   └── profile.html
├── admin-view/
│   ├── index.html (admin view with student selector)
│   └── [mirrors of all dashboard pages]
├── css/
│   └── student-portal.css
└── js/
    ├── auth.js
    ├── dashboard.js
    ├── payment.js
    └── date-picker.js
```

## Implementation Phases

### **Phase 1: Foundation & Authentication** 🔐
**Goal**: Get the basic portal structure working with authentication

**Tasks:**
1. Create file structure for student portal
2. Build login page (`index.html`)
   - New Student button
   - Existing Student button/form
3. Create dashboard landing pages
   - New student confirmation page
   - Existing student welcome/dashboard
4. Set up Firebase Authentication
   - Email/password configuration
   - Create `users` collection in Firestore
   - Implement user registration flow
   - Implement login flow
   - Password reset functionality
5. Create registration page (based on `register.html`)
   - Student details form
   - Form validation
   - **Mock payment section** (non-functional, clearly marked)
   - Create Firebase user after "payment"
   - Link to student database
6. Build basic navigation structure
   - Header with nav buttons
   - Consistent styling with existing app
   - Logout functionality
7. Implement Firestore security rules
   - Students can only access their own data
   - Admin role permissions

**Deliverable**: Working login/registration system (no payment), basic portal structure

---

### **Phase 2: Read-Only Student Data Views** 👀
**Goal**: Let students see their existing data

**Tasks:**
1. **Transaction History Page**
   - Fetch student's financial transactions from Firestore
   - Display: Date, Purchase Type, Amount
   - Sort by date (newest first)
   - Empty state handling

2. **Check-In History Page**
   - Fetch student's check-in records
   - Display: Date, Check-in Method
   - Sort by date (newest first)
   - Empty state handling

3. **Concessions Page (View Only)**
   - Display active concessions
   - Show: Type, Balance, Expiry Date, Purchase Date
   - Empty state handling
   - Mock "Purchase Concessions" button (disabled)

4. **Profile Page**
   - Display student information
   - Email address
   - Basic details from student database
   - Change password functionality
   - Mock "Edit" buttons for other fields

**Deliverable**: Students can view all their existing data

---

### **Phase 3: Admin View of Student Portal** 👨‍💼
**Goal**: Let admin see what students see

**Tasks:**
1. Create admin access point in Admin Tools
2. Build admin view landing page
   - Student selection dropdown
   - Clear "ADMIN VIEW" banner
   - Display selected student's displayId
   - "Back to Admin" button
3. Create mirrored views of all student pages
   - Filter all data by selected student
   - Disable payment buttons
   - Enable email update functionality
4. Test admin view with multiple student accounts

**Deliverable**: Functional admin view of student portal

---

### **Phase 4: Custom Date Picker** 📅
**Goal**: Create Thursday-focused date picker for class pre-payment

**Tasks:**
1. Design custom date picker component
   - Calendar UI layout
   - Month/year navigation
2. Implement Thursday highlighting
   - Thursdays in purple
   - Other days greyed out/disabled
3. Integrate class schedule system
   - Fetch Thursday class dates
   - Load summer closedown dates
   - Grey out unavailable dates
4. Set advance booking limit
5. Style to match app design
6. Test responsiveness and edge cases

**Deliverable**: Working date picker component

---

### **Phase 5: Payment Integration** 💳
**Goal**: Enable actual payments (after provider chosen)

**Tasks:**
1. **Payment Provider Setup**
   - Create account (Stripe or Windcave)
   - Get API keys (test and production)
   - Set up Firebase Cloud Functions for server-side processing
   - Configure webhooks

2. **New Student Registration with Payment**
   - Remove mock payment section
   - Integrate real payment form
   - Multi-step flow:
     - Step 1: Student details
     - Step 2: Payment type selection (Casual class + date OR Concession)
     - Step 3: Payment processing
   - Create user account only after successful payment
   - Handle payment failures gracefully
   - Send confirmation email with receipt

3. **Pre-Pay for Casual Class (Existing Students)**
   - Create pre-pay page
   - Integrate date picker
   - Payment form
   - Create transaction record
   - Send receipt email

4. **Purchase Concessions**
   - Create concessions purchase page
   - Display available concession types
   - Select quantity (limit 1 block per transaction)
   - Payment processing
   - Create/update concession record in Firestore
   - Send receipt email

**Deliverable**: Full payment functionality for all transaction types

---

### **Phase 6: Check-In Integration** ✅
**Goal**: Make pre-payments visible in admin check-in system

**Tasks:**
1. **Pre-Payment Detection**
   - Query for students who pre-paid for today's class
   - Create "Pending Check-Ins" section in check-in page
   - Display pre-paid students with badge

2. **Check-In Modal Enhancement**
   - Detect if student has pre-paid
   - Pre-select check-in method (Casual Entry/Casual Student)
   - Pre-select payment method (Online/Credit)
   - Show "PRE-PAID" badge
   - Grey out student until admin clicks "Check In"
   - Keep regular flow for non-pre-paid students

3. **Transaction Date Handling**
   - Ensure transactions show payment date (not check-in date)
   - Update transaction views to handle multi-date transactions
   - Test "Today's Transactions" view with pre-paid entries

4. **Add payment method options**
   - Add "Online" or "Credit" to payment method dropdown
   - Update transaction records to store this

**Deliverable**: Seamless check-in experience for pre-paid students

---

### **Phase 7: Email Notifications** 📧
**Goal**: Automated email confirmations

**Tasks:**
1. **Email Service Setup**
   - Choose email service (Firebase Extensions, SendGrid, etc.)
   - Configure API keys
   - Set up email templates

2. **Create Email Templates**
   - Welcome email (new registration)
   - Receipt template (all purchases)
   - Concession low balance warning
   - Concession expiring soon warning
   - Brand styling to match app

3. **Implement Triggers**
   - New registration + first payment success
   - Concession purchase
   - Class pre-payment
   - Concession balance ≤ 1 (automated check)
   - Concession expiry within 7 days (automated check)

4. **Test Email Delivery**
   - Test all triggers
   - Verify email content
   - Check spam folder issues

**Deliverable**: Automated email system for all key events

---

### **Phase 8: Logic Refinements** 🔧
**Goal**: Handle edge cases and complex business logic

**Tasks:**
1. **Concession Deduction Logic**
   - Implement priority system:
     1. Earliest expiry date
     2. If tied, earliest purchase date/time
   - Prevent negative balances
   - Handle multiple concurrent concessions
   - Add logging for troubleshooting

2. **Payment Method Consistency**
   - Ensure "Online/Credit" used for pre-paid check-ins
   - Update all transaction records consistently
   - Audit existing payment method values

3. **Data Validation**
   - Prevent duplicate concurrent purchases
   - Validate date selections (no past dates)
   - Validate concession purchases (prevent negative values)
   - Handle expired concessions appropriately

4. **Error Handling**
   - Payment failures
   - Network errors
   - Invalid form submissions
   - Expired sessions

**Deliverable**: Robust system handling all edge cases

---

### **Phase 9: Testing & Refinement** 🧪
**Goal**: Ensure everything works smoothly

**Tasks:**
1. **User Flow Testing**
   - Complete new student registration journey
   - Complete existing student login journey
   - Test all navigation paths
   - Verify data accuracy across all views
   - Test admin view functionality

2. **Edge Case Testing**
   - Multiple active concessions
   - Expired concessions
   - Pre-payment then no-show
   - Password reset flow
   - Concurrent transactions
   - Same expiry dates on multiple blocks

3. **Security Testing**
   - Verify Firestore rules prevent unauthorized access
   - Test that students can only see their own data
   - Verify admin permissions work correctly
   - Test for XSS, CSRF vulnerabilities

4. **Performance Testing**
   - Load time for transaction history with many records
   - Date picker performance
   - Large student database queries

5. **User Acceptance Testing**
   - Test with real users (if possible)
   - Gather feedback
   - Refine UX based on feedback

**Deliverable**: Production-ready student portal (desktop version)

---

### **Phase 10: Mobile Optimization** 📱
**Goal**: Make it work beautifully on mobile (after desktop is solid)

**Tasks:**
1. **Responsive Design Implementation**
   - Adapt layouts for mobile screens
   - Stack elements appropriately
   - Adjust font sizes
   - Optimize spacing

2. **Touch-Friendly UI**
   - Larger buttons for touch targets
   - Swipe gestures (if appropriate)
   - Mobile-optimized forms

3. **Mobile Date Picker**
   - Optimize for small screens
   - Touch-friendly navigation
   - Consider native date picker options

4. **Testing on Real Devices**
   - Test on iOS (Safari)
   - Test on Android (Chrome)
   - Test various screen sizes
   - Verify all functionality works

5. **Performance Optimization**
   - Minimize loading times
   - Optimize images
   - Lazy loading where appropriate

**Deliverable**: Fully responsive student portal

---

## Deferred Features

These features are noted for future implementation but not part of the initial build:

- **Xero Integration**: Automatic invoice generation (implement after payment system is stable)
- **Upcoming Classes Calendar**: Visual calendar view of available classes
- **Waitlist Functionality**: Sign up for full classes
- **Referral System**: Bring-a-friend incentives
- **Push Notifications**: Class reminders and updates
- **Data Migration**: Invite existing students to create accounts (handle separately)
- **Social Authentication**: Google, Facebook login (easy to add later)

## Weekly Breakdown (Suggested)

### Week 1: Phase 1 - File Structure & Static UI
- Create directory structure
- Build login page (HTML/CSS only)
- Create dashboard pages (static HTML)
- Apply consistent styling

### Week 2: Phase 1 - Authentication
- Set up Firebase Authentication
- Implement login/logout
- Create users collection structure
- Test authentication flow

### Week 3: Phase 1 - Registration
- Build registration form
- Implement form validation
- Create account creation flow
- Link to student database
- Add mock payment section

### Week 4: Phase 2 - Read-Only Views
- Transaction history page
- Check-in history page
- Concessions view page
- Profile page with password change

### Week 5: Phase 3 - Admin View
- Build admin view structure
- Implement student selector
- Mirror all student pages
- Test with multiple accounts

### Week 6: Phase 4 - Date Picker
- Build custom date picker
- Implement Thursday highlighting
- Integrate closedown dates
- Test and refine

### Week 7-8: Phase 5 - Payment Integration
- Set up payment provider
- Integrate into registration
- Build pre-pay page
- Build concession purchase page
- Test extensively

### Week 9: Phase 6 - Check-In Integration
- Add pre-payment detection
- Enhance check-in modal
- Update transaction handling
- Test with admin system

### Week 10: Phase 7 - Email Notifications
- Set up email service
- Create templates
- Implement triggers
- Test delivery

### Week 11: Phase 8 - Logic Refinements
- Implement concession deduction logic
- Add validation
- Error handling
- Edge case testing

### Week 12: Phase 9 - Testing
- Comprehensive testing
- Bug fixes
- User acceptance testing
- Final refinements

### Week 13+: Phase 10 - Mobile
- Responsive design
- Mobile testing
- Performance optimization
- Launch!

## Technical Considerations

### Security
- All Firestore reads/writes protected by security rules
- Students can only access their own data
- Admin role properly enforced
- Payment processing server-side only (never client-side)
- PCI compliance handled by payment provider

### Data Integrity
- Atomic transactions for payment + account creation
- Rollback on payment failure
- Validation on all inputs
- Prevent race conditions with Firestore transactions

### Performance
- Index Firestore queries appropriately
- Lazy load transaction history if needed
- Cache user data where appropriate
- Optimize image assets

### Browser Compatibility
- Target modern browsers (Chrome, Firefox, Safari, Edge)
- Test on both Windows and Mac
- Mobile browsers (iOS Safari, Chrome Android)

## Success Metrics

- **Adoption Rate**: % of new students who use portal for first registration
- **Usage Rate**: % of existing students who create accounts
- **Pre-Payment Rate**: % of casual students who pre-pay online
- **Error Rate**: Track payment failures, login issues
- **Support Tickets**: Reduction in manual registration/payment handling

## Notes

- **Start Small**: Build incrementally, test thoroughly at each phase
- **Desktop First**: Mobile optimization comes after desktop is stable
- **Payment Provider**: Decision pending further investigation of Stripe vs Windcave
- **Styling**: All pages must match existing app design language
- **User Experience**: Prioritize simplicity and clarity over features
- **Documentation**: Update this plan as requirements evolve

---

**Last Updated**: October 30, 2025
**Status**: Planning Phase
**Next Step**: Begin Phase 1, Week 1 - Create file structure and static UI
