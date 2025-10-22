# Check-In System Documentation

## Firestore Data Structure

### Collection: `checkins`

Each check-in creates a **new document** in the `checkins` collection.

#### Document ID Format
```
checkin-YYYY-MM-DD-firstname-lastname
```

**Examples:**
- `checkin-2025-10-16-briar-english`
- `checkin-2025-10-16-alexa-pedersen`
- `checkin-2025-10-09-ange-russell`

**Note:** If the same student checks in multiple times on the same day, only the latest check-in will be stored (the document ID will be the same, so it overwrites).

---

## Document Structure

Each document contains:

```javascript
{
  // Student Information
  studentId: "student-abc123",           // Reference to students collection
  studentName: "Briar English",          // Denormalized for quick display
  
  // Check-In Details
  checkinDate: Timestamp,                // Selected check-in date/time
  entryType: "concession",               // "concession", "casual", or "free"
  
  // Payment Info (for casual entries)
  paymentMethod: "eftpos",               // "cash", "eftpos", "bank-transfer", or null
  amountPaid: 15,                        // 15 for casual, 0 for others
  
  // Free Entry Info (for free entries)
  freeEntryReason: null,                 // "crew-member", "promotion", "special-guest", or null
  
  // Concession Info (for concession entries)
  concessionBlockId: null,               // ID of concession block used (TODO: implement)
  
  // Metadata
  notes: "",                             // Optional admin notes
  createdAt: Timestamp,                  // Server timestamp when created
  createdBy: "admin-uid-456"            // Admin user ID who created it
}
```

---

## Entry Types

### 1. Concession Entry
```javascript
{
  entryType: "concession",
  paymentMethod: null,
  freeEntryReason: null,
  amountPaid: 0,
  concessionBlockId: null  // TODO: Link to actual block
}
```

### 2. Casual Entry ($15)
```javascript
{
  entryType: "casual",
  paymentMethod: "eftpos",  // or "cash", "bank-transfer"
  freeEntryReason: null,
  amountPaid: 15,
  concessionBlockId: null
}
```

### 3. Free Entry
```javascript
{
  entryType: "free",
  paymentMethod: null,
  freeEntryReason: "crew-member",  // or "promotion", "special-guest"
  amountPaid: 0,
  concessionBlockId: null
}
```

---

## Firestore Queries

### Get Today's Check-Ins
```javascript
const today = new Date();
const startOfDay = new Date(today.setHours(0, 0, 0, 0));
const endOfDay = new Date(today.setHours(23, 59, 59, 999));

const snapshot = await firebase.firestore()
  .collection('checkins')
  .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
  .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
  .orderBy('checkinDate', 'desc')
  .get();
```

### Get Student's Check-In History
```javascript
const snapshot = await firebase.firestore()
  .collection('checkins')
  .where('studentId', '==', studentId)
  .orderBy('checkinDate', 'desc')
  .limit(10)
  .get();
```

### Get Check-Ins by Date Range
```javascript
const snapshot = await firebase.firestore()
  .collection('checkins')
  .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(startDate))
  .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(endDate))
  .orderBy('checkinDate', 'desc')
  .get();
```

### Get Check-Ins by Entry Type
```javascript
const snapshot = await firebase.firestore()
  .collection('checkins')
  .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(startDate))
  .where('entryType', '==', 'casual')
  .get();
```

---

## Required Firestore Indexes

The following composite indexes are required for queries:

1. **Date + EntryType**
   - Collection: `checkins`
   - Fields: `checkinDate` (Ascending), `entryType` (Ascending)

2. **Student + Date**
   - Collection: `checkins`
   - Fields: `studentId` (Ascending), `checkinDate` (Descending)

3. **Date Range (default)**
   - Collection: `checkins`
   - Fields: `checkinDate` (Ascending)

---

## Security Rules

```javascript
match /checkins/{checkinId} {
  // Only authenticated admins can read/write check-ins
  allow read, write: if request.auth != null;
}
```

---

## TODO: Future Enhancements

1. **Concession Deduction**
   - Link to `concessionBlocks` collection
   - Deduct from oldest block (FIFO)
   - Update `remainingQuantity` in block
   - Store `concessionBlockId` in check-in document

2. **Balance Display**
   - Show student's remaining concession balance in check-in list
   - Query `concessionBlocks` to calculate current balance

3. **Duplicate Check-In Prevention**
   - Check if student already checked in today
   - Show warning or prevent duplicate
   - Or allow overwrite with confirmation

4. **Transaction Linking**
   - Create entries in `transactions` collection for casual entries
   - Track revenue and payment methods

5. **Analytics**
   - Count check-ins by date range
   - Revenue calculation
   - Entry type distribution
   - Peak attendance times

---

## Implementation Status

✅ **Completed:**
- Document structure defined
- Custom document ID format implemented
- Firestore save logic implemented
- Today's check-ins query implemented
- UI integration complete

⏳ **Pending:**
- Concession block deduction
- Balance tracking and display
- Transaction record creation
- History modal Firestore integration
- Analytics and reporting
