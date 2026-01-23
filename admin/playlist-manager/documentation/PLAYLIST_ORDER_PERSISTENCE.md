# Playlist Manager - Order Persistence

## Overview
The playlist order persistence feature allows users to save their custom playlist ordering in the sidebar, and have that order sync across all devices where they log in with their Spotify account.

## Data Structure

### Firestore Collection: `playlistPreferences`

**Document ID:** `{spotifyUserId}` (the Spotify user's unique ID)

**Document Fields:**
```
{
  playlistOrder: Array<string>,  // Array of Spotify playlist IDs in user's preferred order
  updatedAt: Timestamp            // Server timestamp of last update
}
```

**Example:**
```json
{
  "playlistOrder": [
    "37i9dQZF1DXcBWIGoYBM5M",
    "5aTQN8eBKYxWzFPdYpq9Cd",
    "1K7nYfZWqLWyKmJzqvzQpj"
  ],
  "updatedAt": "2026-01-23T10:30:00Z"
}
```

## Firestore Security Rules

Add the following rules to your `firestore.rules` file:

```javascript
// Allow users to read and write their own playlist preferences
match /playlistPreferences/{userId} {
  // Anyone can read (since we use Spotify user IDs, not Firebase Auth UIDs)
  allow read: if true;
  
  // Anyone can write (authentication is handled via Spotify OAuth)
  // In production, you may want to add additional auth checks
  allow write: if true;
}
```

**Note:** Since the playlist manager uses Spotify OAuth (not Firebase Auth for users), the security model relies on the Spotify user ID. In a production environment, you may want to add additional authentication layers or use Firebase Auth to link Spotify accounts.

## Migration from localStorage

The implementation includes automatic migration from the old localStorage-based system:
- When a user first loads playlists after the update, the system checks Firestore
- If no Firestore data is found, it checks localStorage
- If localStorage data exists, it's automatically migrated to Firestore
- Future saves go directly to Firestore

## Fallback Behavior

The system includes robust fallback handling:
1. **Primary:** Save to and load from Firestore
2. **Fallback:** If Firestore fails, save to localStorage
3. **Migration:** Automatically migrate from localStorage to Firestore on first load

## Files Modified

1. **firestore-utils.js** (NEW)
   - `savePlaylistOrderToFirestore(spotifyUserId, playlistIds)` - Saves order to Firestore
   - `loadPlaylistOrderFromFirestore(spotifyUserId)` - Loads order from Firestore

2. **playlists/playlist-display.js** (MODIFIED)
   - Updated `savePlaylistOrder()` to use Firestore
   - Updated `restorePlaylistOrder()` to use Firestore
   - Added await for async Firestore calls

## Usage

The feature works automatically:
1. User drags and drops playlists in the sidebar
2. Order is immediately saved to Firestore (under their Spotify user ID)
3. When user logs in from another device, order is restored from Firestore
4. Order persists across browser sessions, logouts, and different devices

## Testing

To test the feature:
1. Log in to the playlist manager
2. Reorder some playlists using drag & drop
3. Check browser console for "Playlist order saved to Firestore" message
4. Reload the page - order should be preserved
5. Log in from a different device/browser - order should be the same
6. Check Firestore console to see the `playlistPreferences` collection with your Spotify user ID

## Future Enhancements

Potential improvements:
- Add Firebase Auth integration for additional security
- Store other user preferences (e.g., theme, default view)
- Add conflict resolution for simultaneous edits from multiple devices
- Add user setting to disable cross-device sync (use localStorage only)
