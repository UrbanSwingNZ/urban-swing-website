# Troubleshooting Play Button & Recent Updates

## Changes Made

### 1. ✅ Fixed: Refresh Persistence
**Problem:** Every refresh showed "Select a playlist" screen  
**Solution:** Now saves the last viewed playlist to localStorage and auto-restores it on page load

**Files Modified:**
- `playlist-operations.js` - Saves playlist ID on selection, restores on load

### 2. ✅ Added: Full Playback Support (Spotify Web Playback SDK)
**New Feature:** Can now play full tracks (requires Spotify Premium)  
**Scopes Added:** `streaming`, `user-modify-playback-state`, `user-read-currently-playing`

**Files Modified:**
- `spotify-config.js` - Added required scopes for playback
- `index.html` - Added Spotify Web Playback SDK script

### 3. 🔍 Investigating: Play Button Not Showing

## Why Play Button Might Not Be Showing

### Check #1: Preview URL in API Response
The play button only appears if the track has a `preview_url`. 

**To check:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Load a playlist
4. Look for log message: "Sample track data: ..."
5. Check if `hasPreviewUrl: true` and `previewUrl` has a value

**If `hasPreviewUrl: false`:**
- The track doesn't have a preview available (some tracks don't)
- This is normal for: local files, some new releases, region-restricted content
- Try a different playlist with popular songs

### Check #2: API Request Including preview_url
The API request should include `preview_url` in the fields parameter.

**To verify:**
1. Open DevTools → Network tab
2. Filter by "playlists"
3. Look for request to Spotify API
4. Check the URL contains: `preview_url` in the fields parameter

**Current API request should include:**
```
fields=tracks(items(track(id,name,artists,duration_ms,uri,album(images),explicit,preview_url)),next,total)
```

### Check #3: CSS Visibility
The play button is hidden by default and shows on hover.

**To test:**
1. Hover over a track row
2. Button should fade in (opacity: 0 → 1)

**If you don't see it even on hover:**
- Check browser console for CSS errors
- Try adding this temporary CSS to make it always visible:
```css
.track-play-btn {
  opacity: 1 !important;
}
```

### Check #4: JavaScript Errors
Check browser console for any JavaScript errors that might prevent the button from rendering.

## Quick Test

### Option A: Test with Preview URLs
1. Open DevTools Console
2. Run this command after loading a playlist:
```javascript
// Check first track's preview URL
const firstTrack = document.querySelector('#tracks-list tr');
console.log('Track element:', firstTrack);
console.log('Play button:', firstTrack?.querySelector('.track-play-btn'));
```

### Option B: Force Show All Play Buttons (Debug Mode)
Temporarily modify the code to show buttons regardless of preview_url:

In `track-operations.js`, change:
```javascript
${track.preview_url ? `
  <button class="track-play-btn" ...>
` : ''}
```

To:
```javascript
<button class="track-play-btn" data-preview-url="${track.preview_url || 'none'}" data-track-id="${track.id}" title="Play preview">
  <i class="fas fa-play"></i>
</button>
```

This will show buttons for all tracks (even without previews) so you can see if it's a visibility issue.

## What To Try

1. **Refresh with new scopes:**
   - The scopes have changed
   - Disconnect from Spotify
   - Click "Connect Spotify" again
   - Re-authorize with new permissions

2. **Check specific playlist:**
   - Try a playlist with popular/mainstream tracks
   - These are more likely to have preview URLs

3. **Check console logs:**
   - Look for the "Sample track data" log
   - Share that output if you're still having issues

4. **Try incognito/private mode:**
   - Rules out browser extension conflicts

## Full Playback (Spotify Web Playback SDK)

**Requirements:**
- ✅ Spotify Premium account (required for Web Playback SDK)
- ✅ New scopes added (`streaming`, etc.)
- ⏳ Need to reconnect to get new permissions
- ⏳ Need to initialize the player (can add this next)

**Benefits over 30-second previews:**
- Play full tracks
- Control playback (play, pause, skip, volume)
- Queue management
- See what's currently playing

**Would you like me to implement the full Spotify Web Playback SDK player?** (It's more complex but gives you full playback control)

## Next Steps

1. **First:** Let's get the preview buttons working
   - Check console logs
   - Try disconnecting/reconnecting
   - Test with a popular playlist

2. **Then:** Decide if you want to implement full playback
   - Requires Premium account
   - More complex but much more powerful

Let me know what you see in the console and we'll debug from there!
