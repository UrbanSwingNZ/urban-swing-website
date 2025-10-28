# Concessions Module

This module has been refactored into smaller, focused files for better maintainability.

## Files

### concessions-data.js
- `getStudentConcessionBlocks(studentId)` - Fetches concession blocks from Firestore
- `calculateConcessionStats(blocks)` - Calculates statistics and sorts blocks by expiry date

### concessions-display.js
- `getConcessionBadgeHTML(stats)` - Generates badge HTML for table display
- `updateStudentConcessionBadge(studentId)` - Updates badge in the student table

### concessions-detail-modal.js
- `showConcessionsDetail(studentId)` - Opens and populates the detail modal
- `buildConcessionSection()` - Builds HTML for active/expired sections
- `buildConcessionItem()` - Builds HTML for individual concession blocks
- `buildLockButton()` - Generates lock/unlock button HTML
- `buildDeleteButton()` - Generates delete button HTML
- `attachConcessionDetailEventListeners()` - Attaches event handlers
- `closeConcessionsDetailModal()` - Closes the modal
- `initializePurchaseConcessionsButton()` - Initializes purchase button

### concessions-actions.js
- `formatDate(date)` - Formats dates for display
- `showDeleteConfirmationModal()` - Shows delete confirmation
- `closeDeleteConfirmationModal()` - Closes delete confirmation

## Load Order

These files must be loaded in the following order in `index.html`:

1. `concessions-data.js` (data fetching and calculations)
2. `concessions-display.js` (badge display, depends on data)
3. `concessions-actions.js` (utilities and actions)
4. `concessions-detail-modal.js` (modal display, depends on all above)

## Dependencies

These modules depend on:
- Firebase Firestore (`db` global)
- Student utility functions (`findStudentById`, `getStudentFullName`, `getStudentsData`)
- Admin utility functions (`isSuperAdmin`, `showSnackbar`)
- Concession block operations (`lockConcessionBlock`, `unlockConcessionBlock`, `deleteConcessionBlock`, `lockAllExpiredBlocks`)
- Modal functions (`closeDeleteModal`)
