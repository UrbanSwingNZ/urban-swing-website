# BPM Data Integration

## Overview
This document explains how BPM data from the Firestore `songData` collection is integrated into the playlist manager.

## Architecture

### Data Flow
1. User loads a playlist in the playlist manager
2. `loadTracks()` fetches Spotify track metadata
3. `loadAndMergeBPMData()` fetches BPM data from Firestore using playlist ID
4. BPM data is merged into track objects via `spotifyTrackId` matching
5. Tracks display with BPM values in the existing BPM column

### Files Modified

#### ✅ `tracks/bpm-service.js` (NEW)
Service module for fetching and merging BPM data from Firestore.

**Key Functions:**
- `fetchBPMData(playlistId)` - Fetches songData document from Firestore
- `mergeBPMData(trackItems, bpmMap)` - Merges BPM into audioFeatures.tempo
- `loadAndMergeBPMData(playlistId, trackItems)` - Combined load + merge operation

**Data Structure:**
```javascript
// Firestore: songData/{playlistId}
{
  playlistId: "3Hfv...",
  playlistName: "Swing Dance Mix",
  tracks: [
    {
      spotifyTrackId: "2x8M...",
      trackName: "In The Mood",
      artistName: "Glenn Miller",
      bpm: "182",
      key: "Ab",
      position: 1
    }
  ]
}

// Merged into track object as:
{
  track: { id: "2x8M...", name: "In The Mood", ... },
  audioFeatures: {
    tempo: 182,  // BPM value
    key: "Ab",
    source: "songdata"
  }
}
```

#### ✅ `tracks/track-loader.js` (MODIFIED)
Updated `loadTracks()` function to fetch and merge BPM data.

**Changes:**
- Added import: `import { loadAndMergeBPMData } from './bpm-service.js'`
- Calls `loadAndMergeBPMData()` after fetching Spotify tracks
- Shows snackbar notification with BPM data count
- Removed old Spotify audio features lazy loading code

**Before:**
```javascript
const currentTracks = trackItems.map(item => ({
  ...item,
  audioFeatures: null // Will be lazy-loaded
}));
```

**After:**
```javascript
const tracksWithBPM = await loadAndMergeBPMData(playlistId, trackItems);
const currentTracks = tracksWithBPM.map(item => ({
  ...item,
  // audioFeatures already contains tempo/BPM from bpm-service
}));
```

#### ℹ️ `tracks/track-renderer.js` (NO CHANGES NEEDED)
Already renders BPM correctly using `features.tempo`:

```javascript
const bpm = features.tempo ? spotifyAPI.formatBPM(features.tempo) : 'N/A';
```

This line now displays:
- BPM value if found in Firestore songData
- "N/A" if no BPM data exists for that track

## How It Works

### 1. Data Collection (Tampermonkey)
Use the songdata.io scraper userscript:
1. Navigate to `https://songdata.io/playlist/{playlistId}`
2. Click the "Extract BPM Data" button
3. Data is saved to `songData/{playlistId}` in Firestore

### 2. Data Display (Playlist Manager)
When loading a playlist:
1. Fetches Spotify track metadata (fast)
2. Fetches BPM data from Firestore (parallel, cached)
3. Merges using `spotifyTrackId` as the key
4. Displays BPM in the existing table column

### 3. Fallback Handling
- If playlist has no songData document → all tracks show "N/A"
- If specific track missing from songData → that track shows "N/A"
- Non-blocking: Failed BPM fetch doesn't prevent playlist loading

## Benefits

✅ **Fast**: Firestore fetch is much faster than 500+ Spotify API calls  
✅ **Reliable**: No deprecated API dependencies  
✅ **Clean**: Reuses existing rendering logic and `formatBPM()` utility  
✅ **Scalable**: BPM data cached in Firestore for reuse  
✅ **User-friendly**: Shows helpful snackbar notifications  

## Testing

### Manual Test
1. Open playlist manager
2. Select a playlist that has been scraped (check Firestore console)
3. Verify BPM values appear in the BPM column
4. Check console for: `Loaded BPM data for X tracks from playlist Y`
5. Verify snackbar shows: `✅ Loaded BPM data for X/Y tracks`

### Edge Cases
- ✅ Playlist with no BPM data → Shows "N/A" with info snackbar
- ✅ Partial BPM data → Shows BPM for matched tracks, "N/A" for others
- ✅ Firestore fetch error → Falls back gracefully, playlist still loads

## Future Enhancements

### Possible Improvements:
1. **Batch scraping**: Add button to scrape multiple playlists
2. **BPM editing**: Allow manual BPM entry/correction in UI
3. **BPM filtering**: Filter tracks by BPM range (e.g., 120-140)
4. **BPM highlighting**: Color-code BPM badges by dance style ranges
5. **Auto-refresh**: Detect stale BPM data and suggest re-scraping

### Data Quality:
- Track matching uses exact `spotifyTrackId` - highly reliable
- BPM accuracy depends on songdata.io quality
- Consider adding `scrapedAt` timestamp check for old data

## Notes

- **No Spotify API calls**: Completely independent of deprecated audio features
- **Performance**: BPM loading adds ~200-500ms (single Firestore read)
- **Persistence**: BPM data persists across sessions (Firestore storage)
- **Security**: Uses existing Firestore rules (authenticated writes)
