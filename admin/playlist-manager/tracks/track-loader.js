// Track Loader Module
// Handles track loading, audio features, and BPM data

import * as State from '../playlist-state.js';
import { showLoading, showError, showSnackbar } from '../playlist-ui.js';
import { displayTracks } from './track-renderer.js';
import { initializeDragDrop } from './track-drag-drop.js';
import { stopCurrentAudio } from './track-audio.js';
import { formatTotalDuration } from './track-utils.js';
import { loadAndMergeBPMData } from './bpm-service.js';
import { cachePlaylistTracks } from './track-duplicates.js';

// ========================================
// PERFORMANCE CONFIGURATION
// ========================================

// BPM data is now loaded from Firestore (via bpm-service.js)
// No longer using deprecated Spotify audio features API

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
    
    // Load BPM data from Firestore and merge with tracks
    const tracksWithBPM = await loadAndMergeBPMData(playlistId, trackItems);
    
    // Store tracks with BPM data for immediate display
    const currentTracks = tracksWithBPM.map(item => ({
      ...item,
      // audioFeatures already contains tempo/BPM from bpm-service if available
    }));
    
    State.setCurrentTracks(currentTracks);
    State.setFilteredTracks([...currentTracks]);
    
    // Cache track IDs for duplicate detection
    cachePlaylistTracks(playlistId, currentTracks);
    
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
    
    // Show notification about BPM data status
    const bpmCount = currentTracks.filter(item => 
      item.audioFeatures && item.audioFeatures.tempo
    ).length;
    
    if (bpmCount > 0) {
      showSnackbar(`Loaded BPM data for ${bpmCount}/${currentTracks.length} tracks`, 'success');
    } else if (currentTracks.length > 0) {
      showSnackbar('No BPM data found. Use the songdata.io scraper to add BPM data.', 'info');
    }
    
    // Note: Old lazy loading of audio features removed - we now use Firestore BPM data
    
  } catch (error) {
    console.error('Error loading tracks:', error);
    showError('Failed to load tracks. ' + error.message);
  } finally {
    showLoading(false);
  }
}



// Expose to window for import compatibility
window.loadTracks = loadTracks;
