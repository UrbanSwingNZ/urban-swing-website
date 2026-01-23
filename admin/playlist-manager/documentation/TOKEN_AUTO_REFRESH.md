# Spotify Token Auto-Refresh Implementation

## Overview
Implemented a token expiry monitoring system that shows a warning modal 5 minutes before the Spotify access token expires (at the 55-minute mark), allowing the user to refresh the token before it expires.

## Implementation Details

### 1. **Token Storage with Expiration Time** (spotify-api.js)

Modified `setTokens()` to:
- Store expiration as absolute timestamp (`Date.now() + expiresIn * 1000`)
- Dispatch `spotify-token-updated` event when tokens are updated
- Persist both token and expiration time to localStorage

Added `getTimeUntilExpiry()` method:
- Returns milliseconds remaining until token expires
- Used by monitoring logic to determine when to show warning

### 2. **Token Expiry Monitoring** (playlist-manager-new.js)

Added `initializeTokenExpiryMonitoring()`:
- Checks token expiry every 60 seconds using `setInterval`
- Listens for `spotify-token-updated` events
- Automatically starts when app initializes

Added `checkTokenExpiry()`:
- Calculates time remaining until expiry
- Shows warning at 55-minute mark (5 minutes before expiry)
- Auto-disconnects if token fully expires
- Hides warning when not needed

### 3. **Warning Modal UI** (index.html)

Created `token-expiry-warning-modal`:
- Orange warning theme with exclamation icon
- Clear message about token expiring soon
- "Get Fresh Token" button triggers refresh
- Fixed positioning, appears on top of all content

### 4. **Refresh Token Function** (playlist-manager-new.js)

Added `handleRefreshToken()`:
- Calls existing `spotifyAPI.refreshAccessToken()` 
- Shows loading spinner during refresh
- Displays success/error messages
- Dispatches token-updated event on success
- Falls back to disconnect if refresh fails

## Key Features

✅ **Stores expiration as absolute timestamp** - Survives page refreshes
✅ **Monitors every minute** - Lightweight, efficient checking
✅ **Shows warning at 55 minutes** - 5 minutes before expiry
✅ **One-click refresh** - User can renew token without re-authentication
✅ **Auto-disconnect on expiry** - Clean state if token fully expires
✅ **Event-driven updates** - React to token changes immediately
✅ **Persistent across sessions** - Token expiry time saved to localStorage

## User Flow

1. User authenticates with Spotify (token valid for 60 minutes)
2. System monitors token expiry every minute
3. At 55-minute mark, warning modal appears
4. User clicks "Get Fresh Token" button
5. System calls Cloudflare Worker to refresh token using server-side refresh token
6. New token obtained (valid for another 60 minutes)
7. Warning disappears, monitoring continues

## Technical Notes

- Uses existing `refreshAccessToken()` method in spotify-api.js
- Leverages Cloudflare Worker for server-side refresh token storage
- No changes needed to OAuth flow - works with existing authorization code exchange
- Modal uses existing modal styling from the app
- Token refresh happens without page reload or re-authentication

## Testing

To test the implementation:
1. Authenticate with Spotify
2. Check console for token expiry time
3. Manually set `spotifyAPI.tokenExpiry` to `Date.now() + (5 * 60 * 1000)` to simulate near-expiry
4. Wait 1 minute for monitoring cycle
5. Warning modal should appear
6. Click "Get Fresh Token" to test refresh flow

## Future Enhancements

Potential improvements:
- Show countdown timer in modal ("expires in X minutes")
- Add keyboard shortcut (e.g., Escape to dismiss warning)
- Option to auto-refresh without user interaction
- Remember user preference for auto-refresh
