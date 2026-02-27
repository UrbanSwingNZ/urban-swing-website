// Playlist Display Module
// Handles playlist loading, displaying, and drag-drop reordering

import * as State from '../playlist-state.js';
import { showLoading, showError, showConnectPrompt } from '../playlist-ui.js';
import { updateSaveOrderButton, loadTracks } from '../track-operations.js';
import { populateMobilePlaylistList, updateSelectedPlaylist } from '../mobile-playlist-selector.js';
import { showPlaylistMenu } from './playlist-ui-handlers.js';
import { selectPlaylist } from './playlist-selection.js';
import { formatTotalDuration } from '../tracks/track-utils.js';
import { cachePlaylistTracks } from '../tracks/track-duplicates.js';
import { savePlaylistOrderToFirestore, loadPlaylistOrderFromFirestore } from '../firestore-utils.js';

/**
 * Calculate playlist duration by fetching first batch of tracks
 */
async function calculatePlaylistDuration(playlistId) {
  try {
    // Fetch first 100 tracks to calculate duration
    const response = await spotifyAPI.getPlaylistTracks(playlistId, 100, 0);
    const tracks = response.items;
    
    // Calculate total duration from these tracks
    const totalMs = tracks.reduce((sum, item) => {
      return sum + (item.track?.duration_ms || 0);
    }, 0);
    
    return totalMs;
  } catch (error) {
    console.error(`Error calculating duration for playlist ${playlistId}:`, error);
    return 0;
  }
}

/**
 * Pre-load track IDs from all playlists for duplicate detection
 * Runs in background without blocking the UI
 */
async function preloadAllPlaylistTracks(playlists) {
  console.log('Pre-loading track IDs for duplicate detection...');
  
  // Fetch track IDs for all playlists in parallel
  const promises = playlists.map(async (playlist) => {
    try {
      // Fetch all tracks from this playlist
      const tracks = await spotifyAPI.getAllPlaylistTracks(playlist.id);
      
      // Cache the track IDs
      cachePlaylistTracks(playlist.id, tracks);
      
    } catch (error) {
      console.warn(`Failed to preload tracks for playlist ${playlist.name}:`, error);
    }
  });
  
  await Promise.all(promises);
  console.log('Track IDs preloaded for all playlists');
}


/**
 * Load all playlists from Spotify and display them
 */
export async function loadPlaylists() {
  showLoading(true);
  
  try {
    // Get current user to determine playlist ownership
    const currentUser = await spotifyAPI.getCurrentUser();
    State.setCurrentUserId(currentUser.id);
    
    const playlists = await spotifyAPI.getAllUserPlaylists();
    
    // Pre-load track IDs from all playlists for duplicate detection
    // Do this in parallel but don't block the UI - it runs in background
    preloadAllPlaylistTracks(playlists);
    
    // Calculate durations for all playlists (in parallel for speed)
    const playlistsWithDurations = await Promise.all(
      playlists.map(async (playlist) => {
        const durationMs = await calculatePlaylistDuration(playlist.id);
        return {
          ...playlist,
          calculatedDuration: durationMs
        };
      })
    );
    
    State.setAllPlaylists(playlistsWithDurations);
    
    // Apply saved custom playlist order if it exists (before displaying)
    await restorePlaylistOrder(playlistsWithDurations);
    
    // Display playlists with restored order
    displayPlaylists(State.getAllPlaylists());
    
    // After loading playlists, check if there's a saved playlist to restore
    // Only restore if coming from a page refresh (not navigation/disconnect)
    const savedPlaylistId = localStorage.getItem('last_viewed_playlist');
    if (savedPlaylistId && performance && performance.navigation && performance.navigation.type === 1) { // 1 = reload
      const savedPlaylist = playlistsWithDurations.find(p => p.id === savedPlaylistId);
      if (savedPlaylist) {
        // Restore the last viewed playlist
        const { performPlaylistSelection } = await import('./playlist-selection.js');
        await performPlaylistSelection(savedPlaylist);
      }
    }
  } catch (error) {
    console.error('Error loading playlists:', error);
    if (error.message.includes('expired') || error.message.includes('401')) {
      // Token expired - show connect prompt
      showConnectPrompt();
      showError('Your Spotify session has expired. Please reconnect.');
    } else {
      showError('Failed to load playlists. ' + error.message);
    }
  } finally {
    showLoading(false);
  }
}

