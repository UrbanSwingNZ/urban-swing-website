# Concession Tracking - Next Steps

This document outlines the remaining tasks to complete the concession tracking system.

## ✅ Completed

1. **Core Data Model** - Designed concessionBlocks collection schema
2. **FIFO Logic** - Implemented First-In-First-Out deduction with status priority
3. **Balance Display** - Real-time balance with expired breakdown
4. **Check-in Integration** - Automatic deduction on concession check-in
5. **Module Structure** - Created `concession-blocks.js` with all core functions
6. **Documentation** - Complete specs, testing guide, and implementation docs

## 🔧 Required Setup (Before Testing)

### 1. Create Firestore Indexes

**Priority: HIGH** - System won't work without these

Three composite indexes required for queries. Firebase will prompt with links when you first use the system.

**Action:**
- Run check-in with concession
- Click error link to create index
- Wait 1-2 minutes for build
- Repeat for each index

**Alternative:** Create manually via Console or deploy `firestore.indexes.json`

**Reference:** `docs/FIRESTORE_INDEXES.md`

**Time:** 5-10 minutes

---

### 2. Deploy Security Rules

**Priority: HIGH** - Admin won't have permission to access blocks

Update Firestore rules to allow admin access to `concessionBlocks` collection.

**Action:**
- Add rule for `concessionBlocks` collection
- Publish via Firebase Console or deploy via CLI

**Reference:** `docs/FIRESTORE_SECURITY_RULES.md`

**Time:** 2-3 minutes

---

### 3. Create Test Data

**Priority: HIGH** - Need blocks to test with

Manually create sample concessionBlock documents via Firestore Console.

**Action:**
- Create 2-3 blocks for test student
- Set realistic quantities and dates
- Include one expired block for testing

**Reference:** `docs/CONCESSION_TESTING_GUIDE.md` - Step 3

**Time:** 5-10 minutes per student

---

## 🎯 Immediate Next Tasks

### 1. Test Core Functionality

**Priority: HIGH**

Verify the implemented system works correctly:

- [ ] Balance displays correctly in check-in modal
- [ ] Check-in with concession deducts from oldest block
- [ ] Expired blocks show with "(incl. X expired)" format
- [ ] Depleted status updates when remainingQuantity reaches 0
- [ ] Zero balance disables concession option
- [ ] concessionBlockId stored in check-in documents

**Action:** Follow `docs/CONCESSION_TESTING_GUIDE.md`

**Time:** 30-45 minutes

---

### 2. Build Purchase UI

**Priority: HIGH** - Currently blocks must be created manually

Create admin interface for purchasing concession packages.

**Location:** `admin/concessions/` (existing page) or new modal

**Requirements:**
- Student selection (dropdown or search)
- Package selection (from concessionPackages collection)
- Quantity input (or use package default)
- Payment method (cash, card, bank-transfer)
- Expiry date calculation (based on package terms)
- Notes field (optional)

**Implementation:**
```javascript
async function handlePurchaseSubmit() {
    const studentId = getSelectedStudentId();
    const packageData = getSelectedPackage();
    const quantity = getQuantity(); // Usually from package
    const price = getPrice(); // Usually from package
    const paymentMethod = getPaymentMethod();
    const expiryDate = calculateExpiryDate(packageData.validityDays);
    const notes = getNotes();
    
    const blockId = await createConcessionBlock(
        studentId, 
        packageData, 
        quantity, 
        price, 
        paymentMethod, 
        expiryDate, 
        notes
    );
    
    showSnackbar('Concession package purchased!', 'success');
    // Refresh student list or close modal
}
```

**Files to Create/Edit:**
- `admin/concessions/js/purchase-modal.js` (new)
- `admin/concessions/index.html` (add modal HTML)
- `admin/concessions/css/purchase-modal.css` (optional styling)

**Time Estimate:** 3-4 hours

**Reference:** Look at `checkin-modal.js` structure for modal patterns

---

### 3. Schedule Background Expiry Job

**Priority: MEDIUM** - Not critical, but blocks won't auto-expire without it

Set up automated job to mark expired blocks daily.

**Option A: Firebase Cloud Functions (Recommended)**

1. Set up Cloud Functions project:
   ```bash
   firebase init functions
   ```

