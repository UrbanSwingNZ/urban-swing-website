// Track Actions Module
// Handles track menu, copy/move/delete operations, and destination modal

import * as State from '../playlist-state.js';
import { showLoading, showError, showSuccess } from '../playlist-ui.js';
import { updatePlaylistTrackCount } from '../playlist-operations.js';
import { loadTracks } from './track-loader.js';

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
  
  // Check if current playlist is owned by the user
  const currentPlaylist = State.getCurrentPlaylist();
  const isOwned = State.isPlaylistOwnedByCurrentUser(currentPlaylist);
  
  // Create menu
  const menu = document.createElement('div');
  menu.className = 'track-menu show';
  
  // Build menu HTML based on ownership
  let menuHTML = `
    <button data-action="copy">
      <i class="fas fa-copy"></i> Copy to Playlist
    </button>
  `;
  
  // Only show "Move to Playlist" if the current playlist is owned by the user
  if (isOwned) {
    menuHTML += `
      <button data-action="move">
        <i class="fas fa-arrow-right"></i> Move to Playlist
      </button>
    `;
  }
  
  menuHTML += `
    <button data-action="delete" class="menu-delete">
      <i class="fas fa-trash"></i> Delete
    </button>
  `;
  
  menu.innerHTML = menuHTML;
  
  // Position menu
  const actions = button.closest('.track-actions');
  actions.appendChild(menu);
  
  // Smart positioning: Open above if menu would go off-screen at bottom
  setTimeout(() => {
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // If menu extends beyond viewport, position it above instead
    if (menuRect.bottom > viewportHeight - 10) {
      menu.style.bottom = '100%';
      menu.style.top = 'auto';
      menu.style.marginBottom = '5px';
      menu.style.marginTop = '0';
    }
  }, 0);
  
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
      
      // Update destination playlist track count (+1)
      await updatePlaylistTrackCount(destinationId, 1);
      
      showSuccess(`Track copied successfully!`);
    } else if (action === 'move') {
      await spotifyAPI.moveTrackToPlaylist(track.uri, fromPlaylistId, destinationId);
      
      // Update destination playlist track count (+1)
      await updatePlaylistTrackCount(destinationId, 1);
      
      // Update source playlist track count (-1)
      await updatePlaylistTrackCount(fromPlaylistId, -1);
      
      showSuccess(`Track moved successfully!`);
      
      // Reload current playlist tracks to reflect the removal
      const currentPlaylist = State.getCurrentPlaylist();
      await loadTracks(currentPlaylist.id);
    }
    
  } catch (error) {
    console.error('Error performing action:', error);
    
    // Show user-friendly message for duplicates
    if (error.message && error.message.includes('already exists')) {
      showError('This track already exists in the destination playlist');
    } else {
      showError('Failed to ' + pendingAction.action + ' track. ' + error.message);
    }
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
    
    // Update playlist track count (-1)
    await updatePlaylistTrackCount(currentPlaylistId, -1);
    
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

// Expose to window for import compatibility
window.showTrackMenu = showTrackMenu;
window.handleConfirmAction = handleConfirmAction;
window.closeModal = closeModal;
window.handleDeleteTrack = handleDeleteTrack;