/**
 * Display playlists in the sidebar list
 */
export function displayPlaylists(playlists) {
  const listEl = document.getElementById('playlists-list');
  listEl.innerHTML = '';
  
  if (playlists.length === 0) {
    listEl.innerHTML = '<li style="padding: 20px; text-align: center; color: #888;">No playlists found</li>';
    return;
  }
  
  const currentPlaylist = State.getCurrentPlaylist();
  const currentPlaylistId = currentPlaylist?.id;
  
  // Also populate mobile playlist list
  populateMobilePlaylistList(playlists, currentPlaylistId);
  
  playlists.forEach(playlist => {
    const li = document.createElement('li');
    li.dataset.playlistId = playlist.id;
    
    if (currentPlaylist && currentPlaylist.id === playlist.id) {
      li.classList.add('active');
    }
    
    const imageUrl = playlist.images && playlist.images.length > 0 
      ? playlist.images[playlist.images.length - 1].url 
      : '../../images/urban-swing-logo-glow-black-circle.png';
    
    const formattedDuration = playlist.calculatedDuration 
      ? formatTotalDuration(playlist.calculatedDuration)
      : '0 min';
    
    li.innerHTML = `
      <div class="playlist-item">
        <div class="playlist-drag-handle">
          <i class="fas fa-grip-vertical"></i>
        </div>
        <img src="${imageUrl}" alt="${playlist.name}">
        <div class="playlist-item-info">
          <div class="playlist-item-name">${playlist.name}</div>
          <div class="playlist-item-count">${playlist.items.total} tracks • <span class="playlist-item-duration">${formattedDuration}</span></div>
        </div>
        <div class="playlist-item-actions">
          <button class="playlist-menu-btn" data-playlist-id="${playlist.id}">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
    `;
    
    // Add click handler for playlist selection (but not on menu button or drag handle)
    const handlePlaylistClick = (e) => {
      // Don't select if clicking on menu button or drag handle
      if (e.target.closest('.playlist-menu-btn') || e.target.closest('.playlist-drag-handle')) {
        return;
      }
      
      e.stopPropagation();
      selectPlaylist(playlist);
    };
    
    // Use click event for both desktop and mobile
    li.addEventListener('click', handlePlaylistClick, { passive: false });
    
    // Add menu button handler (desktop)
    const menuBtn = li.querySelector('.playlist-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPlaylistMenu(e.currentTarget, playlist);
    });
    
    // Add long-press handler for mobile (always add, check width when triggered)
    let pressTimer = null;
    let touchMoved = false;
    
    li.addEventListener('touchstart', (e) => {
      // Only handle on mobile
      if (window.innerWidth > 768) return;
      
      // Don't trigger long press on drag handle or menu button
      if (e.target.closest('.playlist-drag-handle') || e.target.closest('.playlist-menu-btn')) {
        return;
      }
      
      touchMoved = false;
      pressTimer = setTimeout(() => {
        if (!touchMoved) {
          e.preventDefault();
          // Show menu for mobile - pass the playlist item itself
          showPlaylistMenu(li, playlist, true);
        }
      }, 500);
    }, { passive: false });
    
    li.addEventListener('touchmove', () => {
      touchMoved = true;
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }, { passive: true });
    
    li.addEventListener('touchend', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }, { passive: true });
    
    li.addEventListener('touchcancel', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }, { passive: true });
    
    listEl.appendChild(li);
  });
  
  // Initialize drag and drop for playlists
  initializePlaylistDragDrop();
}

/**
 * Initialize Sortable.js for playlist drag and drop
 */
function initializePlaylistDragDrop() {
  const listEl = document.getElementById('playlists-list');
  if (!listEl) return;
  
  // Destroy existing instance if present
  if (window.playlistSortable) {
    window.playlistSortable.destroy();
  }
  
  window.playlistSortable = new Sortable(listEl, {
    handle: '.playlist-drag-handle',
    animation: 150,
    ghostClass: 'playlist-sortable-ghost',
    dragClass: 'playlist-sortable-drag',
    chosenClass: 'playlist-sortable-chosen',
    fallbackClass: 'playlist-sortable-fallback',
    forceFallback: false,
    fallbackTolerance: 3,
    touchStartThreshold: 5,
    delay: 0,
    delayOnTouchOnly: false,
    preventOnFilter: false,
    onStart: function(evt) {
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
    },
    onEnd: async function(evt) {
      // Re-enable text selection after drag
      document.body.style.userSelect = '';
      
      // Save custom playlist order to Firestore
      if (evt.oldIndex !== evt.newIndex) {
        console.log('Playlist moved from', evt.oldIndex, 'to', evt.newIndex);
        await savePlaylistOrder();
      }
    }
  });
}

