// Track Add Modal Module
// Handles the Add Tracks modal with search and selection functionality

import * as State from '../playlist-state.js';
import { showError } from '../playlist-ui.js';
import { loadTracks } from './track-loader.js';
import { handleTrackPlayPause, stopCurrentAudio } from './track-audio.js';

// ========================================
// ADD TRACKS MODAL
// ========================================

export function openAddTracksModal() {
  const currentPlaylistId = State.getCurrentPlaylistId();
  if (!currentPlaylistId) {
    showError('Please select a playlist first');
    return;
  }

  const modal = document.getElementById('add-tracks-modal');
  const searchInput = document.getElementById('search-tracks-input');
  const resultsContainer = document.getElementById('search-results');
  
  // Reset state
  State.setSelectedTracks([]);
  searchInput.value = '';
  resultsContainer.innerHTML = '<p class="text-muted">Enter a search term to find tracks</p>';
  updateAddTracksButton();
  
  // Show modal
  modal.style.display = 'block';
  
  // Focus on search field
  setTimeout(() => {
    searchInput.focus();
  }, 100);
}

export function closeAddTracksModal() {
  const modal = document.getElementById('add-tracks-modal');
  modal.style.display = 'none';
  State.setSelectedTracks([]);
  
  // Stop any playing audio when modal closes
  stopCurrentAudio();
}

let searchTimeout;

export function handleTracksSearch(e) {
  const query = e.target.value.trim();
  
  // Clear previous timeout
  clearTimeout(searchTimeout);
  
  if (query.length === 0) {
    document.getElementById('search-results').innerHTML = '<p class="text-muted">Enter a search term to find tracks</p>';
    // Stop any playing audio when search is cleared
    stopCurrentAudio();
    return;
  }
  
  // Debounce search
  searchTimeout = setTimeout(async () => {
    await searchAndDisplayTracks(query);
  }, 300);
}

