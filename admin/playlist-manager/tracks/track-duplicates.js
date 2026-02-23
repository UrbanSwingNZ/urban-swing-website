// Track Duplicates Module
// Detects and highlights tracks that appear in multiple playlists

import * as State from '../playlist-state.js';

/**
 * Find which other playlists contain this track
 * @param {string} trackId - Spotify track ID
 * @param {string} currentPlaylistId - Current playlist ID to exclude
 * @param {string} currentUserId - Current user ID to filter owned playlists
 * @returns {Array<{id: string, name: string}>} Array of user-owned playlists containing this track
 */
export function findTrackInOtherPlaylists(trackId, currentPlaylistId, currentUserId) {
  const allPlaylists = State.getAllPlaylists();
  const matchingPlaylists = [];
  
  for (const playlist of allPlaylists) {
    // Skip the current playlist
    if (playlist.id === currentPlaylistId) continue;
    
    // Only check playlists owned by the current user
    if (playlist.owner?.id !== currentUserId) continue;
    
    // Check if track exists in this playlist's cached tracks
    const cachedTracks = window._playlistTracksCache?.[playlist.id];
    if (cachedTracks && cachedTracks.includes(trackId)) {
      matchingPlaylists.push({
        id: playlist.id,
        name: playlist.name
      });
    }
  }
  
  return matchingPlaylists;
}

/**
 * Build cache of track IDs for all loaded playlists
 * This should be called when a playlist is loaded
 */
export function cachePlaylistTracks(playlistId, tracks) {
  if (!window._playlistTracksCache) {
    window._playlistTracksCache = {};
  }
  
  window._playlistTracksCache[playlistId] = tracks
    .map(item => item.track?.id)
    .filter(Boolean);
}

/**
 * Check if a track exists in other playlists (using cache)
 * @param {string} trackId - Spotify track ID
 * @param {string} currentPlaylistId - Current playlist ID to exclude
 * @param {string} currentUserId - Current user ID to filter owned playlists
 * @returns {boolean} True if track exists in at least one user-owned playlist
 */
export function isTrackDuplicate(trackId, currentPlaylistId, currentUserId) {
  const playlists = findTrackInOtherPlaylists(trackId, currentPlaylistId, currentUserId);
  return playlists.length > 0;
}

/**
 * Get tooltip text for duplicate track
 * @param {string} trackId - Spotify track ID
 * @param {string} currentPlaylistId - Current playlist ID to exclude
 * @param {string} currentUserId - Current user ID to filter owned playlists
 * @returns {string} Tooltip text listing other user-owned playlists
 */
export function getDuplicateTooltip(trackId, currentPlaylistId, currentUserId) {
  const playlists = findTrackInOtherPlaylists(trackId, currentPlaylistId, currentUserId);
  
  if (playlists.length === 0) return '';
  
  const playlistNames = playlists.map(p => p.name).join(', ');
  return `Also in: ${playlistNames}`;
}

/**
 * Add track IDs to a playlist's cache
 * Called when tracks are added to a playlist to update highlighting immediately
 * @param {string} playlistId - Playlist ID
 * @param {Array<string>} trackIds - Array of Spotify track IDs to add
 */
export function addTracksToCache(playlistId, trackIds) {
  if (!window._playlistTracksCache) {
    window._playlistTracksCache = {};
  }
  
  if (!window._playlistTracksCache[playlistId]) {
    window._playlistTracksCache[playlistId] = [];
  }
  
  // Add new track IDs to cache, avoiding duplicates
  trackIds.forEach(trackId => {
    if (!window._playlistTracksCache[playlistId].includes(trackId)) {
      window._playlistTracksCache[playlistId].push(trackId);
    }
  });
}

/**
 * Remove track ID from a playlist's cache
 * Called when a track is removed/moved from a playlist
 * @param {string} playlistId - Playlist ID
 * @param {string} trackId - Spotify track ID to remove
 */
export function removeTrackFromCache(playlistId, trackId) {
  if (!window._playlistTracksCache?.[playlistId]) {
    return;
  }
  
  const index = window._playlistTracksCache[playlistId].indexOf(trackId);
  if (index > -1) {
    window._playlistTracksCache[playlistId].splice(index, 1);
  }
}

/**
 * Refresh highlighting for currently displayed tracks
 * Updates the visual highlighting without reloading the entire playlist
 */
export function refreshTrackHighlighting() {
  const currentPlaylist = State.getCurrentPlaylist();
  const currentUserId = State.getCurrentUserId();
  const currentPlaylistId = currentPlaylist?.id;
  const isOwnPlaylist = currentPlaylist?.owner?.id === currentUserId;
  
  // Only update highlighting for playlists not owned by the user
  if (isOwnPlaylist) {
    return;
  }
  
  // Get all track rows
  const trackRows = document.querySelectorAll('#tracks-list tr[data-track-id]');
  
  trackRows.forEach(row => {
    const trackId = row.dataset.trackId;
    const isDuplicate = isTrackDuplicate(trackId, currentPlaylistId, currentUserId);
    const tooltipText = isDuplicate ? getDuplicateTooltip(trackId, currentPlaylistId, currentUserId) : '';
    
    if (isDuplicate) {
      row.classList.add('track-duplicate');
      row.title = tooltipText;
    } else {
      row.classList.remove('track-duplicate');
      row.title = '';
    }
  });
}
