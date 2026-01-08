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
