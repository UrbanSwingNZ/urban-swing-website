# Firestore Indexes Required

This document lists all the composite indexes required for the Urban Swing check-in system to function properly.

## Why Indexes Are Needed

Firestore requires composite indexes when queries:
1. Use multiple `where()` clauses on different fields
2. Use `where()` + `orderBy()` on different fields
3. Use multiple `orderBy()` clauses

## Required Indexes

### 1. Concession Blocks - FIFO Query

**Collection:** `concessionBlocks`

**Fields:**
- `studentId` (Ascending)
- `remainingQuantity` (Ascending)
- `status` (Ascending)
- `purchaseDate` (Ascending)

**Used by:** `getNextAvailableBlock()` in `concession-blocks.js`

**Query:**
```javascript
firebase.firestore()
    .collection('concessionBlocks')
    .where('studentId', '==', studentId)
    .where('remainingQuantity', '>', 0)
    .where('status', 'in', ['active', 'expired'])
    .orderBy('status', 'asc')
    .orderBy('purchaseDate', 'asc')
```

**Purpose:** Finds the next concession block to use (FIFO - First In First Out) with active blocks before expired blocks.

---

### 2. Concession Blocks - Expired Status Update

**Collection:** `concessionBlocks`

**Fields:**
- `status` (Ascending)
- `expiryDate` (Ascending)

**Used by:** `markExpiredBlocks()` in `concession-blocks.js`

**Query:**
```javascript
firebase.firestore()
    .collection('concessionBlocks')
    .where('status', '==', 'active')
    .where('expiryDate', '<=', now)
```

**Purpose:** Finds all active blocks that have passed their expiry date (for background job).

---

### 3. Concession Blocks - Student Balance Display

**Collection:** `concessionBlocks`

**Fields:**
- `studentId` (Ascending)
- `remainingQuantity` (Ascending)
- `purchaseDate` (Descending)

**Used by:** `getConcessionData()` in `checkin-concession-display.js`

**Query:**
```javascript
firebase.firestore()
    .collection('concessionBlocks')
    .where('studentId', '==', studentId)
    .where('remainingQuantity', '>', 0)
    .orderBy('remainingQuantity', 'desc')
    .orderBy('status', 'asc')
    .orderBy('purchaseDate', 'asc')
```

**Purpose:** Displays all active/expired blocks for a student with remaining entries.

---

## How to Create Indexes

### Method 1: Automatic Creation (Recommended)

1. Run your application and trigger the queries that need indexes
2. Firebase will show an error in the console with a link to create the index
3. Click the link - it will open Firebase Console with the index pre-configured
4. Click "Create Index" and wait for it to build (usually 1-2 minutes)

**Example Error:**
```
The query requires an index. You can create it here: 
https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes?create_composite=...
```

### Method 2: Manual Creation via Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database → Indexes tab
4. Click "Create Index"
5. Enter the collection name and fields from the specifications above
6. Click "Create" and wait for the index to build

### Method 3: Deploy via firestore.indexes.json

Create or update `firebase/firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "concessionBlocks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "remainingQuantity", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "purchaseDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "concessionBlocks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expiryDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "concessionBlocks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "remainingQuantity", "order": "ASCENDING" },
        { "fieldPath": "purchaseDate", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## Existing Indexes (No Changes Needed)

The following queries should work with single-field indexes (automatically created):

- `checkins` collection queries (by date range, studentId)
- `students` collection queries (by name, email)
- `concessionPackages` collection queries (simple reads)

## Index Build Times

- Simple indexes (2-3 fields): 1-2 minutes
- Complex indexes (4+ fields): 2-5 minutes
- Large collections: May take longer on first build

## Monitoring Index Usage

1. Go to Firebase Console → Firestore → Usage tab
2. View "Reads", "Writes", and "Deletes" metrics
3. Check "Indexes" tab for index health and exemptions

## Testing Indexes

After creating indexes, test with:

1. **Check-in with concession:** Should deduct from oldest active block first
2. **View student balance:** Should display all blocks with correct totals
3. **Expire blocks:** Background job should find and update expired blocks

## Troubleshooting

**"Index not found" error:**
- Click the error link to create the index
- Wait 1-2 minutes for it to build
- Retry the query

**Query still slow after index:**
- Check index status in Firebase Console (should show "Enabled")
- Verify field names match exactly (case-sensitive)
- Check that the query order matches the index definition

**Index creation fails:**
- Ensure you have Owner or Editor role in Firebase project
- Check that collection and field names are correct
- Try creating via Console instead of CLI

## Future Index Considerations

If you add these features, you'll need additional indexes:

- **Date range filtering:** Add `checkinDate` to relevant queries
- **Multi-student reports:** Composite indexes on `studentId` + date
- **Package analytics:** Indexes on `packageId` + status + date