async function searchAndDisplayTracks(query) {
  const resultsContainer = document.getElementById('search-results');
  
  try {
    resultsContainer.innerHTML = '<div class="loading-pulse" style="padding: 20px; text-align: center;">Searching...</div>';
    
    const tracks = await spotifyAPI.searchTracks(query, 20);
    console.log('Search results:', tracks);
    console.log('🎵 Enhanced search rendering active - play buttons and selected tracks reordering');
    
    if (tracks.length === 0) {
      resultsContainer.innerHTML = '<p class="text-muted">No tracks found</p>';
      return;
    }
    
    const selectedTracks = State.getSelectedTracks();
    
    // Partition tracks: selected tracks first, then unselected
    const selectedTrackIds = new Set(selectedTracks.map(t => t.id));
    const selectedResults = tracks.filter(t => selectedTrackIds.has(t.id));
    const unselectedResults = tracks.filter(t => !selectedTrackIds.has(t.id));
    const orderedTracks = [...selectedResults, ...unselectedResults];
    
    resultsContainer.innerHTML = orderedTracks.map(track => {
      const isSelected = selectedTrackIds.has(track.id);
      return `
        <div class="search-result-item" data-track-id="${track.id}" data-track-uri="${track.uri}">
          <input type="checkbox" class="search-result-checkbox" ${isSelected ? 'checked' : ''}>
          <button class="track-play-btn search-play-btn" data-track-uri="${track.uri}" data-track-id="${track.id}" title="Play track">
            <i class="fas fa-play"></i>
          </button>
          <img src="${track.album?.images?.[2]?.url || '../../images/urban-swing-logo-glow-black-circle.png'}" 
               alt="${track.name}" class="search-result-image">
          <div class="search-result-info">
            <h4 class="search-result-title">${track.name}</h4>
            <p class="search-result-artist">${track.artists?.map(a => a.name).join(', ')}</p>
          </div>
          <span class="search-result-duration">${spotifyAPI.formatDuration(track.duration_ms)}</span>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking the checkbox, play button, or their children
        if (e.target.type === 'checkbox' || 
            e.target.classList.contains('track-play-btn') ||
            e.target.classList.contains('search-play-btn') ||
            e.target.closest('.track-play-btn')) {
          return;
        }
        
        const checkbox = item.querySelector('.search-result-checkbox');
        checkbox.checked = !checkbox.checked;
        handleTrackSelection(item.dataset.trackId, checkbox.checked, tracks);
      });
      
      const checkbox = item.querySelector('.search-result-checkbox');
      checkbox.addEventListener('change', (e) => {
        handleTrackSelection(item.dataset.trackId, e.target.checked, tracks);
      });
      
      // Add play button handler
      const playBtn = item.querySelector('.track-play-btn');
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTrackPlayPause(playBtn, playBtn.dataset.trackUri, playBtn.dataset.trackId);
      });
    });
    
  } catch (error) {
    console.error('Error searching tracks:', error);
    resultsContainer.innerHTML = '<p class="text-muted">Error searching tracks. Please try again.</p>';
  }
}

function handleTrackSelection(trackId, isSelected, allTracks) {
  console.log('Track selection:', trackId, isSelected);
  const track = allTracks.find(t => t.id === trackId);
  console.log('Found track:', track);
  
  let selectedTracks = State.getSelectedTracks();
  if (isSelected && track) {
    // Add to selected tracks if not already there
    if (!selectedTracks.some(t => t.id === trackId)) {
      selectedTracks.push(track);
      console.log('Added track to selection:', track);
    }
  } else {
    // Remove from selected tracks
    selectedTracks = selectedTracks.filter(t => t.id !== trackId);
    console.log('Removed track from selection');
  }
  
  State.setSelectedTracks(selectedTracks);
  console.log('Selected tracks count:', selectedTracks.length);
  updateAddTracksButton();
  
  // Re-render search results to move selected tracks to top
  const searchInput = document.getElementById('search-tracks-input');
  if (searchInput && searchInput.value.trim()) {
    searchAndDisplayTracks(searchInput.value.trim());
  }
}

function updateAddTracksButton() {
  const selectedTracks = State.getSelectedTracks();
  const button = document.getElementById('add-selected-tracks-btn');
  button.disabled = selectedTracks.length === 0;
  button.innerHTML = selectedTracks.length > 0 
    ? `<i class="fas fa-plus"></i> Add ${selectedTracks.length} Track${selectedTracks.length > 1 ? 's' : ''}`
    : '<i class="fas fa-plus"></i> Add Selected Tracks';
}

export async function handleAddSelectedTracks() {
  const selectedTracks = State.getSelectedTracks();
  if (selectedTracks.length === 0) return;
  
  console.log('Adding tracks:', selectedTracks);
  const currentPlaylistId = State.getCurrentPlaylistId();
  console.log('Current playlist ID:', currentPlaylistId);
  
  const button = document.getElementById('add-selected-tracks-btn');
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  button.disabled = true;
  
  try {
    const trackUris = selectedTracks.map(track => {
      console.log('Track URI:', track.uri);
      return track.uri;
    });
    
    console.log('Track URIs to add:', trackUris);
    
    const result = await spotifyAPI.addTracksToPlaylist(currentPlaylistId, trackUris);
    console.log('Add tracks result:', result);
    
    closeAddTracksModal();
    
    // Wait a moment for Spotify to sync, then reload the playlist
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reload the current playlist to show new tracks
    const currentPlaylist = State.getCurrentPlaylist();
    if (currentPlaylist) {
      await loadTracks(currentPlaylistId);
    }
    
  } catch (error) {
    console.error('Error adding tracks:', error);
    showError('Failed to add tracks: ' + error.message);
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// Expose to window for import compatibility
window.openAddTracksModal = openAddTracksModal;
window.closeAddTracksModal = closeAddTracksModal;
window.handleTracksSearch = handleTracksSearch;
window.handleAddSelectedTracks = handleAddSelectedTracks;
