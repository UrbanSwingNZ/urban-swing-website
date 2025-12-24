// Playlist Display Module
// Handles playlist loading, displaying, and drag-drop reordering

import * as State from '../playlist-state.js';
import { showLoading, showError, showConnectPrompt } from '../playlist-ui.js';
import { updateSaveOrderButton, loadTracks } from '../track-operations.js';
import { populateMobilePlaylistList, updateSelectedPlaylist } from '../mobile-playlist-selector.js';
import { showPlaylistMenu } from './playlist-ui-handlers.js';
import { selectPlaylist } from './playlist-selection.js';

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
    State.setAllPlaylists(playlists);
    displayPlaylists(playlists);
    
    // After loading playlists, check if there's a saved playlist to restore
    // Only restore if coming from a page refresh (not navigation/disconnect)
    const savedPlaylistId = localStorage.getItem('last_viewed_playlist');
    if (savedPlaylistId && performance && performance.navigation && performance.navigation.type === 1) { // 1 = reload
      const savedPlaylist = playlists.find(p => p.id === savedPlaylistId);
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
    
    li.innerHTML = `
      <div class="playlist-item">
        <div class="playlist-drag-handle">
          <i class="fas fa-grip-vertical"></i>
        </div>
        <img src="${imageUrl}" alt="${playlist.name}">
        <div class="playlist-item-info">
          <div class="playlist-item-name">${playlist.name}</div>
          <div class="playlist-item-count">${playlist.tracks.total} tracks • <span class="playlist-item-duration">0 min</span></div>
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
    onEnd: function(evt) {
      // Re-enable text selection after drag
      document.body.style.userSelect = '';
      
      // Playlist reordering would require Spotify API support
      // For now, we'll just keep the visual order
      if (evt.oldIndex !== evt.newIndex) {
        console.log('Playlist moved from', evt.oldIndex, 'to', evt.newIndex);
      }
    }
  });
}

/**
 * Update the track count display for a specific playlist
 */
export async function updatePlaylistTrackCount(playlistId, delta) {
  // Update the track count in state
  const allPlaylists = State.getAllPlaylists();
  const playlist = allPlaylists.find(p => p.id === playlistId);
  
  if (playlist) {
    // Update the count
    playlist.tracks.total += delta;
    
    // Update the UI element in sidebar if it exists
    const playlistItem = document.querySelector(`[data-playlist-id="${playlistId}"]`);
    if (playlistItem) {
      const countEl = playlistItem.querySelector('.playlist-item-count');
      if (countEl) {
        countEl.textContent = `${playlist.tracks.total} tracks`;
      }
    }
  }
}

// Expose functions to window for onclick handlers
window.loadPlaylists = loadPlaylists;
