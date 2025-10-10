# Playlist Manager - Modular Structure

## Overview
The playlist manager has been refactored from a single 1443-line file into 6 focused modules for better maintainability, readability, and separation of concerns.

## File Structure

### 1. **playlist-state.js** (128 lines)
**Purpose:** Centralized state management
- Global state variables (currentPlaylist, allPlaylists, etc.)
- Getter and setter functions for all state
- Single source of truth for application state

**Key exports:**
- State variables and their accessors
- `getCurrentPlaylist()`, `setCurrentPlaylist()`
- `getHasUnsavedChanges()`, `setHasUnsavedChanges()`
- All other state getters/setters

### 2. **playlist-auth.js** (~130 lines)
**Purpose:** Spotify authentication and authorization
- OAuth flow handling
- Token management
- User info loading
- Button state initialization

**Key exports:**
- `handleSpotifyConnect()`
- `handleSpotifyDisconnect()`
- `getAuthCodeFromUrl()`
- `exchangeCodeForTokens()`
- `loadUserInfo()`
- `initializeButtonStates()`

### 3. **playlist-operations.js** (~450 lines)
**Purpose:** Playlist CRUD operations
- Loading and displaying playlists
- Creating new playlists
- Deleting playlists
- Renaming playlists
- Playlist search and filtering
- Playlist menu actions

**Key exports:**
- `loadPlaylists()`, `displayPlaylists()`
- `selectPlaylist()`, `performPlaylistSelection()`
- `openCreatePlaylistModal()`, `handleCreatePlaylist()`
- `handleDeletePlaylist()`, `confirmDeletePlaylist()`
- `openRenamePlaylistModal()`, `handleRenamePlaylist()`
- `showPlaylistMenu()`

### 4. **track-operations.js** (~650 lines)
**Purpose:** Track management and operations
- Loading and displaying tracks
- Drag-and-drop reordering
- Track search and filtering
- Adding/removing tracks
- Track actions (copy, move, delete)
- Save order functionality
- Unsaved changes handling

**Key exports:**
- `loadTracks()`, `displayTracks()`
- `handleTrackSearch()`, `handleToggleExplicit()`
- `initializeDragDrop()`, `handleSaveOrder()`
- `updateSaveOrderButton()`
- `openAddTracksModal()`, `handleAddSelectedTracks()`
- `showTrackMenu()`, `handleConfirmAction()`
- `handleSaveAndContinue()`, `handleDiscardChanges()`

### 5. **playlist-ui.js** (~110 lines)
**Purpose:** UI utilities and helpers
- Loading spinner control
- Snackbar notifications
- Authentication UI states
- Mobile sidebar toggle
- Error/success messages

**Key exports:**
- `showLoading()`, `showSnackbar()`
- `showError()`, `showSuccess()`
- `showConnectPrompt()`, `showAuthenticatedState()`
- `toggleSidebar()`, `closeSidebar()`

### 6. **playlist-manager-new.js** (~160 lines)
**Purpose:** Main coordinator
- Application initialization
- Event listener setup
- Module coordination
- Entry point for the application

**Key functions:**
- `initializeApp()` - Main initialization
- `setupEventListeners()` - Wires up all UI events

## Module Dependencies

```
playlist-manager-new.js (main)
├── playlist-auth.js
│   ├── playlist-ui.js
│   └── track-operations.js
├── playlist-operations.js
│   ├── playlist-state.js
│   ├── playlist-ui.js
│   └── track-operations.js
├── track-operations.js
│   ├── playlist-state.js
│   └── playlist-ui.js
└── playlist-ui.js
    ├── playlist-auth.js
    └── playlist-operations.js

playlist-state.js (no dependencies - pure state)
```

## Benefits of Modular Structure

1. **Better Maintainability**
   - Each file has a single, clear purpose
   - Easier to locate and fix bugs
   - Smaller files are easier to understand

2. **Improved Testability**
   - Modules can be tested independently
   - State management is isolated
   - Functions are more focused

3. **Code Reusability**
   - UI utilities can be reused across features
   - State management is centralized
   - Authentication logic is isolated

4. **Easier Collaboration**
   - Multiple developers can work on different modules
   - Less merge conflicts
   - Clearer code ownership

5. **Better Performance**
   - ES6 modules enable tree-shaking
   - Only load what's needed
   - Better browser caching

## Usage in HTML

The modules are loaded as ES6 modules:

```html
<script type="module" src="playlist-state.js"></script>
<script type="module" src="playlist-ui.js"></script>
<script type="module" src="playlist-auth.js"></script>
<script type="module" src="playlist-operations.js"></script>
<script type="module" src="track-operations.js"></script>
<script type="module" src="playlist-manager-new.js"></script>
```

## Migration Notes

- The original `playlist-manager.js` is preserved for reference
- `playlist-manager-new.js` is the new entry point
- All functionality remains the same - only the structure changed
- No changes needed to HTML/CSS except script tags
- State is now managed through centralized getters/setters

## Future Improvements

1. Consider adding TypeScript for type safety
2. Add unit tests for each module
3. Implement a proper state management library (e.g., Redux)
4. Add JSDoc comments for better IDE support
5. Consider bundling with Webpack/Vite for production
