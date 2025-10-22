# Concession Types Manager - Module Architecture

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                     concession-types.html                    │
│                   (HTML Structure & UI)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Config                           │
│                  (firebase-config.js)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Concessions Admin Modal                     │
│                 (concessions-admin.js)                       │
│         Provides: initializeAddConcessionModal()            │
│                   openAddConcessionModal()                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │                                          │
        │         MODULAR COMPONENTS               │
        │                                          │
        └─────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                            ▼
┌──────────────┐                            ┌──────────────┐
│   utils.js   │◄───────────────────────────│   auth.js    │
│              │                            │              │
│ • Loading    │                            │ • Init auth  │
│ • Messages   │                            │ • Logout     │
│ • Escaping   │                            │ • Inactivity │
└──────┬───────┘                            └──────┬───────┘
       │                                           │
       │         ┌─────────────────────────────────┘
       │         │
       ▼         ▼
┌──────────────────────────┐
│   modal-handlers.js      │
│                          │
│ • Edit mode tracking     │
│ • Save override          │
│ • Update package         │
│ • Delete confirmation    │
└──────────┬───────────────┘
           │
           │ calls
           ▼
┌──────────────────────────┐
│  package-display.js      │
│                          │
│ • Load from Firestore    │
│ • Create cards           │
│ • Empty/error states     │
└──────┬──────────┬────────┘
       │          │
       │ uses     │ uses
       ▼          ▼
┌─────────────┐  ┌──────────────────┐
│drag-drop.js │  │status-toggle.js  │
│             │  │                  │
│ • Reorder   │  │ • Active toggle  │
│ • Save order│  │ • Update status  │
└─────────────┘  └──────────────────┘
```

## Data Flow

### Adding a Package
```
User clicks "Add New Package"
        │
        ▼
modal-handlers.js: openAddConcessionModal()
        │
        ▼
concessions-admin.js: Shows modal
        │
        ▼
User fills form and clicks "Create Package"
        │
        ▼
modal-handlers.js: handleSaveConcession() [add mode]
        │
        ▼
concessions-admin.js: Saves to Firestore
        │
        ▼
package-display.js: loadPackages()
        │
        ▼
UI updated with new package
```

### Editing a Package
```
User clicks "Edit" on package card
        │
        ▼
modal-handlers.js: editPackage(id)
        │
        ├─ Load package from Firestore
        ├─ Set editingPackageId
        └─ Pre-fill modal form
        │
        ▼
User modifies and clicks "Update Package"
        │
        ▼
modal-handlers.js: handleSaveConcession() [edit mode]
        │
        ▼
modal-handlers.js: handleUpdatePackage(id)
        │
        ▼
Update Firestore
        │
        ▼
package-display.js: loadPackages()
        │
        ▼
UI refreshed with updated package
```

### Drag and Drop Reordering
```
User drags package card
        │
        ▼
drag-drop.js: handleDragStart/Over/Enter/Leave
        │
        ▼
User drops package in new position
        │
        ▼
drag-drop.js: handleDrop()
        │
        ├─ Reorder DOM elements
        └─ updateDisplayOrders()
        │
        ▼
Batch update Firestore
        │
        ▼
Show success message
```

### Status Toggle
```
User toggles active/inactive switch
        │
        ▼
status-toggle.js: handleStatusToggle(id, isActive)
        │
        ▼
Update Firestore
        │
        ▼
Update card appearance
        │
        ▼
Show success message
```

## Module Size Comparison

```
Original:  concession-types.js         620+ lines  (100%)
──────────────────────────────────────────────────────────
Refactored:
           utils.js                      33 lines   (5%)
           status-toggle.js              55 lines   (9%)
           drag-drop.js                 106 lines  (17%)
           auth.js                      106 lines  (17%)
           package-display.js           155 lines  (25%)
           modal-handlers.js            226 lines  (36%)
           ────────────────────────────────────────
           TOTAL:                       681 lines  (110%)
```

*Note: Total is slightly higher due to module headers, documentation, and reduced code duplication actually improving maintainability*

## Key Architectural Decisions

1. **Bottom-up loading**: Utilities first, then features, finally orchestration (auth.js)
2. **Loose coupling**: Modules communicate through well-defined function calls
3. **Single responsibility**: Each module handles one aspect of functionality
4. **Progressive enhancement**: Features build on utilities
5. **Clear ownership**: Each function lives in exactly one file
6. **Preserved globals**: Shared state variables for cross-module communication
