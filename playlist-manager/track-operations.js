// Playlist Manager - Track Operations Module
// Handles track loading, display, drag-drop, search, and actions

import * as State from './playlist-state.js';
import { showLoading, showError, showSnackbar, showSuccess } from './playlist-ui.js';

// ========================================
// TRACKS - LOAD & DISPLAY
// ========================================

export async function loadTracks(playlistId) {
  showLoading(true);
  
  // Stop any currently playing audio
  stopCurrentAudio();
  
  try {
    // Get all tracks
    const trackItems = await spotifyAPI.getAllPlaylistTracks(playlistId);
    
    // Extract track IDs for audio features
    const trackIds = trackItems
      .filter(item => item.track && item.track.id)
      .map(item => item.track.id);
    
    // Get audio features (BPM, etc.) - this is optional
    let audioFeatures = [];
    if (trackIds.length > 0) {
      try {
        audioFeatures = await spotifyAPI.getAudioFeatures(trackIds);
      } catch (audioError) {
        // Create empty array with same length as tracks
        audioFeatures = new Array(trackIds.length).fill(null);
      }
    }
    
    // Combine tracks with audio features
    const currentTracks = trackItems.map((item, index) => {
      const features = audioFeatures[index] || {};
      return {
        ...item,
        audioFeatures: features
      };
    });
    
    State.setCurrentTracks(currentTracks);
    State.setFilteredTracks([...currentTracks]);
    
    // Calculate total duration
    const totalMs = currentTracks.reduce((sum, item) => {
      return sum + (item.track?.duration_ms || 0);
    }, 0);
    document.getElementById('playlist-duration').textContent = formatTotalDuration(totalMs);
    
    displayTracks(State.getFilteredTracks());
    initializeDragDrop();
    
  } catch (error) {
    console.error('Error loading tracks:', error);
    showError('Failed to load tracks. ' + error.message);
  } finally {
    showLoading(false);
  }
}

