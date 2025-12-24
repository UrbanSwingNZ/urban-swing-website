// Track Loader Module
// Handles track loading, audio features, and BPM data

import * as State from '../playlist-state.js';
import { showLoading, showError, showSnackbar } from '../playlist-ui.js';
import { displayTracks } from './track-renderer.js';
import { initializeDragDrop } from './track-drag-drop.js';
import { stopCurrentAudio } from './track-audio.js';
import { formatTotalDuration } from './track-utils.js';

// ========================================
// PERFORMANCE CONFIGURATION
// ========================================

// BPM Loading: DISABLED by default due to Spotify API limitations
// Spotify's batch endpoint fails, causing 500+ individual requests (very slow!)
// Enable only if you want BPM data (will add ~250s load time for 500 tracks)
// TODO: Replace with third-party BPM service (see todo #2)
const SKIP_BPM_LOADING = true;

// ========================================
// TRACK LOADING
// ========================================

export async function loadTracks(playlistId) {
  showLoading(true);
  
  // Stop any currently playing audio
  stopCurrentAudio();
  
  // Clean up any existing lazy load observers
  const tracksContainer = document.querySelector('.tracks-container');
  if (tracksContainer && tracksContainer._lazyLoadCleanup) {
    tracksContainer._lazyLoadCleanup();
  }
  
  try {
    // Get all tracks (fast - just metadata)
    const trackItems = await spotifyAPI.getAllPlaylistTracks(playlistId);
    
    // Store tracks WITHOUT audio features first for immediate display
    const currentTracks = trackItems.map(item => ({
      ...item,
      audioFeatures: null // Will be lazy-loaded
    }));
    
    State.setCurrentTracks(currentTracks);
    State.setFilteredTracks([...currentTracks]);
    
    // Calculate total duration
    const totalMs = currentTracks.reduce((sum, item) => {
      return sum + (item.track?.duration_ms || 0);
    }, 0);
    const formattedDuration = formatTotalDuration(totalMs);
    document.getElementById('playlist-duration').textContent = formattedDuration;
    
    // Update header track count with actual loaded track count
    const headerTrackCount = document.getElementById('playlist-track-count');
    if (headerTrackCount) {
      headerTrackCount.textContent = currentTracks.length;
    }
    
    // Update sidebar track count and duration with actual loaded data
    setTimeout(() => {
      // Update desktop sidebar (in playlist list)
      const playlistItem = document.querySelector(`.playlists-list [data-playlist-id="${playlistId}"]`);
      if (playlistItem) {
        const countEl = playlistItem.querySelector('.playlist-item-count');
        if (countEl) {
          countEl.innerHTML = `${currentTracks.length} tracks • <span class="playlist-item-duration">${formattedDuration}</span>`;
        }
      }
      
      // Update mobile playlist selector (if visible)
      const mobilePlaylistItem = document.querySelector(`.mobile-playlists-list [data-playlist-id="${playlistId}"]`);
      if (mobilePlaylistItem) {
        const mobileCountEl = mobilePlaylistItem.querySelector('.playlist-tracks');
        if (mobileCountEl) {
          mobileCountEl.innerHTML = `${currentTracks.length} tracks • <span class="playlist-item-duration">${formattedDuration}</span>`;
        }
      }
    }, 100);
    
    // Display tracks immediately (progressive rendering)
    displayTracks(State.getFilteredTracks());
    initializeDragDrop();
    
    showLoading(false);
    
    // Show performance mode notification
    if (SKIP_BPM_LOADING && currentTracks.length > 100) {
      showSnackbar('⚡ Performance mode: BPM data disabled for faster loading', 'success');
    }
    
    // Lazy load audio features ONLY for rendered tracks (not all tracks)
    // This prevents the 600+ request problem
    if (!SKIP_BPM_LOADING) {
      lazyLoadAudioFeaturesForRenderedTracks();
    }
    
  } catch (error) {
    console.error('Error loading tracks:', error);
    showError('Failed to load tracks. ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Lazy load audio features ONLY for currently rendered tracks (not all tracks!)
// This is called after initial render and after each lazy batch load
export async function lazyLoadAudioFeaturesForRenderedTracks(renderedTrackCount) {
  try {
    const allTracks = State.getCurrentTracks();
    
    // Only load audio features for rendered tracks (renderedTrackCount)
    const renderedTracks = allTracks.slice(0, renderedTrackCount);
    
    // Extract track IDs that don't have audio features yet
    const tracksNeedingFeatures = renderedTracks
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.track && item.track.id && !item.audioFeatures);
    
    if (tracksNeedingFeatures.length === 0) return;
    
    // Fetch audio features in batches of 100 (Spotify API limit)
    const batchSize = 100;
    const trackIds = tracksNeedingFeatures.map(({ item }) => item.track.id);
    
    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batchIds = trackIds.slice(i, i + batchSize);
      const batchIndices = tracksNeedingFeatures.slice(i, i + batchSize).map(({ index }) => index);
      
      try {
        const audioFeatures = await spotifyAPI.getAudioFeatures(batchIds);
        
        // Update tracks with audio features
        const currentTracks = State.getCurrentTracks();
        for (let j = 0; j < batchIds.length; j++) {
          const trackIndex = batchIndices[j];
          if (currentTracks[trackIndex]) {
            currentTracks[trackIndex].audioFeatures = audioFeatures[j] || {};
          }
        }
        
        // Update state
        State.setCurrentTracks(currentTracks);
        State.setFilteredTracks([...currentTracks]);
        
        // Update only the BPM cells for this batch (no full re-render)
        const startIdx = Math.min(...batchIndices);
        const endIdx = Math.max(...batchIndices) + 1;
        updateBPMCells(startIdx, endIdx);
        
      } catch (audioError) {
        console.warn('Failed to load audio features batch:', audioError);
        // Continue with next batch even if one fails
      }
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
  } catch (error) {
    console.warn('Error lazy loading audio features:', error);
  }
}

// Update BPM cells without re-rendering entire track list
function updateBPMCells(startIndex, endIndex) {
  const tracks = State.getFilteredTracks();
  const tbody = document.getElementById('tracks-list');
  const rows = tbody.querySelectorAll('tr[data-track-index]');
  
  for (let i = startIndex; i < endIndex && i < tracks.length; i++) {
    const trackItem = tracks[i];
    if (!trackItem || !trackItem.audioFeatures) continue;
    
    const row = rows[i];
    if (!row) continue;
    
    const bpmCell = row.querySelector('.col-bpm .bpm-badge');
    if (bpmCell) {
      const tempo = trackItem.audioFeatures.tempo;
      bpmCell.textContent = tempo ? spotifyAPI.formatBPM(tempo) : 'N/A';
      
      // Add subtle animation when BPM loads
      bpmCell.style.opacity = '0.5';
      setTimeout(() => {
        bpmCell.style.transition = 'opacity 0.3s';
        bpmCell.style.opacity = '1';
      }, 10);
    }
  }
}

// Expose to window for import compatibility
window.loadTracks = loadTracks;
window.lazyLoadAudioFeaturesForRenderedTracks = lazyLoadAudioFeaturesForRenderedTracks;
