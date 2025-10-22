# Concession Tracking System

## Overview
This document describes the concession tracking system for Urban Swing, including data models, business logic, and implementation details.

## Data Model

### 1. ConcessionBlocks Collection

Each document represents a single concession purchase/block.

**Document ID:** Auto-generated

**Fields:**
- `studentId` (string) - Reference to student document ID
- `studentName` (string) - Denormalized for display/reporting
- `packageId` (string) - Reference to concession package
- `packageName` (string) - Denormalized package name
- `originalQuantity` (number) - Initial number of entries purchased
- `remainingQuantity` (number) - Current number of entries left
- `purchaseDate` (timestamp) - When the block was purchased
- `expiryDate` (timestamp) - When the block expires (nullable)
- `status` (string) - 'active', 'expired', or 'depleted'
- `price` (number) - Amount paid for this block
- `paymentMethod` (string) - 'cash', 'bank-transfer', 'eftpos', 'online'
- `transactionId` (string) - Reference to transaction document (nullable)
- `createdAt` (timestamp) - Server timestamp
- `createdBy` (string) - Admin user ID who created the block
- `notes` (string) - Optional notes

**Status Values:**
- `active` - Block is valid, not expired, has remaining quantity
- `expired` - Block has passed expiry date but may still have remaining quantity
- `depleted` - Block has 0 remaining quantity (fully used)

### 2. Students Collection - Balance Fields

Added to existing student documents:

- `concessionBalance` (number) - Total entries available (includes expired)
- `expiredConcessions` (number) - Number of expired entries in balance

**Calculation:**
```javascript
concessionBalance = sum of all blocks where remainingQuantity > 0
expiredConcessions = sum of blocks where remainingQuantity > 0 AND status = 'expired'
```

### 3. Checkins Collection - Concession Reference

Updated field:
- `concessionBlockId` (string) - ID of the block used for this check-in (nullable)

## Business Logic

### Purchase Concession Block

1. Create new document in `concessionBlocks` collection
2. Set `status = 'active'`
3. Set `remainingQuantity = originalQuantity`
4. Calculate `expiryDate` based on package (e.g., 3 months from purchase)
5. Update student's `concessionBalance` and `expiredConcessions` fields
6. Optional: Create transaction record

### Check-In with Concession (FIFO)

1. Query student's blocks where `remainingQuantity > 0`
2. Filter by `status`:
   - Default: Only `status = 'active'` (no expired)
   - Optional: Include `status IN ['active', 'expired']` (allow expired)
3. Order by:
   - Primary: `status` (active first)
   - Secondary: `purchaseDate` (oldest first - FIFO)
4. Select the first block
5. Decrement `remainingQuantity` by 1
6. If `remainingQuantity` reaches 0, set `status = 'depleted'`
7. Store `concessionBlockId` in check-in document
8. Update student's balance fields

### Update Block Status (Background Job)

Run periodically (e.g., daily) to update expired blocks:

1. Query blocks where `status = 'active'` AND `expiryDate < now()`
2. Update each to `status = 'expired'`
3. Update affected students' `expiredConcessions` fields

### Calculate Student Balance

Function to recalculate balance from blocks (for consistency checks):

```javascript
async function recalculateStudentBalance(studentId) {
  const blocks = await firestore()
    .collection('concessionBlocks')
    .where('studentId', '==', studentId)
    .where('remainingQuantity', '>', 0)
    .get();
  
  let totalBalance = 0;
  let expiredBalance = 0;
  
  blocks.forEach(doc => {
    const data = doc.data();
    totalBalance += data.remainingQuantity;
    if (data.status === 'expired') {
      expiredBalance += data.remainingQuantity;
    }
  });
  
  await firestore()
    .collection('students')
    .doc(studentId)
    .update({
      concessionBalance: totalBalance,
      expiredConcessions: expiredBalance
    });
}
```

## UI Display

### Check-In Modal - Balance Display

```
Balance: 15 entries (incl. 3 expired)
```

**Variations:**
- No expired: `Balance: 15 entries`
- All expired: `Balance: 3 entries (all expired)`
- No balance: `No concessions available`

### Concession Block List

When displaying a student's blocks, show:
- Package name
- Remaining quantity / Original quantity
- Purchase date
- Expiry date (if applicable)
- Status badge (active/expired/depleted)

## Firestore Indexes Required

### Composite Indexes:

1. **Check-in query (FIFO with active first):**
   - Collection: `concessionBlocks`
   - Fields: `studentId` (Ascending), `remainingQuantity` (Ascending), `status` (Ascending), `purchaseDate` (Ascending)

2. **Expired block detection:**
   - Collection: `concessionBlocks`
   - Fields: `status` (Ascending), `expiryDate` (Ascending)

3. **Student balance calculation:**
   - Collection: `concessionBlocks`
   - Fields: `studentId` (Ascending), `remainingQuantity` (Ascending)

## Security Rules

```javascript
match /concessionBlocks/{blockId} {
  // Only authenticated admins can read/write
  allow read, write: if request.auth != null && request.auth.token.admin == true;
}
```

## TODO / Future Enhancements

- [ ] Implement background job to auto-expire blocks
- [ ] Add refund/cancel functionality for unused blocks
- [ ] Add transfer functionality to move entries between students
- [ ] Add reporting for concession usage analytics
- [ ] Implement warnings when blocks are close to expiry
- [ ] Add bulk purchase functionality for multiple blocks
