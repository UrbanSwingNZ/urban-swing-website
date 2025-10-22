# Concession Types Manager - Modular Structure

This directory contains the refactored modular JavaScript files for the Concession Types Manager.

## File Organization

### Core Modules

1. **auth.js**
   - Authentication state management
   - User login/logout handling
   - Auto-logout on inactivity (30 minutes)
   - Page initialization

2. **package-display.js**
   - Load packages from Firestore
   - Create package cards with drag handles and status toggles
   - Display package details (classes, price, per-class cost)
   - Handle empty/error states

3. **modal-handlers.js**
   - Modal state management
   - Edit package functionality
   - Update package (edit mode handler)
   - Delete confirmation and execution
   - Save handler override for add/edit modes

4. **drag-drop.js**
   - Drag and drop event handlers
   - Package reordering
   - Display order persistence to Firestore
   - Visual feedback during drag operations

5. **status-toggle.js**
   - Active/inactive package status toggling
   - Real-time UI updates
   - Success/error feedback

6. **utils.js**
   - Shared utility functions
   - Loading spinner control
   - Status message display
   - HTML escaping

## Load Order

The modules must be loaded in the following order in `concession-types.html`:

```html
<script src="concession-types/utils.js"></script>
<script src="concession-types/drag-drop.js"></script>
<script src="concession-types/status-toggle.js"></script>
<script src="concession-types/package-display.js"></script>
<script src="concession-types/modal-handlers.js"></script>
<script src="concession-types/auth.js"></script>
```

## Dependencies

- Firebase (Firestore, Auth)
- `concessions-admin.js` - Provides `initializeAddConcessionModal()` and `openAddConcessionModal()`
- Font Awesome icons
- Admin CSS stylesheets

## Key Features

- **Modular Design**: Each file handles a specific concern
- **Clear Separation**: Authentication, display, interaction, and persistence are separated
- **Maintainable**: Smaller files are easier to debug and update
- **Reusable**: Utility functions can be shared across modules
- **Testable**: Individual modules can be tested in isolation

## Global State

The following variables are shared across modules:
- `currentUser` - Current authenticated user
- `editingPackageId` - ID of package being edited (null in add mode)
- `packageToDelete` - ID of package pending deletion
- `draggedElement` - Currently dragged package card

## Function Dependencies

### package-display.js depends on:
- `setupDragListeners()` from drag-drop.js
- `handleStatusToggle()` from status-toggle.js
- `escapeHtml()` from utils.js

### modal-handlers.js depends on:
- `loadPackages()` from package-display.js
- `showStatusMessage()` from utils.js
- `initializeAddConcessionModal()` from concessions-admin.js
- `openAddConcessionModal()` from concessions-admin.js

### auth.js depends on:
- `loadPackages()` from package-display.js
- `setupModalHandlers()` from modal-handlers.js
- `overrideHandleSaveConcession()` from modal-handlers.js
- `showLoading()`, `showError()` from utils.js

## Original File

The original monolithic file `concession-types.js` (620+ lines) has been replaced by this modular structure for better maintainability.
