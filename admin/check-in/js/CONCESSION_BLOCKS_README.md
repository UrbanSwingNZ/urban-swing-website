# Concession Blocks Module

This module has been split into smaller, focused files for better maintainability and organization.

## File Structure

### `concession-blocks-balance.js`
**Purpose:** Calculate and update student concession balances
- `updateStudentBalance(studentId)` - Recalculate total and expired balances

**Dependencies:** None (but used by most other modules)

### `concession-blocks-create.js`
**Purpose:** Create new concession blocks
- `createConcessionBlock(...)` - Create a new block with custom document ID

**Dependencies:** 
- `concession-blocks-balance.js` (calls `updateStudentBalance`)
- Requires `findStudentById` and `getStudentFullName` from parent context

### `concession-blocks-query.js`
**Purpose:** Query and retrieve concession blocks
- `getNextAvailableBlock(studentId, allowExpired)` - Get next usable block (FIFO)
- `getStudentBlocks(studentId)` - Get all blocks for a student

**Dependencies:** None

### `concession-blocks-usage.js`
**Purpose:** Use and restore block entries
- `useBlockEntry(blockId)` - Decrement remaining quantity
- `restoreBlockEntry(blockId)` - Increment remaining quantity (e.g., when deleting check-in)

**Dependencies:**
- `concession-blocks-balance.js` (calls `updateStudentBalance`)

### `concession-blocks-lock.js`
**Purpose:** Lock and unlock blocks
- `lockConcessionBlock(blockId)` - Prevent use of a block
- `unlockConcessionBlock(blockId)` - Allow use of a block
- `lockAllExpiredBlocks(studentId)` - Bulk lock all expired blocks for a student

**Dependencies:** None

### `concession-blocks-delete.js`
**Purpose:** Delete concession blocks
- `deleteConcessionBlock(blockId)` - Delete an unlocked block

**Dependencies:**
- `concession-blocks-balance.js` (calls `updateStudentBalance`)

### `concession-blocks-maintenance.js`
**Purpose:** Background maintenance tasks
- `markExpiredBlocks()` - Mark active blocks as expired (should run periodically)

**Dependencies:**
- `concession-blocks-balance.js` (calls `updateStudentBalance`)

## Load Order

Files should be loaded in this order:
1. `concession-blocks-balance.js` (used by many others)
2. All other files (no dependencies between them)

## Migration Notes

The original monolithic `concession-blocks.js` file has been replaced. Update your HTML to load the new modular files:

```html
<!-- Old (deprecated) -->
<script src="js/concession-blocks.js"></script>

<!-- New (modular) -->
<script src="js/concession-blocks-balance.js"></script>
<script src="js/concession-blocks-create.js"></script>
<script src="js/concession-blocks-query.js"></script>
<script src="js/concession-blocks-usage.js"></script>
<script src="js/concession-blocks-lock.js"></script>
<script src="js/concession-blocks-delete.js"></script>
<script src="js/concession-blocks-maintenance.js"></script>
```

## Benefits

- **Better organization:** Each file has a single, clear responsibility
- **Easier maintenance:** Find and modify specific functionality quickly
- **Reduced cognitive load:** Smaller files are easier to understand
- **Selective loading:** Only load what you need (future optimization)
- **Better collaboration:** Reduce merge conflicts when multiple devs work on different features