2. Create scheduled function:
   ```javascript
   // functions/index.js
   const functions = require('firebase-functions');
   const admin = require('firebase-admin');
   admin.initializeApp();
   
   exports.markExpiredBlocks = functions.pubsub
       .schedule('0 0 * * *') // Daily at midnight
       .timeZone('Pacific/Auckland') // Adjust to your timezone
       .onRun(async (context) => {
           const now = admin.firestore.Timestamp.now();
           
           const snapshot = await admin.firestore()
               .collection('concessionBlocks')
               .where('status', '==', 'active')
               .where('expiryDate', '<=', now)
               .get();
           
           const batch = admin.firestore().batch();
           const affectedStudents = new Set();
           
           snapshot.forEach(doc => {
               batch.update(doc.ref, { status: 'expired' });
               affectedStudents.add(doc.data().studentId);
           });
           
           await batch.commit();
           
           // Update student balances
           for (const studentId of affectedStudents) {
               await updateStudentBalance(studentId);
           }
           
           console.log(`Marked ${snapshot.size} blocks as expired`);
           return null;
       });
   ```

3. Deploy:
   ```bash
   firebase deploy --only functions
   ```

**Option B: Manual Admin Button**

Add button to admin page that calls `markExpiredBlocks()` manually.

**Option C: Client-Side on Load**

Run expiry check when admin page loads (not recommended for production).

**Time Estimate:** 1-2 hours (Cloud Functions setup + testing)

**Cost:** Cloud Functions free tier includes 125,000 invocations/month (more than enough for daily job)

---

## 🚀 Future Enhancements

### 4. Refund/Credit System

**Priority: LOW**

Allow admins to add entries back to a block or create credit blocks.

**Use Cases:**
- Student missed class due to injury
- Class cancelled by studio
- Partial refund for unused entries

**Implementation:**
```javascript
async function refundEntry(blockId, quantity = 1, reason) {
    const blockRef = firebase.firestore().collection('concessionBlocks').doc(blockId);
    const block = await blockRef.get();
    const data = block.data();
    
    const newRemaining = Math.min(
        data.remainingQuantity + quantity,
        data.originalQuantity
    );
    
    await blockRef.update({
        remainingQuantity: newRemaining,
        status: newRemaining > 0 ? 'active' : data.status,
        notes: `${data.notes}\nRefund: +${quantity} entries - ${reason}`
    });
    
    await updateStudentBalance(data.studentId);
}
```

---

### 5. Transfer System

**Priority: LOW**

Transfer unused entries between students (e.g., family members).

**Use Cases:**
- Parent to child
- Between siblings
- Gift to friend

**Implementation:**
```javascript
async function transferEntries(fromStudentId, toStudentId, quantity) {
    // Get block from source student
    const sourceBlock = await getNextAvailableBlock(fromStudentId, false);
    if (!sourceBlock || sourceBlock.remainingQuantity < quantity) {
        throw new Error('Insufficient balance');
    }
    
    // Deduct from source
    await firebase.firestore()
        .collection('concessionBlocks')
        .doc(sourceBlock.id)
        .update({
            remainingQuantity: sourceBlock.remainingQuantity - quantity
        });
    
    // Create new block for recipient
    const recipientStudent = findStudentById(toStudentId);
    await createConcessionBlock(
        toStudentId,
        { id: sourceBlock.packageId, name: sourceBlock.packageName },
        quantity,
        0, // No payment (transfer)
        'transfer',
        sourceBlock.expiryDate,
        `Transferred from ${sourceBlock.studentName}`
    );
    
    // Update both balances
    await updateStudentBalance(fromStudentId);
    await updateStudentBalance(toStudentId);
}
```

---

### 6. Usage Analytics

**Priority: LOW**

Dashboard showing concession usage patterns.

**Metrics:**
- Total blocks sold (by month)
- Average entries per student
- Expiry rate (% of entries that expire unused)
- Revenue from concessions vs casual
- Most popular package sizes
- Active vs expired balance trends

**Implementation:**
- Query `concessionBlocks` and `checkins` collections
- Aggregate data client-side or via Cloud Functions
- Display charts using Chart.js or similar
- Add filters by date range, package type, student

---

### 7. Expiry Warnings

**Priority: LOW**

Notify students when blocks are about to expire.

**Notifications:**
- Email: "Your 10-pack expires in 7 days"
- In-app: Badge on student dashboard
- SMS: For students who opt-in

