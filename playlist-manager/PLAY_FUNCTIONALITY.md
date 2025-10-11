# Track Preview Play Functionality

## Overview
Added a play button next to each track that allows users to preview 30-second clips of songs directly in the playlist manager.

## What Was Added

### 1. **Preview URL in Track Data** (`spotify-api.js`)
- Modified `getPlaylistTracks()` to include `preview_url` field in the API request
- This fetches the 30-second preview URL for each track from Spotify

### 2. **Play Button UI** (`track-operations.js`)
- Added a play button (▶️) in the actions column next to each track
- Button only appears when a preview is available
- Button changes to pause (⏸️) when playing
- Play button appears on hover, just like the menu button

### 3. **Audio Player Logic** (`track-operations.js`)
- Implemented `handleTrackPlayPause()` function to manage playback
- Only one track plays at a time (stopping previous track when playing new one)
- Click play to start, click again to pause
- Automatically resets when preview ends
- Gracefully handles tracks without previews or loading errors
- Stops playback when switching playlists

### 4. **Styling** (`playlist-manager.css`)
- Play button styled in Spotify green (#1db954) to match music theme
- Hover effect with slight scale-up animation
- Consistent with existing UI design
- Works in both light and dark modes

## How It Works

1. **User hovers over a track** - Play button appears (if preview available)
2. **User clicks play button** - 30-second preview starts playing
3. **Button changes to pause icon** - User can click again to stop
4. **Preview ends automatically** - Button resets to play icon
5. **User clicks another track's play button** - Previous track stops, new track plays

## Important Notes

### About Spotify Previews
- ✅ **Most tracks have previews** - Spotify provides 30-second clips for the majority of songs
- ❌ **Some tracks don't have previews:**
  - Very new releases
  - Some region-restricted content
  - Local files uploaded by users
  - Certain podcasts or audiobooks
- ⏱️ **Previews are 30 seconds long** - This is a Spotify limitation, not configurable

### Limitations
- **No full-length playback** - Only 30-second previews (Spotify API restriction)
- **No queue functionality** - Plays one track at a time
- **No volume control** - Uses system volume
- **Browser-based only** - Uses HTML5 Audio element

### Future Enhancements (Optional)
If you want more functionality later, you could add:
- Volume slider
- Progress bar showing preview position
- Queue/autoplay next track
- Integration with Spotify Web Playback SDK for full playback (requires Premium)

## Testing

1. Open http://localhost:3000/index.html
2. Connect to Spotify
3. Select a playlist
4. Hover over a track - you should see a green play button
5. Click the play button - preview should start
6. Click another track's play button - first track stops, second starts

## Files Modified

- ✅ `spotify-api.js` - Added preview_url to API request
- ✅ `track-operations.js` - Added play button UI and playback logic
- ✅ `playlist-manager.css` - Added play button styling

---

**Status:** ✅ Complete and ready to use!

**Note:** The BPM feature requires Extended Quota Mode from Spotify (which requires 250k monthly active users or approval). The preview play functionality works immediately with your current setup!
