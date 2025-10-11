# BPM Feature - Troubleshooting Guide

## Overview
The playlist manager can display BPM (tempo) information for tracks using Spotify's Audio Features API. However, there are some common issues that can prevent this from working.

## Current Status
✅ **Code is ready** - The application already attempts to fetch BPM data
⚠️ **403 Errors** - Currently getting "Access Denied" errors

## Common Causes of 403 Errors

### 1. **Stale Authentication Token**
**Most Likely Cause**

After code refactoring or changes, your authentication token may be outdated.

**Solution:**
1. Click "Disconnect" in the playlist manager
2. Clear your browser cache (Ctrl+Shift+Delete)
3. Close and reopen the browser
4. Click "Connect Spotify" again
5. Authorize the application

### 2. **Spotify Developer App Mode**
Your Spotify Developer App needs to be properly configured.

**Check:**
- Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Select your app
- Check if it's in "Development Mode" (allows 25 users)
- Audio Features API should work in both Development and Production mode

### 3. **Private/Local Tracks**
Some tracks don't have audio features available:
- Local files uploaded to Spotify
- Some region-restricted tracks
- Podcast episodes
- Very new releases

**Expected Behavior:**
- These tracks will show "N/A" for BPM
- This is normal and expected

### 4. **Rate Limiting**
Spotify API has rate limits (429 errors):
- Wait a few minutes
- Reload the page
- The app will retry automatically

## How to Verify BPM is Working

### 1. Check Browser Console
Open DevTools (F12) and look for:

**Success indicators:**
```
✓ BPM data available for X/Y tracks
Audio features loaded successfully
```

**Failure indicators:**
```
⚠ No BPM data available for any tracks
403 Forbidden Details: {...}
Could not load audio features
```

### 2. Check the Track Table
- Look at the "BPM" column
- You should see numbers like "120", "140", etc.
- "N/A" is normal for tracks without available data

### 3. Test with a Known Playlist
Try with a popular public playlist:
1. Search for a well-known playlist
2. Open it in the playlist manager
3. Check if BPM values appear

## Current Implementation

### Graceful Degradation ✅
The app is designed to work even if BPM data fails:
- Tracks will still load and display
- BPM column shows "N/A" for unavailable data
- No blocking errors
- Helpful console warnings

### Error Handling ✅
```javascript
// The app tries to get audio features
try {
  audioFeatures = await spotifyAPI.getAudioFeatures(trackIds);
} catch (error) {
  // Fails gracefully - shows N/A instead
  console.warn('BPM not available');
  audioFeatures = [];
}
```

## Testing Steps

### Recommended Approach:
1. **Disconnect & Reconnect**
   ```
   1. Click "Disconnect" button
   2. Clear browser cache
   3. Reconnect to Spotify
   ```

2. **Try a Test Playlist**
   - Create a small test playlist with 3-5 popular songs
   - These should have reliable audio features
   - Check if BPM appears

3. **Check Console Logs**
   - Open DevTools (F12)
   - Look for detailed error messages
   - Note any patterns (all tracks fail vs some fail)

4. **Report Findings**
   - If specific error codes appear, they can help diagnose
   - Screenshot of console errors is helpful

## Next Steps if Still Not Working

### Check Spotify App Configuration
1. Go to Developer Dashboard
2. Check "Edit Settings"
3. Verify Redirect URIs match exactly:
   ```
   http://localhost:8000/playlist-manager/
   http://127.0.0.1:8000/playlist-manager/
   https://urbanswing.nz/playlist-manager/
   ```

### Verify API Access
Test the API directly in browser console:
```javascript
// After authenticating, try:
spotifyAPI.getAudioFeatures(['11dFghVXANMlKmJXsNCbNl'])
  .then(features => console.log('BPM:', features[0]?.tempo))
  .catch(err => console.error('Error:', err));
```

### Alternative: Use Spotify Web Playback
If audio features consistently fail:
1. This might be a Spotify API limitation
2. Consider using a different BPM detection service
3. Or manually add BPM as custom playlist metadata

## Expected Output

### Successful Load:
```
Loading tracks for playlist: 5zE9nZ...
Attempting to load audio features for 15 tracks...
Audio features loaded successfully: [...]
✓ BPM data available for 15/15 tracks
```

### Partial Success (Normal):
```
✓ BPM data available for 12/15 tracks
(Some tracks show N/A - this is expected)
```

### Complete Failure:
```
403 Forbidden Details: {
  endpoint: "/audio-features?ids=...",
  message: "Access denied"
}
⚠ No BPM data available for any tracks
```

## Summary

**Current Changes Made:**
1. ✅ Improved error handling in `spotify-api.js`
2. ✅ Added graceful degradation for failed requests
3. ✅ Better console logging for debugging
4. ✅ Individual track failure handling (nulls for unavailable tracks)

**Action Required:**
1. **Disconnect and reconnect to Spotify** (most important!)
2. Check browser console for detailed error messages
3. Try with a small test playlist of popular songs
4. Report back what errors you see

The code is ready - the issue is most likely authentication-related!