**Implementation:**
```javascript
// Cloud Function (scheduled daily)
exports.sendExpiryWarnings = functions.pubsub
    .schedule('0 9 * * *') // 9am daily
    .onRun(async (context) => {
        const sevenDaysFromNow = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
        
        const snapshot = await admin.firestore()
            .collection('concessionBlocks')
            .where('status', '==', 'active')
            .where('expiryDate', '<=', sevenDaysFromNow)
            .where('remainingQuantity', '>', 0)
            .get();
        
        // Group by student
        const studentWarnings = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!studentWarnings[data.studentId]) {
                studentWarnings[data.studentId] = [];
            }
            studentWarnings[data.studentId].push({
                packageName: data.packageName,
                remaining: data.remainingQuantity,
                expiryDate: data.expiryDate.toDate()
            });
        });
        
        // Send emails
        for (const [studentId, blocks] of Object.entries(studentWarnings)) {
            await sendExpiryWarningEmail(studentId, blocks);
        }
    });
```

---

### 8. Package Templates

**Priority: LOW**

Predefined package types in `concessionPackages` collection.

**Collection Structure:**
```javascript
{
  id: 'pkg-10pack',
  name: '10-Pack',
  quantity: 10,
  price: 120,
  pricePerEntry: 12, // Calculated: 120/10
  validityDays: 90, // 3 months
  description: 'Best value! 10 entries for $120',
  active: true,
  createdAt: timestamp
}
```

**UI Integration:**
- Dropdown in purchase modal showing all active packages
- Auto-fill quantity and price based on selection
- Calculate expiry date: `purchaseDate + validityDays`

---

### 9. Bulk Purchase

**Priority: LOW**

Purchase multiple blocks at once (e.g., buy 3 x 10-packs).

**Use Case:**
- Prepay for entire year
- Gift packs for multiple students
- Family bulk purchase

**Implementation:**
- Add "Quantity of Packages" field to purchase form
- Loop to create multiple blocks
- Show summary: "Created 3 blocks totaling 30 entries for $360"

---

### 10. Auto-Renewal

**Priority: LOW**

Automatically purchase new block when balance drops below threshold.

**Requirements:**
- Stored payment method (credit card on file)
- Student opt-in to auto-renewal
- Configure package and threshold
- Payment gateway integration (Stripe, etc.)

**Complexity:** HIGH - requires payment processing setup

---

## 📋 Priority Summary

**Do Now (Before First Use):**
1. Create Firestore indexes
2. Deploy security rules
3. Create test data
4. Test core functionality

**Do Next (Week 1):**
5. Build purchase UI (manual block creation is tedious)

**Do Soon (Week 2-3):**
6. Schedule expiry background job

**Do Eventually (Future):**
7. Refund system
8. Transfer system
9. Analytics dashboard
10. Expiry warnings
11. Package templates
12. Bulk purchase
13. Auto-renewal

## 📁 File Checklist

**Already Created:**
- ✅ `js/concession-blocks.js` (core logic)
- ✅ `js/checkin-firestore.js` (updated)
- ✅ `js/checkin-concession-display.js` (updated)
- ✅ `index.html` (updated script tags)
- ✅ `docs/CONCESSION_TRACKING.md` (design spec)
- ✅ `docs/CONCESSION_IMPLEMENTATION.md` (implementation summary)
- ✅ `docs/CONCESSION_TESTING_GUIDE.md` (testing steps)
- ✅ `docs/FIRESTORE_INDEXES.md` (index setup)
- ✅ `docs/FIRESTORE_SECURITY_RULES.md` (security rules)

**To Create:**
- ⏳ `admin/concessions/js/purchase-modal.js` (purchase UI)
- ⏳ `functions/index.js` (expiry background job)
- ⏳ `firestore.indexes.json` (index definitions)
- ⏳ `firestore.rules` (security rules)

**To Update:**
- ⏳ `admin/concessions/index.html` (add purchase modal)

## 🎓 Learning Resources

- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [Composite Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Cloud Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## ✨ Success Metrics

System is fully operational when:
- Admins can purchase concessions via UI (not console)
- Students can check in using concession entries
- Balance displays accurately with expired breakdown
- Blocks auto-expire via scheduled job
- All edge cases tested and working