/**
 * Save current playlist order to Firestore
 */
async function savePlaylistOrder() {
  const listEl = document.getElementById('playlists-list');
  const playlistIds = Array.from(listEl.querySelectorAll('[data-playlist-id]'))
    .map(el => el.dataset.playlistId);
  
  const spotifyUserId = State.getCurrentUserId();
  if (spotifyUserId) {
    await savePlaylistOrderToFirestore(spotifyUserId, playlistIds);
  } else {
    console.warn('No Spotify user ID available, saving to localStorage only');
    localStorage.setItem('playlist_order', JSON.stringify(playlistIds));
  }
  console.log('Playlist order saved:', playlistIds);
}

/**
 * Restore playlist order from Firestore
 */
async function restorePlaylistOrder(playlists) {
  const spotifyUserId = State.getCurrentUserId();
  if (!spotifyUserId) {
    console.warn('No Spotify user ID available, cannot restore playlist order');
    return;
  }
  
  try {
    const playlistIds = await loadPlaylistOrderFromFirestore(spotifyUserId);
    if (!playlistIds || playlistIds.length === 0) {
      console.log('No saved playlist order found');
      return;
    }
    
    const allPlaylists = playlists || State.getAllPlaylists();
    
    // Reorder playlists in state to match saved order
    const orderedPlaylists = [];
    const playlistMap = new Map(allPlaylists.map(p => [p.id, p]));
    
    // Add playlists in saved order
    playlistIds.forEach(id => {
      const playlist = playlistMap.get(id);
      if (playlist) {
        orderedPlaylists.push(playlist);
        playlistMap.delete(id);
      }
    });
    
    // Add any new playlists that weren't in saved order
    playlistMap.forEach(playlist => orderedPlaylists.push(playlist));
    
    // Update state only (caller will handle display)
    State.setAllPlaylists(orderedPlaylists);
    
    console.log('Playlist order restored from Firestore');
  } catch (error) {
    console.error('Failed to restore playlist order:', error);
  }
}

/**
 * Update the track count and duration display for a specific playlist
 */
export async function updatePlaylistTrackCount(playlistId, delta, trackDuration = 0) {
  // Update the track count in state
  const allPlaylists = State.getAllPlaylists();
  const playlist = allPlaylists.find(p => p.id === playlistId);
  
  if (playlist) {
    // Update the count
    playlist.items.total += delta;
    
    // Update the duration if provided
    if (trackDuration) {
      playlist.calculatedDuration = (playlist.calculatedDuration || 0) + (delta * trackDuration);
    }
    
    // Format duration
    const formattedDuration = playlist.calculatedDuration 
      ? formatTotalDuration(playlist.calculatedDuration)
      : '0 min';
    
    // Update the UI element in sidebar (desktop)
    const playlistItem = document.querySelector(`.playlists-list [data-playlist-id="${playlistId}"]`);
    if (playlistItem) {
      const countEl = playlistItem.querySelector('.playlist-item-count');
      if (countEl) {
        countEl.innerHTML = `${playlist.items.total} tracks • <span class="playlist-item-duration">${formattedDuration}</span>`;
      }
    }
    
    // Update mobile playlist list
    const mobilePlaylistItem = document.querySelector(`.mobile-playlists-list [data-playlist-id="${playlistId}"]`);
    if (mobilePlaylistItem) {
      const mobileCountEl = mobilePlaylistItem.querySelector('.playlist-tracks');
      if (mobileCountEl) {
        mobileCountEl.innerHTML = `${playlist.items.total} tracks • <span class="playlist-item-duration">${formattedDuration}</span>`;
      }
    }
  }
}

// Expose functions to window for onclick handlers
window.loadPlaylists = loadPlaylists;
