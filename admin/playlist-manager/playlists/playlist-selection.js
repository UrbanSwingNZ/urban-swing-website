// Playlist Selection Module
// Handles playlist selection and view updates

import * as State from '../playlist-state.js';
import { updateSaveOrderButton, loadTracks } from '../track-operations.js';
import { updateSelectedPlaylist } from '../mobile-playlist-selector.js';

/**
 * Select a playlist and load its tracks
 */
export async function selectPlaylist(playlist) {
  await performPlaylistSelection(playlist);
}

/**
 * Perform playlist selection with UI updates
 */
export async function performPlaylistSelection(playlist) {
  // Get fresh playlist info from Spotify API to ensure we have latest data
  try {
    const freshPlaylist = await spotifyAPI.getPlaylist(playlist.id);
    State.setCurrentPlaylist(freshPlaylist);
  } catch (error) {
    State.setCurrentPlaylist(playlist);
  }
  
  State.setCurrentPlaylistId(playlist.id);
  State.setHasUnsavedChanges(false);
  updateSaveOrderButton();
  
  // Save the selected playlist ID for refresh persistence
  localStorage.setItem('last_viewed_playlist', playlist.id);
  
  // Update active state
  document.querySelectorAll('.playlists-list li').forEach(li => {
    li.classList.remove('active');
    if (li.dataset.playlistId === playlist.id) {
      li.classList.add('active');
    }
  });
  
  // Update mobile playlist selector button text
  updateSelectedPlaylist(playlist.name);
  
  // Show playlist view
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('playlist-view').style.display = 'flex';
  
  // Close sidebar on mobile after selection
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector('.pm-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  }
  
  // Update playlist header
  const imageUrl = playlist.images && playlist.images.length > 0 
    ? playlist.images[0].url 
    : '../../images/urban-swing-logo-glow-black-circle.png';
  
  document.getElementById('playlist-image').src = imageUrl;
  document.getElementById('playlist-name').textContent = playlist.name;
  document.getElementById('playlist-description').textContent = playlist.description || 'No description';
  document.getElementById('playlist-track-count').textContent = playlist.tracks.total;
  
  // Load tracks (will be imported from track-operations)
  await loadTracks(playlist.id);
}

// Expose to window for onclick handlers
window.selectPlaylist = selectPlaylist;
window.performPlaylistSelection = performPlaylistSelection;
