// BPM Service Module
// Fetches and merges BPM data from Firestore songData collection

/**
 * Fetch BPM data for a playlist from Firestore
 * @param {string} playlistId - Spotify playlist ID
 * @returns {Promise<Map<string, object>>} Map of spotifyTrackId -> {bpm, key, trackName, artistName}
 */
export async function fetchBPMData(playlistId) {
  try {
    const songDataRef = db.collection('songData').doc(playlistId);
    const songDataSnap = await songDataRef.get();
    
    if (!songDataSnap.exists) {
      console.log(`No BPM data found for playlist ${playlistId}`);
      return new Map();
    }
    
    const data = songDataSnap.data();
    const bpmMap = new Map();
    
    // Create lookup map by Spotify track ID
    if (data.tracks && Array.isArray(data.tracks)) {
      data.tracks.forEach(track => {
        if (track.spotifyTrackId) {
          bpmMap.set(track.spotifyTrackId, {
            bpm: track.bpm,
            key: track.key,
            trackName: track.trackName,
            artistName: track.artistName,
            position: track.position
          });
        }
      });
    }
    
    console.log(`Loaded BPM data for ${bpmMap.size} tracks from playlist ${playlistId}`);
    return bpmMap;
    
  } catch (error) {
    console.error('Error fetching BPM data:', error);
    return new Map();
  }
}

/**
 * Merge BPM data into track items
 * @param {Array} trackItems - Array of Spotify track items
 * @param {Map} bpmMap - Map of spotifyTrackId -> BPM data
 * @returns {Array} Track items with BPM data merged into audioFeatures
 */
export function mergeBPMData(trackItems, bpmMap) {
  return trackItems.map(item => {
    if (!item.track || !item.track.id) return item;
    
    const bpmData = bpmMap.get(item.track.id);
    
    if (bpmData && bpmData.bpm) {
      // Create or update audioFeatures with BPM data
      return {
        ...item,
        audioFeatures: {
          ...(item.audioFeatures || {}),
          tempo: bpmData.bpm, // Use 'tempo' key to match Spotify's format
          key: bpmData.key,
          source: 'songdata' // Mark where BPM came from
        }
      };
    }
    
    return item;
  });
}

/**
 * Load and merge BPM data for a playlist
 * @param {string} playlistId - Spotify playlist ID
 * @param {Array} trackItems - Array of Spotify track items
 * @returns {Promise<Array>} Track items with BPM data merged
 */
export async function loadAndMergeBPMData(playlistId, trackItems) {
  try {
    const bpmMap = await fetchBPMData(playlistId);
    
    if (bpmMap.size === 0) {
      console.log('No BPM data available for this playlist');
      return trackItems;
    }
    
    const mergedTracks = mergeBPMData(trackItems, bpmMap);
    
    // Count how many tracks got BPM data
    const tracksWithBPM = mergedTracks.filter(item => 
      item.audioFeatures && item.audioFeatures.tempo
    ).length;
    
    console.log(`Merged BPM data: ${tracksWithBPM}/${trackItems.length} tracks`);
    
    return mergedTracks;
    
  } catch (error) {
    console.error('Error loading and merging BPM data:', error);
    return trackItems; // Return original tracks if BPM loading fails
  }
}

/**
 * Copy BPM data for a track from one playlist to another
 * @param {string} trackId - Spotify track ID
 * @param {string} sourcePlaylistId - Source playlist ID
 * @param {string} destPlaylistId - Destination playlist ID
 * @returns {Promise<boolean>} True if BPM data was copied
 */
export async function copyBPMData(trackId, sourcePlaylistId, destPlaylistId) {
  try {
    // Fetch BPM data from source playlist
    const sourceBPMMap = await fetchBPMData(sourcePlaylistId);
    const trackBPMData = sourceBPMMap.get(trackId);
    
    if (!trackBPMData || !trackBPMData.bpm) {
      console.log(`No BPM data found for track ${trackId} in source playlist`);
      return false;
    }
    
    // Get destination playlist's songData document
    const destDocRef = db.collection('songData').doc(destPlaylistId);
    const destDocSnap = await destDocRef.get();
    
    if (!destDocSnap.exists) {
      console.log(`Destination playlist ${destPlaylistId} has no songData document yet`);
      return false;
    }
    
    const destData = destDocSnap.data();
    const destTracks = destData.tracks || [];
    
    // Check if track already exists in destination
    const existingTrackIndex = destTracks.findIndex(t => t.spotifyTrackId === trackId);
    
    if (existingTrackIndex >= 0) {
      // Update existing track's BPM data
      destTracks[existingTrackIndex] = {
        ...destTracks[existingTrackIndex],
        bpm: trackBPMData.bpm,
        key: trackBPMData.key
      };
    } else {
      // Add new track with BPM data
      destTracks.push({
        spotifyTrackId: trackId,
        trackName: trackBPMData.trackName,
        artistName: trackBPMData.artistName,
        bpm: trackBPMData.bpm,
        key: trackBPMData.key,
        position: destTracks.length + 1
      });
    }
    
    // Update destination playlist's songData
    await destDocRef.update({
      tracks: destTracks,
      totalTracks: destTracks.length,
      scrapedAt: new Date().toISOString(),
      scrapedBy: 'copy-track-action'
    });
    
    console.log(`Copied BPM data for track ${trackId} from ${sourcePlaylistId} to ${destPlaylistId}`);
    return true;
    
  } catch (error) {
    console.error('Error copying BPM data:', error);
    return false;
  }
}
