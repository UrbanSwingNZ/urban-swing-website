# Concessions Module

This module has been refactored into smaller, focused files for better maintainability.

## Files

### concessions-data.js
- `getStudentConcessionBlocks(studentId)` - Fetches concession blocks from Firestore
- `calculateConcessionStats(blocks)` - Calculates statistics and categorizes blocks into three states:
  - **Active**: Balance > 0 and not past expiry date
  - **Expired**: Balance > 0 but past expiry date
  - **Depleted**: Balance = 0 (regardless of expiry date)
  - Sorts blocks by expiry date (most recent first)

### concessions-display.js
- `getConcessionBadgeHTML(stats)` - Generates badge HTML for table display
  - Green badge: Only active concessions
  - Red badge: Only expired concessions
  - Orange badge: Mix of active and expired
  - Purchase button: No active or expired (only depleted or none)
- `updateStudentConcessionBadge(studentId)` - Updates badge in the student table

### concessions-detail-modal.js
- `showConcessionsDetail(studentId)` - Opens and populates the detail modal with three accordion sections
- `buildConcessionSection()` - Builds HTML for active/expired/depleted accordion sections
- `buildConcessionItem()` - Builds HTML for individual concession blocks with appropriate styling
- `buildLockButton()` - Generates lock/unlock button HTML (active blocks cannot be locked)
- `buildDeleteButton()` - Generates delete button HTML
- `attachConcessionDetailEventListeners()` - Attaches event handlers including accordion toggle
- `closeConcessionsDetailModal()` - Closes the modal
- `initializePurchaseConcessionsButton()` - Initializes purchase button

### concessions-actions.js
- `formatDate(date)` - Formats dates for display
- `showDeleteConfirmationModal()` - Shows delete confirmation
- `closeDeleteConfirmationModal()` - Closes delete confirmation

## Display States

### Active Concessions
- **Condition**: Balance > 0 AND not past expiry date
- **Display**: Green left border, normal opacity, accordion (expanded by default)
- **Icon**: Check circle (green)
- **Label**: "X entries remaining"

### Expired Concessions
- **Condition**: Balance > 0 AND past expiry date
- **Display**: Red left border, 70% opacity, light red background, accordion (collapsed by default)
- **Icon**: Exclamation circle (red)
- **Label**: "X entries unused"

### Depleted Concessions
- **Condition**: Balance = 0 (regardless of expiry date)
- **Display**: Orange left border, 70% opacity, light orange background, accordion (collapsed by default)
- **Icon**: Battery empty (orange)
- **Label**: "0 entries (all used)"

### Accordion Behavior
- Each section (Active, Expired, Depleted) is displayed as a collapsible accordion
- Active concessions are expanded by default
- Expired and Depleted concessions are collapsed by default
- Click the section header to toggle expand/collapse
- Chevron icon rotates to indicate state

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