export function displayTracks(tracks) {
  const tbody = document.getElementById('tracks-list');
  tbody.innerHTML = '';
  
  if (tracks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #888;">
          No tracks found
        </td>
      </tr>
    `;
    return;
  }
  
  tracks.forEach((item, index) => {
    if (!item.track) return;
    
    const track = item.track;
    const features = item.audioFeatures || {};
    const tr = document.createElement('tr');
    tr.dataset.trackUri = track.uri;
    tr.dataset.trackId = track.id;
    tr.dataset.trackIndex = index;
    
    const albumArt = track.album.images && track.album.images.length > 0
      ? track.album.images[track.album.images.length - 1].url
      : '';
    
    const artistNames = track.artists.map(a => a.name).join(', ');
    const duration = spotifyAPI.formatDuration(track.duration_ms);
    const bpm = features.tempo ? spotifyAPI.formatBPM(features.tempo) : 'N/A';
    const explicit = track.explicit;
    
    tr.innerHTML = `
      <td class="col-drag">
        <i class="fas fa-grip-vertical drag-handle"></i>
      </td>
      <td class="col-number">
        <span class="track-number">${index + 1}</span>
      </td>
      <td class="col-title">
        <div class="track-info">
          ${albumArt ? `<img src="${albumArt}" alt="${track.name}" class="track-album-art">` : ''}
          <div class="track-details">
            <div class="track-name">${track.name}</div>
          </div>
        </div>
      </td>
      <td class="col-artist">
        <div class="track-artist">${artistNames}</div>
      </td>
      <td class="col-duration">${duration}</td>
      <td class="col-bpm">
        <span class="bpm-badge">${bpm}</span>
      </td>
      <td class="col-explicit">
        ${explicit ? '<span class="explicit-badge">E</span>' : ''}
      </td>
      <td class="col-actions">
        <div class="track-actions">
          <button class="track-play-btn" data-track-uri="${track.uri}" data-track-id="${track.id}" title="Play track">
            <i class="fas fa-play"></i>
          </button>
          <button class="track-menu-btn" data-track-uri="${track.uri}">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </td>
    `;
    
    // Add track menu click handler
    const menuBtn = tr.querySelector('.track-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTrackMenu(e.currentTarget, track);
    });
    
    // Add play button click handler
    const playBtn = tr.querySelector('.track-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTrackPlayPause(playBtn, track.uri, track.id);
      });
    }
    
    // Make entire row tappable on mobile (excluding drag handle)
    tr.addEventListener('click', (e) => {
      // Only trigger on mobile (screen width <= 768px)
      if (window.innerWidth <= 768) {
        // Don't trigger if clicking drag handle, menu button, or their children
        if (e.target.closest('.drag-handle') || 
            e.target.closest('.track-menu-btn') ||
            e.target.closest('.track-play-btn')) {
          return;
        }
        
        // Trigger play/pause
        handleTrackPlayPause(playBtn, track.uri, track.id);
      }
    });
    
    tbody.appendChild(tr);
  });
  
  // Restore playback state after tracks are displayed
  restorePlaybackState();
}

// ========================================
// TRACK SEARCH & FILTER
// ========================================

export function handleTrackSearch(e) {
  const query = e.target.value.toLowerCase();
  const currentTracks = State.getCurrentTracks();
  
  let filteredTracks;
  if (!query) {
    filteredTracks = [...currentTracks];
  } else {
    filteredTracks = currentTracks.filter(item => {
      if (!item.track) return false;
      const track = item.track;
      const trackName = track.name.toLowerCase();
      const artistNames = track.artists.map(a => a.name.toLowerCase()).join(' ');
      return trackName.includes(query) || artistNames.includes(query);
    });
  }
  
  State.setFilteredTracks(filteredTracks);
  displayTracks(filteredTracks);
  initializeDragDrop();
}

// ========================================
// DRAG AND DROP
// ========================================

export function initializeDragDrop() {
  const sortableInstance = State.getSortableInstance();
  if (sortableInstance) {
    sortableInstance.destroy();
  }
  
  const tbody = document.getElementById('tracks-list');
  
  const newInstance = new Sortable(tbody, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: handleDragEnd
  });
  
  State.setSortableInstance(newInstance);
}

function handleDragEnd(evt) {
  const oldIndex = evt.oldIndex;
  const newIndex = evt.newIndex;
  
  if (oldIndex === newIndex) return;
  
  // Update filtered tracks array
  const filteredTracks = State.getFilteredTracks();
  const [movedTrack] = filteredTracks.splice(oldIndex, 1);
  filteredTracks.splice(newIndex, 0, movedTrack);
  State.setFilteredTracks(filteredTracks);
  
  // Mark as having unsaved changes
  State.setHasUnsavedChanges(true);
  updateSaveOrderButton();
  
  // Update track numbers
  updateTrackNumbers();
}

function updateTrackNumbers() {
  const rows = document.querySelectorAll('#tracks-list tr');
  rows.forEach((row, index) => {
    const numberCell = row.querySelector('.track-number');
    if (numberCell) {
      numberCell.textContent = index + 1;
    }
    row.dataset.trackIndex = index;
  });
}

// ========================================
// SAVE ORDER
// ========================================

export function updateSaveOrderButton() {
  const btn = document.getElementById('save-order-btn');
  if (!btn) return;
  const shouldShow = State.getHasUnsavedChanges();
  if (shouldShow) {
    btn.classList.add('show');
  } else {
    btn.classList.remove('show');
  }
}

export async function handleSaveOrder() {
  const currentPlaylist = State.getCurrentPlaylist();
  if (!currentPlaylist) return;
  
  showLoading(true);
  
  try {
    console.log('Saving track order for playlist:', currentPlaylist.id);
    
    const filteredTracks = State.getFilteredTracks();
    // Get track URIs in the new order
    const newOrderUris = filteredTracks
      .filter(item => item.track && item.track.uri)
      .map(item => item.track.uri);
    
    console.log('New track order URIs:', newOrderUris);
    
    if (newOrderUris.length === 0) {
      showError('No tracks to reorder');
      return;
    }
    
    // Step 1: Remove all tracks from the playlist
    console.log('Removing all tracks from playlist...');
    await spotifyAPI.removeTracksFromPlaylist(currentPlaylist.id, newOrderUris);
    
    // Step 2: Add tracks back in the new order
    // Spotify has a limit of 100 tracks per request, so we need to chunk
    console.log('Adding tracks back in new order...');
    
    const chunkSize = 100;
    for (let i = 0; i < newOrderUris.length; i += chunkSize) {
      const chunk = newOrderUris.slice(i, i + chunkSize);
      await spotifyAPI.addTracksToPlaylist(currentPlaylist.id, chunk, i);
      console.log(`Added chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(newOrderUris.length/chunkSize)}`);
    }
    
    // Update the current tracks array to reflect the new order
    State.setCurrentTracks([...filteredTracks]);
    
    showSnackbar('Track order saved successfully!', 'success');
    
    // Clear unsaved changes flag
    State.setHasUnsavedChanges(false);
    updateSaveOrderButton();
    
  } catch (error) {
    console.error('Error saving order:', error);
    showError('Failed to save track order: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// ========================================
// TRACK ACTIONS MENU
// ========================================

export function showTrackMenu(button, track) {
  // Check if menu is already open for this button
  const existingMenu = button.closest('.track-actions').querySelector('.track-menu');
  if (existingMenu) {
    existingMenu.remove();
    return; // Toggle off - don't create new menu
  }
  
  // Close any other open menus
  document.querySelectorAll('.track-menu').forEach(menu => menu.remove());
  
  // Create menu
  const menu = document.createElement('div');
  menu.className = 'track-menu show';
  menu.innerHTML = `
    <button data-action="copy">
      <i class="fas fa-copy"></i> Copy to Playlist
    </button>
    <button data-action="move">
      <i class="fas fa-arrow-right"></i> Move to Playlist
    </button>
    <button data-action="delete" class="menu-delete">
      <i class="fas fa-trash"></i> Delete
    </button>
  `;
  
  // Position menu
  const actions = button.closest('.track-actions');
  actions.appendChild(menu);
  
  // Add click handlers
  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleTrackAction(action, track);
      menu.remove();
    });
  });
  
  // Close menu on outside click
  setTimeout(() => {
    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== button) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 0);
}

function handleTrackAction(action, track) {
  if (action === 'delete') {
    handleDeleteTrack(track.uri, track.name);
    return;
  }
  
  const currentPlaylist = State.getCurrentPlaylist();
  State.setPendingAction({ action, track, fromPlaylistId: currentPlaylist.id });
  
  // Update modal title
  const title = action === 'copy' ? 'Copy Track' : 'Move Track';
  document.getElementById('modal-title').textContent = title;
  
  // Update track info
  const artistNames = track.artists.map(a => a.name).join(', ');
  document.getElementById('modal-track-info').textContent = 
    `"${track.name}" by ${artistNames}`;
  
  // Populate destination playlists (exclude current playlist)
  const select = document.getElementById('destination-playlist');
  select.innerHTML = '<option value="">-- Select a playlist --</option>';
  
  const allPlaylists = State.getAllPlaylists();
  allPlaylists
    .filter(p => p.id !== currentPlaylist.id)
    .forEach(playlist => {
      const option = document.createElement('option');
      option.value = playlist.id;
      option.textContent = playlist.name;
      select.appendChild(option);
    });
  
  // Show modal
  document.getElementById('track-action-modal').style.display = 'flex';
}

export async function handleConfirmAction() {
  const pendingAction = State.getPendingAction();
  if (!pendingAction) return;
  
  const destinationId = document.getElementById('destination-playlist').value;
  if (!destinationId) {
    alert('Please select a destination playlist');
    return;
  }
  
  closeModal();
  showLoading(true);
  
  try {
    const { action, track, fromPlaylistId } = pendingAction;
    
    if (action === 'copy') {
      await spotifyAPI.copyTrackToPlaylist(track.uri, fromPlaylistId, destinationId);
      showSuccess(`Track copied successfully!`);
    } else if (action === 'move') {
      await spotifyAPI.moveTrackToPlaylist(track.uri, fromPlaylistId, destinationId);
      showSuccess(`Track moved successfully!`);
      // Reload current playlist
      const currentPlaylist = State.getCurrentPlaylist();
      await loadTracks(currentPlaylist.id);
    }
    
  } catch (error) {
    console.error('Error performing action:', error);
    showError('Failed to ' + pendingAction.action + ' track. ' + error.message);
  } finally {
    showLoading(false);
    State.setPendingAction(null);
  }
}

export function closeModal() {
  document.getElementById('track-action-modal').style.display = 'none';
  State.setPendingAction(null);
}

export function handleDeleteTrack(trackUri, trackName) {
  removeTrackFromPlaylist(trackUri, trackName);
}

async function removeTrackFromPlaylist(trackUri, trackName) {
  const currentPlaylistId = State.getCurrentPlaylistId();
  if (!currentPlaylistId) {
    showError('No playlist selected');
    return;
  }
  
  try {
    await spotifyAPI.removeTracksFromPlaylist(currentPlaylistId, [trackUri]);
    
    // Reload the playlist to show updated tracks
    const currentPlaylist = State.getCurrentPlaylist();
    if (currentPlaylist) {
      await loadTracks(currentPlaylistId);
    }
    
  } catch (error) {
    console.error('Error removing track:', error);
    showError('Failed to remove track: ' + error.message);
  }
}

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
          <img src="${track.album?.images?.[2]?.url || '../images/urban-swing-logo.png'}" 
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

// ========================================
// UNSAVED CHANGES HANDLING
// ========================================

export async function handleSaveAndContinue() {
  // Save current changes
  await handleSaveOrder();
  
  // Close modal
  document.getElementById('unsaved-changes-modal').style.display = 'none';
  
  // Continue to selected playlist
  const pendingPlaylistSelection = State.getPendingPlaylistSelection();
  if (pendingPlaylistSelection) {
    // Import performPlaylistSelection from playlist-operations
    const { performPlaylistSelection } = await import('./playlist-operations.js');
    await performPlaylistSelection(pendingPlaylistSelection);
    State.setPendingPlaylistSelection(null);
  }
}

export function handleDiscardChanges() {
  // Reset changes flag
  State.setHasUnsavedChanges(false);
  updateSaveOrderButton();
  
  // Close modal
  document.getElementById('unsaved-changes-modal').style.display = 'none';
  
  // Continue to selected playlist
  const pendingPlaylistSelection = State.getPendingPlaylistSelection();
  if (pendingPlaylistSelection) {
    // Import performPlaylistSelection from playlist-operations
    import('./playlist-operations.js').then(({ performPlaylistSelection }) => {
      performPlaylistSelection(pendingPlaylistSelection);
      State.setPendingPlaylistSelection(null);
    });
  }
}

// ========================================
// SPOTIFY WEB PLAYBACK
// ========================================

let currentPlayingButton = null;
let currentPlayingTrackUri = null;

// Save playback state to localStorage
function savePlaybackState(trackUri, isPlaying) {
  try {
    localStorage.setItem('currently_playing_track', trackUri);
    localStorage.setItem('currently_playing_state', isPlaying ? 'playing' : 'paused');
  } catch (error) {
    console.warn('Could not save playback state:', error);
  }
}

// Clear playback state from localStorage
function clearPlaybackState() {
  try {
    localStorage.removeItem('currently_playing_track');
    localStorage.removeItem('currently_playing_state');
  } catch (error) {
    console.warn('Could not clear playback state:', error);
  }
}

// Restore playback state UI after page load
export function restorePlaybackState() {
  try {
    const trackUri = localStorage.getItem('currently_playing_track');
    const state = localStorage.getItem('currently_playing_state');
    console.log('🔄 Restoring playback state:', { trackUri, state });
    
    if (trackUri && state === 'playing') {
      // Find the button for this track
      const trackRow = document.querySelector(`tr[data-track-uri="${trackUri}"]`);
      if (trackRow) {
        const playBtn = trackRow.querySelector('.track-play-btn');
        if (playBtn) {
          playBtn.innerHTML = '<i class="fas fa-pause"></i>';
          playBtn.classList.add('playing');
          currentPlayingButton = playBtn;
          currentPlayingTrackUri = trackUri;
        }
      }
    }
  } catch (error) {
    console.warn('Could not restore playback state:', error);
  }
}

export async function handleTrackPlayPause(button, trackUri, trackId) {
  try {
    // Import player module
    const { playTrack, togglePlayback, getCurrentState, isReady } = await import('./spotify-player.js');
    
    // Check if this is the currently playing track
    const state = await getCurrentState();
    const isCurrentTrack = state && state.track_window?.current_track?.uri === trackUri;
    
    if (isCurrentTrack) {
      // Toggle play/pause for current track
      await togglePlayback();
      
      // Update state in localStorage
      const isPaused = state.paused;
      savePlaybackState(trackUri, !isPaused);
      
      return;
    }
    
    // Check if player is ready
    if (!isReady()) {
      throw new Error('Player not ready. Please try again in a moment.');
    }
    
    // Play new track
    const accessToken = spotifyAPI.accessToken;
    await playTrack(trackUri, accessToken);
    
    // Update UI
    if (currentPlayingButton && currentPlayingButton !== button) {
      currentPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
      currentPlayingButton.classList.remove('playing');
    }
    
    button.innerHTML = '<i class="fas fa-pause"></i>';
    button.classList.add('playing');
    currentPlayingButton = button;
    currentPlayingTrackUri = trackUri;
    
    // Save state to localStorage
    savePlaybackState(trackUri, true);
    
  } catch (error) {
    console.error('Error playing track:', error);
    
    // Show error message to user
    if (error.message.includes('premium')) {
      showError('Spotify Premium is required for full playback. Using 30-second preview instead.');
      // Fall back to preview if available
      const previewUrl = button.dataset.previewUrl;
      if (previewUrl) {
        playPreviewFallback(button, previewUrl);
      }
    } else {
      showError('Error playing track: ' + error.message);
    }
    
    // Reset button
    button.innerHTML = '<i class="fas fa-play"></i>';
    button.classList.remove('playing');
  }
}

// Fallback to preview playback for non-Premium users
let previewAudio = null;

function playPreviewFallback(button, previewUrl) {
  // Stop any existing preview
  if (previewAudio) {
    previewAudio.pause();
  }
  
  // Play preview
  previewAudio = new Audio(previewUrl);
  button.innerHTML = '<i class="fas fa-pause"></i>';
  
  previewAudio.addEventListener('ended', () => {
    button.innerHTML = '<i class="fas fa-play"></i>';
    previewAudio = null;
  });
  
  previewAudio.play().catch(error => {
    console.error('Preview playback error:', error);
    button.innerHTML = '<i class="fas fa-play"></i>';
  });
}

// Stop any playing audio when loading new tracks
export function stopCurrentAudio() {
  if (currentPlayingButton) {
    currentPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
    currentPlayingButton.classList.remove('playing');
    currentPlayingButton = null;
    currentPlayingTrackUri = null;
  }
  
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  
  // Clear playback state from localStorage
  clearPlaybackState();
}

// ========================================
// UTILITIES
// ========================================

function formatTotalDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}
